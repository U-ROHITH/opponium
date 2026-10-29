from django.http import JsonResponse
from django.urls import include, path


def health(_request):
    return JsonResponse({"ok": True})


urlpatterns = [
    path("health", health),
    path("api/auth/", include("accounts.urls")),
    path("api/", include("hiring.urls")),
    path("api/admin/", include("ops.urls")),
]
