import logging
from datetime import timedelta

from django.db import IntegrityError, transaction
from django.db.models import Count
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response

from accounts.messaging import DeliveryError, send_email
from accounts.models import Invite, User
from django.conf import settings
from ops.audit import log
from ops.models import PlatformSettings

from .models import STAGE_KEYS, STAGE_LABEL, Application, Event, Job, Note
from .serial import application_payload, job_payload, sla_state, with_related
from .storage import StorageError, signed_url, upload_resume

logger = logging.getLogger(__name__)
MAX_RESUME = 5 * 1024 * 1024


def fail(message, code="invalid", http=status.HTTP_400_BAD_REQUEST):
    return Response({"error": message, "code": code}, status=http)


class IsCandidate(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.role == User.CANDIDATE and request.user.onboarded)


class IsTeam(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_team and request.user.company_id and request.user.onboarded)


def notify_candidate(app, text):
    """Best effort. A failed email never blocks the recruiter."""
    try:
        send_email(
            app.email,
            f"{app.job.company.name}: update on your application",
            f"{text}.\n\nThis is about your application for {app.job.title} at {app.job.company.name}.",
            ("See your application", f"{settings.WEB_URL}/applications/{app.id}"),
        )
    except DeliveryError:
        logger.warning("Could not email candidate %s", app.email)


# Candidate ------------------------------------------------------------------


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def jobs(request):
    applied = dict(Application.objects.filter(candidate=request.user).values_list("job_id", "id"))
    qs = Job.objects.filter(status=Job.OPEN, company__status="active").select_related("company").annotate(n=Count("applications"))
    return Response([job_payload(j, applied.get(j.id)) for j in qs])


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def job_detail(request, pk):
    job = get_object_or_404(Job.objects.select_related("company"), pk=pk)
    applied = Application.objects.filter(candidate=request.user, job=job).values_list("id", flat=True).first()
    return Response(job_payload(job, applied))


