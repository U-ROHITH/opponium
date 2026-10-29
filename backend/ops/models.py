from django.conf import settings
from django.db import models
from django.utils import timezone


class AuditLog(models.Model):
    """Append-only record of who did what."""

    at = models.DateTimeField(default=timezone.now, db_index=True)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    actor_label = models.CharField(max_length=160)
    action = models.CharField(max_length=60)
    target = models.CharField(max_length=200)
    detail = models.CharField(max_length=300, blank=True)
    ip = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        ordering = ["-at"]

    def save(self, *args, **kwargs):
        if self.pk:
            raise ValueError("Audit entries can't be changed")
        super().save(*args, **kwargs)


class PlatformSettings(models.Model):
    reply_hours = models.PositiveSmallIntegerField(default=48)
    due_soon_hours = models.PositiveSmallIntegerField(default=8)
    email_template = models.TextField(
        default="Your Opponium code is {code}. It expires in 10 minutes. If you didn't ask for it, ignore this email."
    )
    sms_template = models.TextField(default="{code} is your Opponium code. It expires in 10 minutes.")

    @classmethod
    def get(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj
