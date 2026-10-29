import statistics
from datetime import timedelta

from django.conf import settings
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import BasePermission
from rest_framework.response import Response

from accounts.messaging import DeliveryError, send_email
from accounts.models import AccessRequest, Company, Invite, User
from hiring.models import STAGE_LABEL, Application
from hiring.serial import application_payload, sla_state, with_related

from .audit import log
from .models import AuditLog, PlatformSettings


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.role == User.ADMIN)


def fail(message, code="invalid", http=status.HTTP_400_BAD_REQUEST):
    return Response({"error": message, "code": code}, status=http)


def send_invite_email(inv):
    who = (inv.invited_by.name or inv.invited_by.email) if inv.invited_by_id else "The Opponium team"
    where = f" to join {inv.company.name}" if inv.company_id else ""
    send_email(
        inv.email,
        f"{who} invited you to Opponium",
        f"{who} invited you{where} on Opponium, where every application gets a reply within 48 hours.\n\n"
        f"Your invite code is {inv.code}. It works once and expires in 7 days.",
        ("Accept invite", f"{settings.WEB_URL}/invite/{inv.code}"),
    )


def invite_row(i):
    return {
        "id": i.id,
        "code": i.code,
        "email": i.email,
        "role": i.role,
        "role_label": dict(User.ROLES)[i.role],
        "company": i.company.name if i.company_id else None,
        "invited_by": (i.invited_by.name or i.invited_by.email) if i.invited_by_id else "Opponium team",
        "sent_at": i.sent_at,
        "status": i.status,
        "link": f"{settings.WEB_URL}/invite/{i.code}",
    }


def create_invite(actor, email, role, company, request):
    email = (email or "").strip().lower()
    if "@" not in email or "." not in email.split("@")[-1]:
        raise ValueError("Enter a full email address, like name@college.edu.")
    if role not in dict(User.ROLES):
        raise ValueError("Pick a role.")
    if role in (User.RECRUITER, User.MANAGER) and not company:
        raise ValueError("Pick a company for recruiters and hiring managers.")
    if User.objects.filter(email__iexact=email, onboarded=True).exists():
        raise ValueError("That person already has an account.")
    Invite.objects.filter(email__iexact=email, state=Invite.PENDING).update(state=Invite.REVOKED)
    inv = Invite.objects.create(email=email, role=role, company=company if role != User.CANDIDATE else None, invited_by=actor)
    try:
        send_invite_email(inv)
    except DeliveryError:
        pass  # the link can still be copied from the admin panel
    log(actor, "Sent invite", email, f"Role: {dict(User.ROLES)[role]}", request)
    return inv


def _team_row(a, soon):
    p = application_payload(a, team=True, due_soon_hours=soon)
    p.pop("notes")
    owner = a.owner or a.job.owner
    p["owner"] = {"id": owner.id, "name": owner.name or owner.email} if owner else None
    p["nudged_at"] = a.nudged_at
    return p


@api_view(["GET"])
@permission_classes([IsAdmin])
def overview(request):
    now = timezone.now()
    cfg = PlatformSettings.get()
    open_apps = list(with_related(Application.objects.filter(status__in=["submitted", "in_review", "interviewing"])))
    states = [(a, sla_state(a, cfg.due_soon_hours)) for a in open_apps]
    attention = sorted([a for a, s in states if s in ("overdue", "due_soon")], key=lambda a: a.reply_due_at)
    trend, all_hours = [], []
    for d in range(13, -1, -1):
        day = (now - timedelta(days=d)).date()
        hours = [
            (a.first_reply_at - a.applied_at).total_seconds() / 3600
            for a in Application.objects.filter(first_reply_at__date=day).only("first_reply_at", "applied_at")
        ]
        all_hours += hours
        trend.append({"day": day, "median_hours": round(statistics.median(hours), 1) if hours else None})
    return Response(
        {
            "open_applications": len(open_apps),
            "companies": Company.objects.filter(status="active").count(),
            "due_soon": sum(1 for _, s in states if s == "due_soon"),
            "overdue": sum(1 for _, s in states if s == "overdue"),
            "median_first_reply_hours": round(statistics.median(all_hours), 1) if all_hours else None,
            "invites_pending": sum(1 for i in Invite.objects.filter(state=Invite.PENDING) if i.status == "pending"),
            "access_requests": AccessRequest.objects.filter(state="pending").count(),
            "attention": [_team_row(a, cfg.due_soon_hours) for a in attention[:8]],
            "trend": trend,
            "recent": [audit_row(l) for l in AuditLog.objects.all()[:6]],
        }
    )


@api_view(["GET", "POST"])
@permission_classes([IsAdmin])
def invites(request):
    if request.method == "POST":
        company = Company.objects.filter(pk=request.data.get("company_id")).first()
        try:
            inv = create_invite(request.user, request.data.get("email"), request.data.get("role", User.CANDIDATE), company, request)
        except ValueError as e:
            return fail(str(e), "invite")
        return Response(invite_row(inv), status=status.HTTP_201_CREATED)
    return Response([invite_row(i) for i in Invite.objects.select_related("company", "invited_by")[:500]])


