from django.urls import path

from . import views

urlpatterns = [
    path("overview", views.overview),
    path("invites", views.invites),
    path("invites/bulk", views.invites_bulk),
    path("invites/<int:pk>/<str:action>", views.invite_action),
    path("access-requests", views.access_requests),
    path("access-requests/<int:pk>/<str:action>", views.access_request_action),
    path("users", views.users),
    path("users/<int:pk>/<str:action>", views.user_action),
    path("companies", views.companies),
    path("sla", views.sla),
    path("sla/<int:pk>/nudge", views.nudge),
    path("applications", views.application_lookup),
    path("audit", views.audit),
    path("settings", views.platform_settings),
]
