from django.core import signing
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken

from ops.audit import log

from . import otp
from .messaging import DeliveryError, normalise_phone
from .models import AccessRequest, Invite, OTPChallenge, User

ONBOARDING_SALT = "opponium.onboarding"
CHALLENGE_SALT = "opponium.otp"


class OTPThrottle(AnonRateThrottle):
    scope = "otp"


def fail(message, code="invalid", http=status.HTTP_400_BAD_REQUEST):
    return Response({"error": message, "code": code}, status=http)


def user_payload(u):
    return {
        "id": u.id,
        "email": u.email,
        "name": u.name,
        "role": u.role,
        "company": {"id": u.company_id, "name": u.company.name} if u.company_id else None,
        "phone": u.phone,
        "email_verified": u.email_verified,
        "phone_verified": u.phone_verified,
        "onboarded": u.onboarded,
        "college": u.college,
        "grad_year": u.grad_year,
        "city": u.city,
        "linkedin": u.linkedin,
        "title": u.title,
    }


def tokens_for(user):
    refresh = RefreshToken.for_user(user)
    return {"access": str(refresh.access_token), "refresh": str(refresh), "user": user_payload(user)}


def challenge_payload(ch, onboarding=None):
    data = {
        "challenge": signing.dumps(ch.id, salt=CHALLENGE_SALT),
        "channel": ch.channel,
        "sent_to": otp.mask_email(ch.target) if ch.channel == OTPChallenge.EMAIL else otp.mask_phone(ch.target),
        "resend_in": 30,
        "resends_left": max(0, 3 - ch.sends),
    }
    if onboarding:
        data["onboarding_token"] = onboarding
    return data


def load_challenge(token):
    try:
        return OTPChallenge.objects.select_related("user").get(pk=signing.loads(token, salt=CHALLENGE_SALT, max_age=3600))
    except (signing.BadSignature, OTPChallenge.DoesNotExist, TypeError):
        return None


def onboarding_user(token):
    try:
        uid = signing.loads(token or "", salt=ONBOARDING_SALT, max_age=3 * 3600)
        return User.objects.get(pk=uid)
    except (signing.BadSignature, User.DoesNotExist):
        return None


def invite_payload(inv):
    return {
        "code": inv.code,
        "email": inv.email,
        "role": inv.role,
        "role_label": dict(User.ROLES)[inv.role],
        "company": inv.company.name if inv.company_id else None,
        "invited_by": (inv.invited_by.name or inv.invited_by.email) if inv.invited_by_id else "The Opponium team",
        "expires_at": inv.expires_at,
        "status": inv.status,
    }


@api_view(["GET"])
@permission_classes([AllowAny])
def invite_detail(request, code):
    inv = Invite.objects.select_related("company", "invited_by").filter(code__iexact=code.strip()).first()
    if not inv:
        return fail("We couldn't find that invite. Check the code and try again.", "not_found", status.HTTP_404_NOT_FOUND)
    return Response(invite_payload(inv))


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([OTPThrottle])
def invite_accept(request, code):
    inv = Invite.objects.select_related("company").filter(code__iexact=code.strip()).first()
    if not inv:
        return fail("We couldn't find that invite.", "not_found", status.HTTP_404_NOT_FOUND)
    if inv.status == "expired":
        return fail("This invite has expired. Ask for a new one.", "expired")
    if inv.status == "revoked":
        return fail("This invite was cancelled.", "revoked")
    existing = User.objects.filter(email__iexact=inv.email).first()
    if existing and existing.onboarded:
        return fail("You already have an account. Sign in instead.", "exists")
    with transaction.atomic():
        user = existing or User.objects.create_user(inv.email, role=inv.role, company=inv.company)
        user.role, user.company = inv.role, inv.company
        user.save()
    try:
        ch = otp.start(user, OTPChallenge.EMAIL, user.email, "signup")
    except otp.OTPError as e:
        return fail(str(e), e.code, status.HTTP_429_TOO_MANY_REQUESTS)
    except DeliveryError as e:
        return fail(str(e), "delivery", status.HTTP_502_BAD_GATEWAY)
    return Response(challenge_payload(ch, signing.dumps(user.id, salt=ONBOARDING_SALT)))


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([OTPThrottle])
def otp_resend(request):
    ch = load_challenge(request.data.get("challenge"))
    if not ch:
        return fail("This code has expired. Start again.", "expired")
    try:
        otp.resend(ch)
    except otp.OTPError as e:
        return fail(str(e), e.code, status.HTTP_429_TOO_MANY_REQUESTS)
    except DeliveryError as e:
        return fail(str(e), "delivery", status.HTTP_502_BAD_GATEWAY)
    return Response(challenge_payload(ch))