@api_view(["POST"])
@permission_classes([IsAdmin])
def invites_bulk(request):
    """CSV text, one 'email,role' per line. Role defaults to candidate."""
    sent, errors = 0, []
    for n, line in enumerate((request.data.get("csv") or "").splitlines(), 1):
        parts = [p.strip() for p in line.split(",")]
        if not parts[0] or parts[0].lower() == "email":
            continue
        role = (parts[1] if len(parts) > 1 and parts[1] else User.CANDIDATE).lower().replace(" ", "_")
        company = Company.objects.filter(name__iexact=parts[2]).first() if len(parts) > 2 else None
        try:
            create_invite(request.user, parts[0], role, company, request)
            sent += 1
        except ValueError as e:
            errors.append(f"Line {n}: {e}")
    return Response({"sent": sent, "errors": errors})


@api_view(["POST"])
@permission_classes([IsAdmin])
def invite_action(request, pk, action):
    inv = get_object_or_404(Invite.objects.select_related("company", "invited_by"), pk=pk)
    if action == "revoke":
        if inv.status != "pending":
            return fail("Only pending invites can be revoked.", "state")
        inv.state = Invite.REVOKED
        inv.save(update_fields=["state"])
        log(request.user, "Revoked invite", inv.email, request=request)
    elif action == "resend":
        if inv.state != Invite.PENDING:
            return fail("Only pending or expired invites can be resent.", "state")
        inv.sent_at = timezone.now()
        inv.expires_at = timezone.now() + timedelta(days=settings.INVITE_DAYS)
        inv.save(update_fields=["sent_at", "expires_at"])
        try:
            send_invite_email(inv)
        except DeliveryError as e:
            return fail(str(e), "delivery", status.HTTP_502_BAD_GATEWAY)
        log(request.user, "Resent invite", inv.email, request=request)
    else:
        return fail("Unknown action.", "action", status.HTTP_404_NOT_FOUND)
    return Response(invite_row(inv))


def request_row(r):
    return {"id": r.id, "name": r.name, "email": r.email, "joining_as": r.joining_as, "organisation": r.organisation, "state": r.state, "created_at": r.created_at}


@api_view(["GET"])
@permission_classes([IsAdmin])
def access_requests(request):
    return Response([request_row(r) for r in AccessRequest.objects.all()[:500]])


@api_view(["POST"])
@permission_classes([IsAdmin])
def access_request_action(request, pk, action):
    r = get_object_or_404(AccessRequest, pk=pk, state="pending")
    if action == "approve":
        company = None
        if r.joining_as == "recruiter":
            company, _ = Company.objects.get_or_create(name=r.organisation, defaults={"status": "onboarding"})
        try:
            create_invite(request.user, r.email, User.RECRUITER if company else User.CANDIDATE, company, request)
        except ValueError as e:
            return fail(str(e), "invite")
        r.state = "approved"
    elif action == "decline":
        r.state = "declined"
        log(request.user, "Declined access request", r.email, request=request)
    else:
        return fail("Unknown action.", "action", status.HTTP_404_NOT_FOUND)
    r.decided_by = request.user
    r.save(update_fields=["state", "decided_by"])
    return Response(request_row(r))


def user_row(u):
    return {
        "id": u.id,
        "name": u.name,
        "email": u.email,
        "role": u.role,
        "organisation": u.company.name if u.company_id else (u.college or ""),
        "email_verified": u.email_verified,
        "phone_verified": u.phone_verified,
        "onboarded": u.onboarded,
        "suspended": u.suspended,
        "last_active": u.last_active,
    }


@api_view(["GET"])
@permission_classes([IsAdmin])
def users(request):
    qs = User.objects.select_related("company").order_by("-last_active")
    if q := request.query_params.get("q"):
        qs = qs.filter(Q(name__icontains=q) | Q(email__icontains=q))
    if role := request.query_params.get("role"):
        qs = qs.filter(role=role)
    return Response([user_row(u) for u in qs[:500]])


@api_view(["POST"])
@permission_classes([IsAdmin])
def user_action(request, pk, action):
    u = get_object_or_404(User, pk=pk)
    if u.role == User.ADMIN:
        return fail("Admins can't be suspended here.", "admin")
    if action not in ("suspend", "restore"):
        return fail("Unknown action.", "action", status.HTTP_404_NOT_FOUND)
    u.suspended = action == "suspend"
    u.save(update_fields=["suspended"])
    log(request.user, "Suspended user" if u.suspended else "Restored user", u.name or u.email, request=request)
    return Response(user_row(u))


