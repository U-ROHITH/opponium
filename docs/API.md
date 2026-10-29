# Opponium API

Base URL: `https://opponium-api.onrender.com` (local: `http://localhost:8000`).
All bodies are JSON unless noted. Errors are `{"error": "<sentence for the user>", "code": "<machine code>"}` with a 4xx/5xx status; show `error` as-is.
Auth: `Authorization: Bearer <access>`. Access lasts 12h; refresh with `POST /api/auth/refresh {"refresh"}` → `{"access"}`.
Times are ISO 8601 UTC. Display in Asia/Kolkata.

## Auth (`/api/auth/`, no token needed unless marked)

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `invites/<code>` | | `{code, email, role, role_label, company, invited_by, expires_at, status: pending\|accepted\|expired\|revoked}` |
| POST | `invites/<code>/accept` | | Challenge + `onboarding_token`. Sends email code. |
| POST | `otp/verify` | `{challenge, code}` | signup email: `{next:"phone", onboarding_token}`; signup phone: `{next:"profile", onboarding_token, user}`; login: `{next:"done", access, refresh, user}` |
| POST | `otp/resend` | `{challenge}` | Challenge. Codes: `too_soon` (wait 30s), `rate_limited` (3 resends max) |
| POST | `phone` | `{onboarding_token, phone}` | Challenge. Sends SMS. `phone` may be 10 digits (India assumed) or `+<country><number>` |
| POST | `onboarding` | `{onboarding_token, name, college?, grad_year?, city?, title?, linkedin?}` | `{access, refresh, user}` |
| POST | `login` | `{email, admin?: true}` | Challenge (email code). `no_account` 404, `suspended` 403, `not_admin` 403 |
| GET/PATCH | `me` (token) | profile fields | user |
| POST | `access-requests` | `{name, email, organisation, joining_as: candidate\|recruiter}` | 201 |

Challenge: `{challenge, channel: email|phone, sent_to: "aa***@gmail.com", resend_in: 30, resends_left}`.
Wrong code error text already says attempts left, e.g. "That code isn't right. 4 attempts left." Codes: `wrong`, `expired`, `locked`, `used`.

User: `{id, email, name, role: candidate|recruiter|hiring_manager|admin, company: {id,name}|null, phone, email_verified, phone_verified, onboarded, college, grad_year, city, linkedin, title}`.
After login route by role: candidate → `/jobs`, recruiter/hiring_manager → `/r/inbox`, admin → admin app.

## Candidate (`/api/`, token, role candidate)

| Method | Path | Notes |
|---|---|---|
| GET | `jobs` | open jobs; each has `applied_application_id` |
| GET | `jobs/<id>` | Job |
| POST | `jobs/<id>/apply` | **multipart**: `resume` (PDF ≤5MB; optional if they applied before, last resume is reused), `name, college, grad_year, city, linkedin, note(≤300)`. 201 → Application. 409 `duplicate` |
| GET | `applications` | mine, newest first |
| GET | `applications/<id>` | Application (no notes) |
| POST | `applications/<id>/withdraw` | Application |
| GET | `applications/<id>/resume` | `{url, name}` signed URL, 10 min (candidate, own team, admin) |

Job: `{id, title, company, company_id, team, location, type, salary, summary, responsibilities[], requirements[], status, posted_at, applicants, applied_application_id}`.

Application: `{id, job:{id,title,company,location}, stage: resume|profile|hr|manager|decision, stage_label, status: submitted|in_review|interviewing|offer|declined|withdrawn, applied_at, reply_due_at, first_reply_at, sla: on_track|due_soon|overdue|replied|closed, events:[{id,kind,text,at}], candidate:{name,email,phone,college,grad_year,city,linkedin,note}, resume:{name,size}}`.
Team views add `owner:{id,name}|null, decline_reason, notes:[{id,text,at,author}]`.
Event kinds: `received, viewed, reviewing_resume, reviewing_profile, interview_scheduled, step_completed, decision, withdrawn`.
Reply rule: the 48h clock (`reply_due_at`) is met by the first event that isn't `received`/`viewed`.

## Hiring team (`/api/team/`, token, role recruiter or hiring_manager)

| Method | Path | Body / notes |
|---|---|---|
| GET | `inbox` | company applications sorted overdue → due soon → on track → replied |
| GET/POST | `jobs` | GET adds `stage_counts{resume..decision}, overdue`. POST `{title, team, location, type, salary, summary, responsibilities (text lines or list), requirements, draft?}` |
| GET | `jobs/<id>` | `{job, applications[]}` |
| GET | `applications/<id>` | First open by the team records a `viewed` event automatically |
| POST | `applications/<id>/signal` | `{kind: reviewing_resume\|reviewing_profile\|interview_scheduled, when?}` |
| POST | `applications/<id>/advance` | next stage; from manager → decision = offer |
| POST | `applications/<id>/decline` | `{reason: skills\|experience\|location\|filled}` |
| POST | `applications/<id>/notes` | `{text}` |
| GET/POST | `members` | POST `{email, role: recruiter\|hiring_manager}` sends invite. Rows `{id,name,email,role,status: active\|invited}` |

## Admin (`/api/admin/`, token, role admin)

| Method | Path | Notes |
|---|---|---|
| GET | `overview` | `{open_applications, companies, due_soon, overdue, median_first_reply_hours, invites_pending, access_requests, attention: Application[], trend:[{day, median_hours\|null}] (14 days), recent: AuditRow[]}` |
| GET/POST | `invites` | POST `{email, role, company_id?}`. Row `{id, code, email, role, role_label, company, invited_by, sent_at, status, link}` |
| POST | `invites/bulk` | `{csv: "email,role,company name" lines}` → `{sent, errors[]}` |
| POST | `invites/<id>/resend` \| `invites/<id>/revoke` | Row |
| GET | `access-requests` | `[{id,name,email,joining_as,organisation,state,created_at}]` |
| POST | `access-requests/<id>/approve` \| `/decline` | approve sends an invite |
| GET | `users?q=&role=` | `[{id,name,email,role,organisation,email_verified,phone_verified,onboarded,suspended,last_active}]` |
| POST | `users/<id>/suspend` \| `/restore` | |
| GET/POST | `companies` | POST `{name, domain}`. Row `{id,name,domain,status,recruiters,open_jobs,open_applications,reply_rate (0-100\|null)}` |
| GET | `sla` | overdue + due soon Applications (+`nudged_at`) |
| POST | `sla/<id>/nudge` | emails the owner |
| GET | `applications?q=<email or id>` | lookup |
| GET | `audit?q=` | `[{id, at, actor, action, target, detail}]` |
| GET/PUT | `settings` | `{reply_hours, due_soon_hours, email_template, sms_template, stages[{key,label}]}` |