@api_view(["POST"])
@permission_classes([IsCandidate])
@parser_classes([MultiPartParser, FormParser])
def apply(request, pk):
    job = get_object_or_404(Job.objects.select_related("company"), pk=pk, status=Job.OPEN)
    u, d = request.user, request.data
    if Application.objects.filter(job=job, candidate=u).exists():
        return fail("You've already applied to this role.", "duplicate", status.HTTP_409_CONFLICT)

    file = request.FILES.get("resume")
    if file:
        if file.size > MAX_RESUME:
            return fail("Your resume is over 5 MB. Export a smaller PDF.", "resume_size")
        head = file.read(5)
        file.seek(0)
        if head != b"%PDF-":
            return fail("Upload your resume as a PDF.", "resume_type")
        try:
            path = upload_resume(u.id, file)
        except StorageError as e:
            return fail(str(e), "storage", status.HTTP_502_BAD_GATEWAY)
        resume = (path, file.name[:200], file.size)
    else:
        last = Application.objects.filter(candidate=u).order_by("-applied_at").first()
        if not last:
            return fail("Add your resume as a PDF.", "resume_missing")
        resume = (last.resume_path, last.resume_name, last.resume_size)

    name = (d.get("name") or u.name).strip()
    college = (d.get("college") or u.college).strip()
    city = (d.get("city") or u.city).strip()
    if not (name and college and city):
        return fail("Fill in your name, college and city.", "fields")
    try:
        grad_year = int(d.get("grad_year") or u.grad_year or 0) or None
    except ValueError:
        grad_year = None

    cfg = PlatformSettings.get()
    now = timezone.now()
    try:
        with transaction.atomic():
            app = Application.objects.create(
                job=job,
                candidate=u,
                owner=job.owner,
                name=name[:120],
                email=u.email,
                phone=u.phone,
                college=college[:160],
                grad_year=grad_year,
                city=city[:80],
                linkedin=(d.get("linkedin") or "").strip()[:200],
                note=(d.get("note") or "").strip()[:300],
                resume_path=resume[0],
                resume_name=resume[1],
                resume_size=resume[2],
                applied_at=now,
                reply_due_at=now + timedelta(hours=cfg.reply_hours),
            )
            Event.objects.create(application=app, kind="received", text="Application received", at=now)
    except IntegrityError:
        return fail("You've already applied to this role.", "duplicate", status.HTTP_409_CONFLICT)
    # Keep the profile current for next time
    changed = False
    for f, v in (("college", college), ("city", city), ("grad_year", grad_year)):
        if v and getattr(u, f) != v:
            setattr(u, f, v)
            changed = True
    if changed:
        u.save()
    log(u, "Applied", f"{job.title}, {job.company.name}", request=request)
    return Response(application_payload(with_related(Application.objects).get(pk=app.pk)), status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([IsCandidate])
def my_applications(request):
    qs = with_related(Application.objects.filter(candidate=request.user)).order_by("-applied_at")
    return Response([application_payload(a) for a in qs])


@api_view(["GET"])
@permission_classes([IsCandidate])
def my_application(request, pk):
    app = get_object_or_404(with_related(Application.objects), pk=pk, candidate=request.user)
    return Response(application_payload(app))


@api_view(["POST"])
@permission_classes([IsCandidate])
def withdraw(request, pk):
    app = get_object_or_404(with_related(Application.objects), pk=pk, candidate=request.user)
    if app.status in ("offer", "declined", "withdrawn"):
        return fail("This application is already closed.", "closed")
    app.status = "withdrawn"
    app.save(update_fields=["status"])
    Event.objects.create(application=app, kind="withdrawn", text="You withdrew your application", actor=request.user)
    log(request.user, "Withdrew application", f"{app.job.title}, {app.job.company.name}", request=request)
    return Response(application_payload(with_related(Application.objects).get(pk=app.pk)))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def resume(request, pk):
    app = get_object_or_404(Application.objects.select_related("job"), pk=pk)
    u = request.user
    allowed = app.candidate_id == u.id or (u.is_team and u.company_id == app.job.company_id) or u.role == User.ADMIN
    if not allowed:
        return fail("Not found.", "not_found", status.HTTP_404_NOT_FOUND)
    url = signed_url(app.resume_path)
    if not url:
        return fail("The resume file isn't available.", "storage", status.HTTP_404_NOT_FOUND)
    return Response({"url": url, "name": app.resume_name})


# Hiring team ----------------------------------------------------------------

SLA_ORDER = {"overdue": 0, "due_soon": 1, "on_track": 2, "replied": 3, "closed": 4}


def team_apps(user):
    return with_related(Application.objects.filter(job__company_id=user.company_id))


@api_view(["GET"])
@permission_classes([IsTeam])
def inbox(request):
    soon = PlatformSettings.get().due_soon_hours
    rows = [application_payload(a, team=True, due_soon_hours=soon) for a in team_apps(request.user).exclude(status="withdrawn")]
    rows.sort(key=lambda r: (SLA_ORDER[r["sla"]], r["reply_due_at"]))
    for r in rows:
        r.pop("notes", None)
    return Response(rows)


@api_view(["GET", "POST"])
@permission_classes([IsTeam])
def team_jobs(request):
    u = request.user
    if request.method == "POST":
        d = request.data
        title = (d.get("title") or "").strip()
        if not title:
            return fail("Add a job title. Candidates see it first.", "title")
        lines = lambda v: [x.strip() for x in (v if isinstance(v, list) else (v or "").splitlines()) if x.strip()]  # noqa: E731
        job = Job.objects.create(
            company_id=u.company_id,
            owner=u,
            title=title[:140],
            team=(d.get("team") or "")[:120],
            location=(d.get("location") or "")[:120],
            type=d.get("type") if d.get("type") in dict(Job.TYPES) else "Full-time",
            salary=(d.get("salary") or "")[:80],
            summary=d.get("summary") or "",
            responsibilities=lines(d.get("responsibilities")),
            requirements=lines(d.get("requirements")),
            status=Job.DRAFT if d.get("draft") else Job.OPEN,
        )
        log(u, "Created job", f"{job.title}, {u.company.name}", "Draft" if job.status == Job.DRAFT else "Published", request)
        return Response(job_payload(job), status=status.HTTP_201_CREATED)
    soon = PlatformSettings.get().due_soon_hours
    out = []
    for job in Job.objects.filter(company_id=u.company_id).select_related("company"):
        apps = list(job.applications.exclude(status="withdrawn"))
        p = job_payload(job)
        p["stage_counts"] = {k: sum(1 for a in apps if a.stage == k) for k in STAGE_KEYS}
        p["overdue"] = sum(1 for a in apps if sla_state(a, soon) == "overdue")
        out.append(p)
    return Response(out)


@api_view(["GET"])
@permission_classes([IsTeam])
def team_job(request, pk):
    job = get_object_or_404(Job.objects.select_related("company"), pk=pk, company_id=request.user.company_id)
    soon = PlatformSettings.get().due_soon_hours
    apps = [application_payload(a, team=True, due_soon_hours=soon) for a in team_apps(request.user).filter(job=job).exclude(status="withdrawn")]
    return Response({"job": job_payload(job), "applications": apps})


def _get_team_app(request, pk):
    return get_object_or_404(team_apps(request.user), pk=pk)


def _add_event(app, kind, text, actor, notify=True):
    now = timezone.now()
    Event.objects.create(application=app, kind=kind, text=text, actor=actor, at=now)
    if kind not in Event.NOT_A_REPLY and not app.first_reply_at:
        app.first_reply_at = now
        app.save(update_fields=["first_reply_at"])
    if notify and kind != "viewed":
        notify_candidate(app, text)


def _fresh(request, pk):
    return Response(application_payload(_get_team_app(request, pk), team=True))


@api_view(["GET"])
@permission_classes([IsTeam])
def team_application(request, pk):
    app = _get_team_app(request, pk)
    if not app.first_viewed_at:
        app.first_viewed_at = timezone.now()
        app.save(update_fields=["first_viewed_at"])
        _add_event(app, "viewed", "Your application was viewed", request.user, notify=False)
        app = _get_team_app(request, pk)
    return Response(application_payload(app, team=True))


SIGNALS = {
    "reviewing_resume": "Reviewing your resume",
    "reviewing_profile": "Reviewing your profile",
    "interview_scheduled": "Interview scheduled",
}


def _closed(app):
    return app.status in ("offer", "declined", "withdrawn")


@api_view(["POST"])
@permission_classes([IsTeam])
def signal(request, pk):
    app = _get_team_app(request, pk)
    kind = request.data.get("kind")
    if kind not in SIGNALS:
        return fail("Unknown update.", "kind")
    if _closed(app):
        return fail("This application is closed.", "closed")
    text = SIGNALS[kind]
    when = (request.data.get("when") or "").strip()
    if kind == "interview_scheduled" and when:
        text = f"Interview scheduled: {when[:60]}"
    _add_event(app, kind, text, request.user)
    log(request.user, "Set signal", f"{app.name}, {app.job.title}", text, request)
    return _fresh(request, pk)


@api_view(["POST"])
@permission_classes([IsTeam])
def advance(request, pk):
    app = _get_team_app(request, pk)
    if _closed(app):
        return fail("This application is closed.", "closed")
    i = STAGE_KEYS.index(app.stage)
    if i >= len(STAGE_KEYS) - 1:
        return fail("This is the last stage.", "last")
    done, nxt = app.stage, STAGE_KEYS[i + 1]
    app.stage = nxt
    app.status = "offer" if nxt == "decision" else ("interviewing" if nxt in ("hr", "manager") else "in_review")
    app.save(update_fields=["stage", "status"])
    _add_event(app, "step_completed", f"Step completed: {STAGE_LABEL[done]}", request.user)
    if nxt == "decision":
        _add_event(app, "decision", "Decision shared: you have an offer", request.user, notify=False)
    log(request.user, "Moved stage", f"{app.name}, {app.job.title}", f"{STAGE_LABEL[done]} to {STAGE_LABEL[nxt]}", request)
    return _fresh(request, pk)


DECLINE_REASONS = {
    "skills": "Skills don't match the role",
    "experience": "Not enough experience yet",
    "location": "Location or availability",
    "filled": "Role filled",
}


@api_view(["POST"])
@permission_classes([IsTeam])
def decline(request, pk):
    app = _get_team_app(request, pk)
    if _closed(app):
        return fail("This application is closed.", "closed")
    reason = request.data.get("reason")
    if reason not in DECLINE_REASONS:
        return fail("Pick a reason.", "reason")
    app.status, app.decline_reason = "declined", reason
    app.save(update_fields=["status", "decline_reason"])
    _add_event(app, "decision", "Decision shared", request.user, notify=False)
    notify_candidate(app, f"The team decided not to move forward with your application for {app.job.title}")
    log(request.user, "Shared decision", f"{app.name}, {app.job.title}", "Not moving forward", request)
    return _fresh(request, pk)


@api_view(["POST"])
@permission_classes([IsTeam])
def add_note(request, pk):
    app = _get_team_app(request, pk)
    text = (request.data.get("text") or "").strip()
    if not text:
        return fail("Write a note first.", "text")
    Note.objects.create(application=app, author=request.user, text=text[:2000])
    return _fresh(request, pk)


@api_view(["GET", "POST"])
@permission_classes([IsTeam])
def team_members(request):
    u = request.user
    if request.method == "POST":
        email = (request.data.get("email") or "").strip().lower()
        role = request.data.get("role") if request.data.get("role") in (User.RECRUITER, User.MANAGER) else User.RECRUITER
        if "@" not in email:
            return fail("Enter a full email address.", "email")
        if User.objects.filter(email__iexact=email, onboarded=True).exists():
            return fail("That person already has an Opponium account.", "exists")
        inv = Invite.objects.create(email=email, role=role, company_id=u.company_id, invited_by=u)
        from ops.views import send_invite_email

        send_invite_email(inv)
        log(u, "Sent invite", email, f"Role: {dict(User.ROLES)[role]}", request)
    members = [
        {"id": m.id, "name": m.name, "email": m.email, "role": m.role, "status": "active"}
        for m in User.objects.filter(company_id=u.company_id, onboarded=True).order_by("name")
    ]
    pending = [
        {"id": f"i{i.id}", "name": "", "email": i.email, "role": i.role, "status": "invited"}
        for i in Invite.objects.filter(company_id=u.company_id, state=Invite.PENDING, expires_at__gt=timezone.now())
    ]
    return Response(members + pending)
