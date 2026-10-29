"""Resume files in a private Supabase Storage bucket."""

import uuid

import requests
from django.conf import settings


class StorageError(Exception):
    pass


def _headers():
    return {"Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}", "apikey": settings.SUPABASE_SERVICE_KEY}


def upload_resume(user_id, file):
    path = f"{user_id}/{uuid.uuid4().hex}.pdf"
    if not settings.SUPABASE_URL:
        return path  # local development without storage
    r = requests.post(
        f"{settings.SUPABASE_URL}/storage/v1/object/{settings.RESUME_BUCKET}/{path}",
        headers={**_headers(), "Content-Type": "application/pdf", "x-upsert": "false"},
        data=file.read(),
        timeout=30,
    )
    if r.status_code >= 300:
        raise StorageError("We couldn't save your resume. Try again.")
    return path


def signed_url(path, seconds=600):
    if not settings.SUPABASE_URL:
        return None
    r = requests.post(
        f"{settings.SUPABASE_URL}/storage/v1/object/sign/{settings.RESUME_BUCKET}/{path}",
        headers=_headers(),
        json={"expiresIn": seconds},
        timeout=15,
    )
    if r.status_code >= 300:
        return None
    return f"{settings.SUPABASE_URL}/storage/v1{r.json()['signedURL']}"
