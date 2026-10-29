"""Outbound email (Resend) and SMS (2Factor)."""

import html
import logging
import re

import requests
from django.conf import settings

log = logging.getLogger(__name__)


class DeliveryError(Exception):
    pass


def send_email(to, subject, text, cta=None):
    """cta is an optional (label, url) pair rendered as a button."""
    if not settings.RESEND_API_KEY:
        log.warning("RESEND_API_KEY missing; email to %s not sent: %s", to, text)
        return
    body = "".join(f"<p style=\"margin:0 0 16px\">{html.escape(p)}</p>" for p in text.split("\n\n"))
    if cta:
        body += (
            f'<p style="margin:24px 0"><a href="{html.escape(cta[1])}" '
            'style="background:#000;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:600">'
            f"{html.escape(cta[0])}</a></p>"
        )
    page = (
        '<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#000;max-width:480px">'
        '<p style="font-weight:700;letter-spacing:0.04em;margin:0 0 24px">OPPONIUM</p>'
        f"{body}</div>"
    )
    r = requests.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
        json={"from": settings.EMAIL_FROM, "to": [to], "subject": subject, "text": text, "html": page},
        timeout=15,
    )
    if r.status_code >= 300:
        log.error("Resend failed %s: %s", r.status_code, r.text)
        raise DeliveryError("We couldn't send the email. Try again in a minute.")


def normalise_phone(raw):
    digits = re.sub(r"\D", "", raw or "")
    if len(digits) == 10:
        digits = "91" + digits
    if not 11 <= len(digits) <= 15:
        raise ValueError("Enter a valid mobile number.")
    return "+" + digits


def send_sms_otp(phone, code):
    if not settings.TWOFACTOR_API_KEY:
        log.warning("TWOFACTOR_API_KEY missing; SMS code for %s not sent", phone)
        return
    number = phone.lstrip("+")
    r = requests.get(f"https://2factor.in/API/V1/{settings.TWOFACTOR_API_KEY}/SMS/{number}/{code}", timeout=15)
    ok = r.status_code == 200 and r.json().get("Status") == "Success"
    if not ok:
        log.error("2Factor failed %s: %s", r.status_code, r.text)
        raise DeliveryError("We couldn't send the text message. Check the number and try again.")
