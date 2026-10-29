from django.urls import path

from . import views

urlpatterns = [
    path("jobs", views.jobs),
    path("jobs/<int:pk>", views.job_detail),
    path("jobs/<int:pk>/apply", views.apply),
    path("applications", views.my_applications),
    path("applications/<int:pk>", views.my_application),
    path("applications/<int:pk>/withdraw", views.withdraw),
    path("applications/<int:pk>/resume", views.resume),
    path("team/inbox", views.inbox),
    path("team/jobs", views.team_jobs),
    path("team/jobs/<int:pk>", views.team_job),
    path("team/applications/<int:pk>", views.team_application),
    path("team/applications/<int:pk>/signal", views.signal),
    path("team/applications/<int:pk>/advance", views.advance),
    path("team/applications/<int:pk>/decline", views.decline),
    path("team/applications/<int:pk>/notes", views.add_note),
    path("team/members", views.team_members),
]
