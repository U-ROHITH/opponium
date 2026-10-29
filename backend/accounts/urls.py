from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

urlpatterns = [
    path("invites/<str:code>", views.invite_detail),
    path("invites/<str:code>/accept", views.invite_accept),
    path("otp/verify", views.otp_verify),
    path("otp/resend", views.otp_resend),
    path("phone", views.phone_start),
    path("onboarding", views.onboarding_complete),
    path("login", views.login),
    path("refresh", TokenRefreshView.as_view()),
    path("me", views.me),
    path("access-requests", views.access_request),
]
