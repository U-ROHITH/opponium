import hashlib
import hmac
import secrets
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from ops.models import PlatformSettings

from .messaging import send_email, send_sms_otp
from .models import OTPChallenge


class OTPError(Exception):
    def __init__(self, message, code="invalid"):
        super().__init__(message)
        self.code = code


def _hash(challenge_id, code):
    return hmac.new(settings.SECRET_KEY.encode(), f"{challenge_id}:{code}".encode(), hashlib.sha256).hexdigest()


def mask_email(email):
    name, _, domain = email.partition("@")
    return f"{name[:2]}***@{domain}"


def mask_phone(phone):
    return f"{phone[:3]} {phone[3:5]}*** ***{phone[-2:]}"


def _deliver(ch, code):
    tpl = PlatformSettings.get()
    if ch.channel == OTPChallenge.EMAIL:
        send_email(ch.target, f"{code} is your Opponium code", tpl.email_template.replace("{code}", code))
    else:
        send_sms_otp(ch.target, code)


def start(user, channel, target, purpose):
    now = timezone.now()
    recent = OTPChallenge.objects.filter(target=target, created_at__gte=now - timedelta(hours=1))
    if sum(c.sends for c in recent) >= settings.OTP_MAX_SENDS_PER_HOUR:
        raise OTPError("Too many codes requested. Try again in an hour.", "rate_limited")
    OTPChallenge.objects.filter(user=user, channel=channel, used_at__isnull=True).update(expires_at=now)
    code = f"{secrets.randbelow(1_000_000):06d}"
    ch = OTPChallenge.objects.create(
        user=user, channel=channel, target=target, purpose=purpose, code_hash="-", expires_at=now + timedelta(minutes=settings.OTP_TTL_MINUTES)
    )
    ch.code_hash = _hash(ch.id, code)
    ch.save(update_fields=["code_hash"])
    _deliver(ch, code)
    return ch


def resend(ch):
    now = timezone.now()
    if ch.used_at or ch.expires_at < now:
        raise OTPError("This code has expired. Start again.", "expired")
    if (now - ch.last_sent_at).total_seconds() < settings.OTP_RESEND_SECONDS:
        raise OTPError("Wait a few seconds before asking for another code.", "too_soon")
    if ch.sends >= 3:
        raise OTPError("Resend limit reached. Try again in 15 minutes.", "rate_limited")
    code = f"{secrets.randbelow(1_000_000):06d}"
    ch.code_hash = _hash(ch.id, code)
    ch.sends += 1
    ch.attempts = 0
    ch.last_sent_at = now
    ch.expires_at = now + timedelta(minutes=settings.OTP_TTL_MINUTES)
    ch.save()
    _deliver(ch, code)
    return ch


def verify(ch, code):
    now = timezone.now()
    if ch.used_at:
        raise OTPError("This code was already used. Ask for a new one.", "used")
    if ch.expires_at < now:
        raise OTPError("This code has expired. Ask for a new one.", "expired")
    if ch.attempts >= settings.OTP_MAX_ATTEMPTS:
        raise OTPError("Too many attempts. Ask for a new code.", "locked")
    if not hmac.compare_digest(ch.code_hash, _hash(ch.id, (code or "").strip())):
        ch.attempts += 1
        ch.save(update_fields=["attempts"])
        left = settings.OTP_MAX_ATTEMPTS - ch.attempts
        if left <= 0:
            raise OTPError("Too many attempts. Ask for a new code.", "locked")
        raise OTPError(f"That code isn't right. {left} {'attempt' if left == 1 else 'attempts'} left.", "wrong")
    ch.used_at = now
    ch.save(update_fields=["used_at"])
    return ch