@api_view(["POST"])
@permission_classes([AllowAny])
def otp_verify(request):
    ch = load_challenge(request.data.get("challenge"))
    if not ch:
        return fail("This code has expired. Ask for a new one.", "expired")
    try:
        otp.verify(ch, request.data.get("code"))
    except otp.OTPError as e:
        return fail(str(e), e.code)
    user = ch.user
    if ch.purpose == "login":
        if user.suspended:
            return fail("This account is suspended. Contact support.", "suspended", status.HTTP_403_FORBIDDEN)
        user.last_active = timezone.now()
        user.save(update_fields=["last_active"])
        log(user, "Signed in", user.email, request=request)
        return Response({"next": "done", **tokens_for(user)})
    token = signing.dumps(user.id, salt=ONBOARDING_SALT)
    if ch.channel == OTPChallenge.EMAIL:
        user.email_verified = True
        user.save(update_fields=["email_verified"])
        return Response({"next": "phone", "onboarding_token": token})
    user.phone, user.phone_verified = ch.target, True
    user.save(update_fields=["phone", "phone_verified"])
    return Response({"next": "profile", "onboarding_token": token, "user": user_payload(user)})


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([OTPThrottle])
def phone_start(request):
    user = onboarding_user(request.data.get("onboarding_token"))
    if not user or not user.email_verified:
        return fail("Your session ended. Open your invite link again.", "session")
    try:
        phone = normalise_phone(request.data.get("phone"))
    except ValueError as e:
        return fail(str(e), "phone")
    if User.objects.filter(phone=phone, phone_verified=True).exclude(pk=user.pk).exists():
        return fail("That number is already on another account.", "phone_taken")
    try:
        ch = otp.start(user, OTPChallenge.PHONE, phone, "signup")
    except otp.OTPError as e:
        return fail(str(e), e.code, status.HTTP_429_TOO_MANY_REQUESTS)
    except DeliveryError as e:
        return fail(str(e), "delivery", status.HTTP_502_BAD_GATEWAY)
    return Response(challenge_payload(ch))


@api_view(["POST"])
@permission_classes([AllowAny])
def onboarding_complete(request):
    user = onboarding_user(request.data.get("onboarding_token"))
    if not user or not (user.email_verified and user.phone_verified):
        return fail("Verify your email and phone first.", "session")
    d = request.data
    name = (d.get("name") or "").strip()
    if not name:
        return fail("Add your full name.", "name")
    user.name = name[:120]
    for f in ("college", "city", "title", "linkedin"):
        if f in d:
            setattr(user, f, (d.get(f) or "").strip()[:160])
    if d.get("grad_year"):
        try:
            user.grad_year = int(d["grad_year"])
        except (TypeError, ValueError):
            return fail("Pick a graduation year.", "grad_year")
    user.onboarded = True
    user.last_active = timezone.now()
    user.save()
    Invite.objects.filter(email__iexact=user.email, state=Invite.PENDING).update(state=Invite.ACCEPTED, accepted_at=timezone.now())
    log(user, "Joined", user.email, f"Role: {user.get_role_display()}", request)
    return Response(tokens_for(user))


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([OTPThrottle])
def login(request):
    email = (request.data.get("email") or "").strip().lower()
    user = User.objects.filter(email__iexact=email, onboarded=True).first()
    if not user:
        return fail("There's no account for that email. Opponium is invite only, so use your invite link first.", "no_account", status.HTTP_404_NOT_FOUND)
    if user.suspended:
        return fail("This account is suspended. Contact support.", "suspended", status.HTTP_403_FORBIDDEN)
    if request.data.get("admin") and user.role != User.ADMIN:
        return fail("This email doesn't have admin access.", "not_admin", status.HTTP_403_FORBIDDEN)
    try:
        ch = otp.start(user, OTPChallenge.EMAIL, user.email, "login")
    except otp.OTPError as e:
        return fail(str(e), e.code, status.HTTP_429_TOO_MANY_REQUESTS)
    except DeliveryError as e:
        return fail(str(e), "delivery", status.HTTP_502_BAD_GATEWAY)
    return Response(challenge_payload(ch))


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def me(request):
    u = request.user
    if request.method == "PATCH":
        for f in ("name", "college", "city", "linkedin", "title"):
            if f in request.data:
                setattr(u, f, (request.data.get(f) or "").strip()[:160])
        if request.data.get("grad_year"):
            u.grad_year = int(request.data["grad_year"])
        u.save()
    return Response(user_payload(u))


@api_view(["POST"])
@permission_classes([AllowAny])
def access_request(request):
    d = request.data
    fields = {k: (d.get(k) or "").strip() for k in ("name", "email", "organisation")}
    if not all(fields.values()) or "@" not in fields["email"]:
        return fail("Fill in your name, email and college or company.", "fields")
    joining = d.get("joining_as") if d.get("joining_as") in ("candidate", "recruiter") else "candidate"
    AccessRequest.objects.create(joining_as=joining, **fields)
    return Response({"ok": True}, status=status.HTTP_201_CREATED)
