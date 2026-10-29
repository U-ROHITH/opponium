import os

from django.core.management.base import BaseCommand

from accounts.models import User


class Command(BaseCommand):
    help = "Create or update the first admin from ADMIN_EMAIL. Safe to run on every deploy."

    def handle(self, *args, **options):
        email = os.environ.get("ADMIN_EMAIL")
        if not email:
            self.stdout.write("ADMIN_EMAIL not set, skipping")
            return
        user, created = User.objects.get_or_create(email=email.lower(), defaults={"role": User.ADMIN})
        user.role, user.is_staff, user.onboarded, user.email_verified = User.ADMIN, True, True, True
        if not user.name:
            user.name = os.environ.get("ADMIN_NAME", "Admin")
        user.save()
        self.stdout.write(f"{'Created' if created else 'Updated'} admin {user.email}")
