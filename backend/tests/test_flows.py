from datetime import timedelta
from unittest import mock

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from accounts import otp as otp_module
from accounts.models import Company, Invite, User
from hiring.models import Application, Job
from ops.models import AuditLog

PDF = b"%PDF-1.4 test resume"


@override_settings(RESEND_API_KEY=None, TWOFACTOR_API_KEY=None, SUPABASE_URL=None)
class Flows(TestCase):
    def setUp(self):
        self.sent = []
        patcher = mock.patch.object(otp_module, "_deliver", lambda ch, code: self.sent.append((ch.channel, ch.target, code)))
        patcher.start()
        self.addCleanup(patcher.stop)
        self.c = APIClient()
        self.admin = User.objects.create_user("admin@opponium.test", role=User.ADMIN, onboarded=True, name="Admin")
        self.company = Company.objects.create(name="Kite Labs")

    def auth(self, user):
        c = APIClient()
        c.force_authenticate(user)
        return c

    def signup(self, email, role="candidate", company=None, phone="9848022314"):
        inv = Invite.objects.create(email=email, role=role, company=company, invited_by=self.admin)
        r = self.c.get(f"/api/auth/invites/{inv.code.lower()}")
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data["status"], "pending")
        r = self.c.post(f"/api/auth/invites/{inv.code}/accept")
        self.assertEqual(r.status_code, 200, r.data)
        ch = r.data["challenge"]
        bad = self.c.post("/api/auth/otp/verify", {"challenge": ch, "code": "000000" if self.sent[-1][2] != "000000" else "111111"})
        self.assertEqual(bad.status_code, 400)
        self.assertIn("4 attempts left", bad.data["error"])
        r = self.c.post("/api/auth/otp/verify", {"challenge": ch, "code": self.sent[-1][2]})
        self.assertEqual(r.data["next"], "phone")
        tok = r.data["onboarding_token"]
        r = self.c.post("/api/auth/phone", {"onboarding_token": tok, "phone": phone})
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(self.sent[-1][1], "+91" + phone)
        r = self.c.post("/api/auth/otp/verify", {"challenge": r.data["challenge"], "code": self.sent[-1][2]})
        self.assertEqual(r.data["next"], "profile")
        r = self.c.post("/api/auth/onboarding", {"onboarding_token": tok, "name": "Aarav Mehta", "college": "IIT Madras", "grad_year": 2026, "city": "Chennai"})
        self.assertEqual(r.status_code, 200, r.data)
        self.assertTrue(r.data["access"])
        inv.refresh_from_db()
        self.assertEqual(inv.state, "accepted")
        return User.objects.get(email=email)

    def test_full_hiring_flow(self):
        cand = self.signup("aarav@iitm.ac.in")
        rec = self.signup("priya@kitelabs.in", "recruiter", self.company, phone="9000011111")
        self.assertTrue(rec.is_team)

        rc = self.auth(rec)
        r = rc.post("/api/team/jobs", {"title": "Frontend Engineer", "location": "Bengaluru", "requirements": "React\nTypeScript"}, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        job_id = r.data["id"]
        self.assertEqual(r.data["requirements"], ["React", "TypeScript"])

        cc = self.auth(cand)
        r = cc.post(f"/api/jobs/{job_id}/apply", {"resume": SimpleUploadedFile("cv.pdf", b"not a pdf")}, format="multipart")
        self.assertEqual(r.data["code"], "resume_type")
        r = cc.post(f"/api/jobs/{job_id}/apply", {"resume": SimpleUploadedFile("cv.pdf", PDF), "note": "Hi"}, format="multipart")
        self.assertEqual(r.status_code, 201, r.data)
        app_id = r.data["id"]
        due = Application.objects.get(pk=app_id)
        self.assertAlmostEqual((due.reply_due_at - due.applied_at).total_seconds(), 48 * 3600, delta=2)
        self.assertEqual(r.data["sla"], "on_track")
        self.assertEqual(cc.post(f"/api/jobs/{job_id}/apply", {}, format="multipart").status_code, 409)

        # Recruiter opens: auto "viewed", which is not a reply
        r = rc.get(f"/api/team/applications/{app_id}")
        self.assertEqual([e["kind"] for e in r.data["events"]], ["received", "viewed"])
        self.assertIsNone(r.data["first_reply_at"])
        r = rc.post(f"/api/team/applications/{app_id}/signal", {"kind": "reviewing_resume"}, format="json")
        self.assertIsNotNone(r.data["first_reply_at"])
        self.assertEqual(r.data["sla"], "replied")
        r = rc.post(f"/api/team/applications/{app_id}/advance")
        self.assertEqual((r.data["stage"], r.data["status"]), ("profile", "in_review"))
        r = rc.post(f"/api/team/applications/{app_id}/notes", {"text": "Strong"}, format="json")
        self.assertEqual(r.data["notes"][0]["text"], "Strong")

        # Candidate sees events but never notes
        r = cc.get(f"/api/applications/{app_id}")
        self.assertNotIn("notes", r.data)
        self.assertIn("Step completed: Resume screen", [e["text"] for e in r.data["events"]])

        r = rc.post(f"/api/team/applications/{app_id}/decline", {"reason": "skills"}, format="json")
        self.assertEqual(r.data["status"], "declined")
        self.assertEqual(rc.post(f"/api/team/applications/{app_id}/advance").status_code, 400)

        # Other companies can't see it
        other = User.objects.create_user("x@other.in", role=User.RECRUITER, company=Company.objects.create(name="Other"), onboarded=True)
        self.assertEqual(self.auth(other).get(f"/api/team/applications/{app_id}").status_code, 404)
        # Candidates can't use team endpoints
        self.assertEqual(cc.get("/api/team/inbox").status_code, 403)

    def test_sla_and_admin(self):
        cand = User.objects.create_user("c@x.in", role=User.CANDIDATE, onboarded=True, name="C", phone="+919000000000")
        job = Job.objects.create(company=self.company, title="Analyst")
        app = Application.objects.create(job=job, candidate=cand, name="C", email=cand.email, phone=cand.phone, college="X", city="Y", resume_path="p", resume_name="cv.pdf")
        Application.objects.filter(pk=app.pk).update(reply_due_at=timezone.now() - timedelta(hours=3))
        ac = self.auth(self.admin)
        r = ac.get("/api/admin/overview")
        self.assertEqual(r.data["overdue"], 1)
        r = ac.get("/api/admin/sla")
        self.assertEqual(r.data[0]["sla"], "overdue")
        self.assertEqual(ac.post(f"/api/admin/sla/{app.pk}/nudge").data["code"], "owner")

        r = ac.post("/api/admin/invites", {"email": "new@college.edu", "role": "candidate"}, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(ac.post(f"/api/admin/invites/{r.data['id']}/revoke").data["status"], "revoked")
        self.assertEqual(ac.post("/api/admin/invites", {"email": "bad", "role": "candidate"}, format="json").status_code, 400)
        r = ac.post("/api/admin/invites/bulk", {"csv": "email,role\na@b.in,candidate\nbroken\n"}, format="json")
        self.assertEqual(r.data["sent"], 1)
        self.assertEqual(len(r.data["errors"]), 1)

        r = self.c.post("/api/auth/access-requests", {"name": "T", "email": "t@iiitd.ac.in", "organisation": "IIIT Delhi"}, format="json")
        self.assertEqual(r.status_code, 201)
        req = ac.get("/api/admin/access-requests").data[0]
        self.assertEqual(ac.post(f"/api/admin/access-requests/{req['id']}/approve").data["state"], "approved")
        self.assertTrue(Invite.objects.filter(email="t@iiitd.ac.in", state="pending").exists())

        r = ac.put("/api/admin/settings", {"reply_hours": 48, "due_soon_hours": 6}, format="json")
        self.assertEqual(r.data["due_soon_hours"], 6)
        self.assertTrue(AuditLog.objects.filter(action="Changed setting").exists())
        self.assertEqual(self.auth(cand).get("/api/admin/overview").status_code, 403)

    def test_login_and_limits(self):
        u = User.objects.create_user("l@x.in", onboarded=True, name="L")
        self.assertEqual(self.c.post("/api/auth/login", {"email": "nobody@x.in"}).status_code, 404)
        r = self.c.post("/api/auth/login", {"email": "L@x.in"})
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(self.c.post("/api/auth/otp/resend", {"challenge": r.data["challenge"]}).data["code"], "too_soon")
        r = self.c.post("/api/auth/otp/verify", {"challenge": r.data["challenge"], "code": self.sent[-1][2]})
        self.assertTrue(r.data["access"])
        self.assertEqual(self.c.post("/api/auth/login", {"email": "l@x.in", "admin": True}).data["code"], "not_admin")
        u.suspended = True
        u.save()
        self.assertEqual(self.c.post("/api/auth/login", {"email": "l@x.in"}).status_code, 403)

    def test_expired_invite(self):
        inv = Invite.objects.create(email="e@x.in", expires_at=timezone.now() - timedelta(days=1))
        self.assertEqual(self.c.get(f"/api/auth/invites/{inv.code}").data["status"], "expired")
        self.assertEqual(self.c.post(f"/api/auth/invites/{inv.code}/accept").data["code"], "expired")
