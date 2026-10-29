from django.utils import timezone

from ops.models import PlatformSettings

from .models import STAGE_LABEL, Application, Event, Job


def sla_state(app, due_soon_hours=None):
    if app.first_reply_at:
        return "replied"
    if app.status in ("withdrawn",):
        return "closed"
    due_soon_hours = due_soon_hours or PlatformSettings.get().due_soon_hours
    left = (app.reply_due_at - timezone.now()).total_seconds() / 3600
    if left < 0:
        return "overdue"
    if left < due_soon_hours:
        return "due_soon"
    return "on_track"


def job_payload(job, applied_id=None):
    return {
        "id": job.id,
        "title": job.title,
        "company": job.company.name,
        "company_id": job.company_id,
        "team": job.team,
        "location": job.location,
        "type": job.type,
        "salary": job.salary,
        "summary": job.summary,
        "responsibilities": job.responsibilities,
        "requirements": job.requirements,
        "status": job.status,
        "posted_at": job.created_at,
        "applicants": job.applications.count(),
        "applied_application_id": applied_id,
    }


def event_payload(e):
    return {"id": e.id, "kind": e.kind, "text": e.text, "at": e.at}


def application_payload(app, *, team=False, due_soon_hours=None):
    data = {
        "id": app.id,
        "job": {"id": app.job_id, "title": app.job.title, "company": app.job.company.name, "location": app.job.location},
        "stage": app.stage,
        "stage_label": STAGE_LABEL[app.stage],
        "status": app.status,
        "applied_at": app.applied_at,
        "reply_due_at": app.reply_due_at,
        "first_reply_at": app.first_reply_at,
        "sla": sla_state(app, due_soon_hours),
        "events": [event_payload(e) for e in app.events.all()],
        "candidate": {
            "name": app.name,
            "email": app.email,
            "phone": app.phone,
            "college": app.college,
            "grad_year": app.grad_year,
            "city": app.city,
            "linkedin": app.linkedin,
            "note": app.note,
        },
        "resume": {"name": app.resume_name, "size": app.resume_size},
    }
    if team:
        data["owner"] = {"id": app.owner_id, "name": app.owner.name} if app.owner_id else None
        data["decline_reason"] = app.decline_reason
        data["notes"] = [
            {"id": n.id, "text": n.text, "at": n.at, "author": (n.author.name if n.author_id else "Removed user")} for n in app.notes.all()
        ]
    return data


def with_related(qs):
    return qs.select_related("job__company", "job__owner", "owner").prefetch_related("events", "notes__author")


__all__ = ["Application", "Event", "Job", "sla_state", "job_payload", "application_payload", "event_payload", "with_related"]
