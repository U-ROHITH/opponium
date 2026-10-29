from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone

STAGES = [
    ("resume", "Resume screen"),
    ("profile", "Profile review"),
    ("hr", "HR interview"),
    ("manager", "Hiring manager interview"),
    ("decision", "Decision"),
]
STAGE_KEYS = [k for k, _ in STAGES]
STAGE_LABEL = dict(STAGES)


class Job(models.Model):
    DRAFT, OPEN, PAUSED, CLOSED = "draft", "open", "paused", "closed"
    TYPES = [("Full-time", "Full-time"), ("Internship", "Internship"), ("Contract", "Contract")]

    company = models.ForeignKey("accounts.Company", on_delete=models.CASCADE, related_name="jobs")
    title = models.CharField(max_length=140)
    team = models.CharField(max_length=120, blank=True)
    location = models.CharField(max_length=120, blank=True)
    type = models.CharField(max_length=20, choices=TYPES, default="Full-time")
    salary = models.CharField(max_length=80, blank=True)
    summary = models.TextField(blank=True)
    responsibilities = models.JSONField(default=list, blank=True)
    requirements = models.JSONField(default=list, blank=True)
    status = models.CharField(max_length=10, default=OPEN)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


def reply_due():
    return timezone.now() + timedelta(hours=settings.REPLY_HOURS)


class Application(models.Model):
    STATUSES = ["submitted", "in_review", "interviewing", "offer", "declined", "withdrawn"]

    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name="applications")
    candidate = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="applications")
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="owned_applications")
    stage = models.CharField(max_length=12, default="resume")
    status = models.CharField(max_length=14, default="submitted")
    decline_reason = models.CharField(max_length=40, blank=True)

    # Snapshot of what the candidate sent
    name = models.CharField(max_length=120)
    email = models.EmailField()
    phone = models.CharField(max_length=20)
    college = models.CharField(max_length=160)
    grad_year = models.PositiveIntegerField(null=True)
    city = models.CharField(max_length=80)
    linkedin = models.CharField(max_length=200, blank=True)
    note = models.CharField(max_length=300, blank=True)
    resume_path = models.CharField(max_length=300)
    resume_name = models.CharField(max_length=200)
    resume_size = models.PositiveIntegerField(default=0)

    applied_at = models.DateTimeField(default=timezone.now)
    reply_due_at = models.DateTimeField(default=reply_due)
    first_viewed_at = models.DateTimeField(null=True, blank=True)
    first_reply_at = models.DateTimeField(null=True, blank=True)
    nudged_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["reply_due_at"]
        constraints = [models.UniqueConstraint(fields=["job", "candidate"], name="one_application_per_job")]


class Event(models.Model):
    """Something that happened to an application. Candidate-visible unless noted."""

    KINDS = [
        "received",
        "viewed",
        "reviewing_resume",
        "reviewing_profile",
        "interview_scheduled",
        "step_completed",
        "decision",
        "withdrawn",
    ]
    # A first reply is anything the candidate sees beyond "received" and "viewed".
    NOT_A_REPLY = {"received", "viewed", "withdrawn"}

    application = models.ForeignKey(Application, on_delete=models.CASCADE, related_name="events")
    kind = models.CharField(max_length=24)
    text = models.CharField(max_length=200)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["at", "id"]


class Note(models.Model):
    """Internal to the hiring team. Never shown to the candidate."""

    application = models.ForeignKey(Application, on_delete=models.CASCADE, related_name="notes")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+")
    text = models.TextField()
    at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["at"]
