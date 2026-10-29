import os

from django.core.management.base import BaseCommand

from accounts.models import User


class Command(BaseCommand):
    help = "Create or update admins from ADMIN_EMAIL (comma separated). Safe to run on every deploy."

    def handle(self, *args, **options):
        emails = [e.strip().lower() for e in os.environ.get("ADMIN_EMAIL", "").split(",") if e.strip()]
        if not emails:
            self.stdout.write("ADMIN_EMAIL not set, skipping")
            return
        names = [n.strip() for n in os.environ.get("ADMIN_NAME", "").split(",")]
        for i, email in enumerate(emails):
            user, created = User.objects.get_or_create(email=email, defaults={"role": User.ADMIN})
            user.role, user.is_staff, user.onboarded, user.email_verified, user.suspended = User.ADMIN, True, True, True, False
            if not user.name:
                user.name = names[i] if i < len(names) and names[i] else "Admin"
            user.save()
            self.stdout.write(f"{'Created' if created else 'Updated'} admin {user.email}")
