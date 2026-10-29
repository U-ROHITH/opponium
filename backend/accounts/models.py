import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone


class Company(models.Model):
    STATUS = [("onboarding", "Onboarding"), ("active", "Active"), ("paused", "Paused")]

    name = models.CharField(max_length=120)
    domain = models.CharField(max_length=120, blank=True)
    status = models.CharField(max_length=20, choices=STATUS, default="active")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "companies"
        ordering = ["name"]

    def __str__(self):
        return self.name


class UserManager(BaseUserManager):
    def create_user(self, email, **extra):
        user = self.model(email=self.normalize_email(email).lower(), **extra)
        user.set_unusable_password()
        user.save()
        return user

    def create_superuser(self, email, **extra):
        return self.create_user(email, role=User.ADMIN, is_staff=True, is_superuser=True, **extra)


class User(AbstractBaseUser, PermissionsMixin):
    CANDIDATE, RECRUITER, MANAGER, ADMIN = "candidate", "recruiter", "hiring_manager", "admin"
    ROLES = [(CANDIDATE, "Candidate"), (RECRUITER, "Recruiter"), (MANAGER, "Hiring manager"), (ADMIN, "Admin")]

    email = models.EmailField(unique=True)
    name = models.CharField(max_length=120, blank=True)
    role = models.CharField(max_length=20, choices=ROLES, default=CANDIDATE)
    company = models.ForeignKey(Company, null=True, blank=True, on_delete=models.SET_NULL, related_name="members")
    phone = models.CharField(max_length=20, blank=True)
    email_verified = models.BooleanField(default=False)
    phone_verified = models.BooleanField(default=False)
    onboarded = models.BooleanField(default=False)
    suspended = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)

    # Candidate profile, reused on every application
    college = models.CharField(max_length=160, blank=True)
    grad_year = models.PositiveIntegerField(null=True, blank=True)
    city = models.CharField(max_length=80, blank=True)
    linkedin = models.CharField(max_length=200, blank=True)
    title = models.CharField(max_length=120, blank=True)

    last_active = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = UserManager()
    USERNAME_FIELD = "email"

    @property
    def is_active(self):
        return not self.suspended

    @property
    def is_team(self):
        return self.role in (self.RECRUITER, self.MANAGER)

    def __str__(self):
        return self.email


def invite_code():
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    raw = "".join(secrets.choice(alphabet) for _ in range(8))
    return f"{raw[:4]}-{raw[4:]}"


def invite_expiry():
    return timezone.now() + timedelta(days=settings.INVITE_DAYS)


class Invite(models.Model):
    PENDING, ACCEPTED, REVOKED = "pending", "accepted", "revoked"

    code = models.CharField(max_length=12, unique=True, default=invite_code)
    email = models.EmailField()
    role = models.CharField(max_length=20, choices=User.ROLES, default=User.CANDIDATE)
    company = models.ForeignKey(Company, null=True, blank=True, on_delete=models.CASCADE)
    invited_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    state = models.CharField(max_length=12, default=PENDING)
    sent_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField(default=invite_expiry)
    accepted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-sent_at"]

    @property
    def status(self):
        if self.state == self.PENDING and self.expires_at < timezone.now():
            return "expired"
        return self.state


class OTPChallenge(models.Model):
    EMAIL, PHONE = "email", "phone"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="otps")
    channel = models.CharField(max_length=8)
    target = models.CharField(max_length=160)
    purpose = models.CharField(max_length=12)  # signup | login
    code_hash = models.CharField(max_length=128)
    attempts = models.PositiveSmallIntegerField(default=0)
    sends = models.PositiveSmallIntegerField(default=1)
    last_sent_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class AccessRequest(models.Model):
    name = models.CharField(max_length=120)
    email = models.EmailField()
    joining_as = models.CharField(max_length=20, default="candidate")
    organisation = models.CharField(max_length=160)
    state = models.CharField(max_length=12, default="pending")  # pending | approved | declined
    created_at = models.DateTimeField(auto_now_add=True)
    decided_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")

    class Meta:
        ordering = ["-created_at"]