def company_row(c, cutoff):
    answered = Application.objects.filter(job__company=c, applied_at__gte=cutoff)
    total = answered.exclude(status="withdrawn").count()
    on_time = sum(1 for a in answered.exclude(status="withdrawn") if a.first_reply_at and a.first_reply_at <= a.reply_due_at)
    return {
        "id": c.id,
        "name": c.name,
        "domain": c.domain,
        "status": c.status,
        "recruiters": c.members.filter(onboarded=True).count(),
        "open_jobs": c.jobs.filter(status="open").count(),
        "open_applications": Application.objects.filter(job__company=c, status__in=["submitted", "in_review", "interviewing"]).count(),
        "reply_rate": round(100 * on_time / total) if total else None,
    }


@api_view(["GET", "POST"])
@permission_classes([IsAdmin])
def companies(request):
    if request.method == "POST":
        name = (request.data.get("name") or "").strip()
        if not name:
            return fail("Add the company name.", "name")
        c = Company.objects.create(name=name[:120], domain=(request.data.get("domain") or "").strip()[:120])
        log(request.user, "Added company", c.name, request=request)
        return Response(company_row(c, timezone.now() - timedelta(days=30)), status=status.HTTP_201_CREATED)
    cutoff = timezone.now() - timedelta(days=30)
    return Response([company_row(c, cutoff) for c in Company.objects.all()])


@api_view(["GET"])
@permission_classes([IsAdmin])
def sla(request):
    soon = PlatformSettings.get().due_soon_hours
    qs = with_related(Application.objects.filter(status__in=["submitted", "in_review", "interviewing"], first_reply_at__isnull=True))
    rows = []
    for a in qs:
        s = sla_state(a, soon)
        if s in ("overdue", "due_soon"):
            rows.append(_team_row(a, soon))
    return Response(rows)


@api_view(["POST"])
@permission_classes([IsAdmin])
def nudge(request, pk):
    a = get_object_or_404(with_related(Application.objects), pk=pk)
    target = a.owner or a.job.owner
    if not target:
        return fail("This job has no owner to nudge.", "owner")
    try:
        send_email(
            target.email,
            f"Reply due: {a.name} for {a.job.title}",
            f"{a.name} applied for {a.job.title} and is waiting on a reply. It was due {timezone.localtime(a.reply_due_at):%d %b, %H:%M} UTC.\n\nA quick status update counts as a reply.",
            ("Open the application", f"{settings.WEB_URL}/r/applications/{a.id}"),
        )
    except DeliveryError as e:
        return fail(str(e), "delivery", status.HTTP_502_BAD_GATEWAY)
    a.nudged_at = timezone.now()
    a.save(update_fields=["nudged_at"])
    log(request.user, "Nudged recruiter", f"{target.name or target.email} about {a.name}", request=request)
    return Response({"ok": True, "nudged_at": a.nudged_at})


@api_view(["GET"])
@permission_classes([IsAdmin])
def application_lookup(request):
    q = (request.query_params.get("q") or "").strip()
    if not q:
        return Response([])
    qs = with_related(Application.objects.filter(Q(email__iexact=q) | Q(pk=int(q) if q.isdigit() else -1))).order_by("-applied_at")
    return Response([application_payload(a) for a in qs[:50]])


def audit_row(l):
    return {"id": l.id, "at": l.at, "actor": l.actor_label, "action": l.action, "target": l.target, "detail": l.detail}


@api_view(["GET"])
@permission_classes([IsAdmin])
def audit(request):
    qs = AuditLog.objects.all()
    if q := request.query_params.get("q"):
        qs = qs.filter(Q(actor_label__icontains=q) | Q(action__icontains=q) | Q(target__icontains=q))
    return Response([audit_row(l) for l in qs[:300]])


@api_view(["GET", "PUT"])
@permission_classes([IsAdmin])
def platform_settings(request):
    cfg = PlatformSettings.get()
    if request.method == "PUT":
        d = request.data
        try:
            reply, soon = int(d.get("reply_hours", cfg.reply_hours)), int(d.get("due_soon_hours", cfg.due_soon_hours))
        except (TypeError, ValueError):
            return fail("Hours must be whole numbers.", "hours")
        if not (1 <= soon < reply <= 240):
            return fail("The warning must be shorter than the reply window.", "hours")
        changes = []
        for field, val in (("reply_hours", reply), ("due_soon_hours", soon), ("email_template", d.get("email_template")), ("sms_template", d.get("sms_template"))):
            if val is not None and getattr(cfg, field) != val:
                if field.endswith("template") and "{code}" not in val:
                    return fail("Templates must include {code}.", "template")
                changes.append(field.replace("_", " "))
                setattr(cfg, field, val)
        cfg.save()
        if changes:
            log(request.user, "Changed setting", ", ".join(changes), request=request)
    return Response(
        {
            "reply_hours": cfg.reply_hours,
            "due_soon_hours": cfg.due_soon_hours,
            "email_template": cfg.email_template,
            "sms_template": cfg.sms_template,
            "stages": [{"key": k, "label": v} for k, v in STAGE_LABEL.items()],
        }
    )
