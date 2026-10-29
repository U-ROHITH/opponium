from .models import AuditLog


def client_ip(request):
    if request is None:
        return None
    fwd = request.META.get("HTTP_X_FORWARDED_FOR")
    return (fwd.split(",")[0].strip() if fwd else request.META.get("REMOTE_ADDR")) or None


def log(actor, action, target, detail="", request=None):
    label = "System"
    if actor is not None:
        label = actor.name or actor.email
    AuditLog.objects.create(actor=actor, actor_label=label, action=action, target=str(target)[:200], detail=detail[:300], ip=client_ip(request))
