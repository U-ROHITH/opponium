import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, FileText, Upload } from "lucide-react";
import { ActivityFeed, MiniProgress, StatusChip, Stepper } from "../components/status";
import {
  Button,
  ButtonLink,
  CompanyMark,
  EmptyState,
  ErrorState,
  Field,
  FormError,
  Input,
  LoadingRows,
  LoadingText,
  PageHeader,
  Select,
  Textarea,
  cx,
} from "../components/ui";
import type { Application, Job } from "../data/types";
import { STAGES, stageLabel } from "../data/stages";
import { ApiError, api, errorText } from "../lib/api";
import { useMe } from "../lib/auth";
import { useGet, usePoll } from "../lib/hooks";
import { slaState } from "../lib/sla";
import { durationText, formatDate, formatDateTime, formatPhone, formatSize, relative } from "../lib/time";

const notFound = (e: unknown) => e instanceof ApiError && e.status === 404;

function Back({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className="-my-2 inline-flex items-center gap-1.5 py-2 text-[14px] text-grey-600 hover:text-ink">
      <ArrowLeft size={15} /> {children}
    </Link>
  );
}

function Gone({ title, body, to, label }: { title: string; body: string; to: string; label: string }) {
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-[28px] font-semibold">{title}</h1>
      <p className="mt-2 text-grey-600">{body}</p>
      <ButtonLink to={to} variant="secondary" className="mt-6">
        {label}
      </ButtonLink>
    </div>
  );
}

export function Jobs() {
  const [type, setType] = useState("All");
  const { data, error, loading, reload } = useGet<Job[]>("/api/jobs");
  const jobs = data ?? [];
  const shown = jobs.filter((j) => type === "All" || j.type === type);
  return (
    <div>
      <PageHeader title="Jobs" sub="Roles from teams that have committed to reply within 48 hours." />
      <div className="mt-8 flex gap-2 overflow-x-auto" role="tablist">
        {["All", "Full-time", "Internship"].map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={type === t}
            onClick={() => setType(t)}
            className={cx(
              "h-8 shrink-0 rounded-full border px-3.5 text-[13px]",
              type === t ? "border-ink bg-ink text-paper" : "border-grey-300 text-grey-700 hover:border-ink",
            )}
          >
            {t}
          </button>
        ))}
      </div>
      {loading && !data ? (
        <LoadingRows className="mt-6" />
      ) : error ? (
        <ErrorState className="mt-6" error={error} onRetry={() => reload()} />
      ) : jobs.length === 0 ? (
        <EmptyState className="mt-6" title="No open roles right now." body="New roles appear here as companies join." />
      ) : shown.length === 0 ? (
        <EmptyState className="mt-6" title={`No ${type.toLowerCase()} roles open right now.`} body="Check All to see every open role." />
      ) : (
        <ul className="mt-6 divide-y divide-grey-200 border-y border-grey-200">
          {shown.map((j) => (
            <li key={j.id}>
              <Link to={`/jobs/${j.id}`} className="flex items-center gap-4 py-5 hover:bg-grey-50 sm:px-3">
                <CompanyMark name={j.company} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <p className="font-medium">{j.title}</p>
                    {j.applied_application_id && (
                      <span className="inline-flex items-center gap-1 text-[12px] text-grey-600">
                        <Check size={12} strokeWidth={2.5} /> Applied
                      </span>
                    )}
                  </div>
                  <p className="text-[14px] text-grey-600">{j.company}</p>
                </div>
                <div className="hidden w-48 text-[14px] text-grey-700 md:block">{j.location}</div>
                <div className="hidden w-28 text-[14px] text-grey-700 sm:block">{j.type}</div>
                <div className="tnum hidden w-20 text-right text-[13px] text-grey-500 sm:block">{relative(j.posted_at)}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function JobGone() {
  return <Gone title="This role isn't open" body="It may have been filled or taken down by the company." to="/jobs" label="Browse jobs" />;
}

export function JobDetail() {
  const { id } = useParams();
  const { data: job, error, reload } = useGet<Job>(`/api/jobs/${id}`);
  const existing = useGet<Application>(job?.applied_application_id ? `/api/applications/${job.applied_application_id}` : null);
  if (notFound(error)) return <JobGone />;
  if (error) return <ErrorState error={error} onRetry={() => reload()} />;
  if (!job) return <LoadingText />;
  const due = new Date(Date.now() + 48 * 3600_000).toISOString();
  return (
    <div>
      <Back to="/jobs">Jobs</Back>
      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_320px]">
        <article>
          <div className="flex items-center gap-4">
            <CompanyMark name={job.company} size={48} />
            <div className="min-w-0">
              <h1 className="text-[28px] font-semibold">{job.title}</h1>
              <p className="text-grey-600">
                {job.company}
                {job.team ? `, ${job.team}` : ""}
              </p>
            </div>
          </div>
          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 border-y border-grey-200 py-5 sm:grid-cols-4">
            {[
              ["Location", job.location || "Not listed"],
              ["Type", job.type],
              ["Pay", job.salary || "Shared at HR round"],
              ["Applicants", String(job.applicants)],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-[13px] text-grey-500">{k}</dt>
                <dd className="tnum mt-0.5 text-[14px] font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-8 max-w-2xl space-y-8">
            {job.summary && <p className="whitespace-pre-line text-[15px] leading-relaxed text-grey-800">{job.summary}</p>}
            {job.responsibilities.length > 0 && (
              <section>
                <h2 className="text-[18px] font-semibold">What you'll do</h2>
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-grey-700 marker:text-grey-400">
                  {job.responsibilities.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </section>
            )}
            {job.requirements.length > 0 && (
              <section>
                <h2 className="text-[18px] font-semibold">What we're looking for</h2>
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-grey-700 marker:text-grey-400">
                  {job.requirements.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </article>
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-lg border border-grey-200 p-5">
            {job.applied_application_id ? (
              <>
                <p className="text-[14px] text-grey-600">{existing.data ? `You applied ${relative(existing.data.applied_at)}.` : "You applied to this role."}</p>
                <ButtonLink to={`/applications/${job.applied_application_id}`} className="mt-4 w-full">
                  Track application
                </ButtonLink>
              </>
            ) : job.status !== "open" ? (
              <p className="text-[14px] text-grey-600">This role isn't taking applications right now.</p>
            ) : (
              <>
                <p className="text-[14px] text-grey-600">Apply now and you'll hear back within 48 hours, by</p>
                <p className="tnum mt-1 font-display text-[22px] font-semibold">{formatDateTime(due)}</p>
                <ButtonLink to={`/jobs/${job.id}/apply`} className="mt-5 w-full">
                  Apply
                </ButtonLink>
                <p className="mt-3 text-[13px] text-grey-500">Takes about two minutes. Your profile fills in most of it.</p>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

const YEARS = [2023, 2024, 2025, 2026, 2027, 2028];
const MAX_RESUME = 5 * 1024 * 1024;

function AlreadyApplied({ job, appId }: { job: Job; appId: number }) {
  const existing = useGet<Application>(`/api/applications/${appId}`);
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-[28px] font-semibold">You've already applied</h1>
      <p className="mt-2 text-grey-600">
        You applied to {job.title} at {job.company}
        {existing.data ? ` ${relative(existing.data.applied_at)}` : ""}. You can apply to each role once.
      </p>
      <ButtonLink to={`/applications/${appId}`} className="mt-6">
        Track application
      </ButtonLink>
    </div>
  );
}

export function Apply() {
  const { id } = useParams();
  const me = useMe();
  const nav = useNavigate();
  const jobQ = useGet<Job>(`/api/jobs/${id}`);
  const mine = useGet<Application[]>("/api/applications");
  const [file, setFile] = useState<File | null>(null);
  const [replace, setReplace] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [review, setReview] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: me.name,
    college: me.college,
    grad_year: String(me.grad_year ?? 2026),
    city: me.city,
    linkedin: me.linkedin,
    note: "",
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: k === "note" ? e.target.value.slice(0, 300) : e.target.value });

  const job = jobQ.data;
  if (notFound(jobQ.error)) return <JobGone />;
  if (jobQ.error) return <ErrorState error={jobQ.error} onRetry={() => jobQ.reload()} />;
  if (!job || (mine.loading && !mine.data)) return <LoadingText />;
  if (job.applied_application_id) return <AlreadyApplied job={job} appId={job.applied_application_id} />;
  if (job.status !== "open") return <JobGone />;

  const last = mine.data?.[0]?.resume;
  const useLast = !file && !replace && !!last?.name;
  const resumeName = file?.name ?? (useLast ? last!.name : null);
  const years = form.grad_year && !YEARS.includes(Number(form.grad_year)) ? [...YEARS, Number(form.grad_year)] : YEARS;

  const pick = (f: File | undefined) => {
    setFileError(null);
    if (!f) return;
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) return setFileError("Upload your resume as a PDF.");
    if (f.size > MAX_RESUME) return setFileError("Your resume is over 5 MB. Export a smaller PDF.");
    setFile(f);
  };

  const send = async () => {
    setSending(true);
    setSendError(null);
    const fd = new FormData();
    if (file) fd.append("resume", file);
    fd.append("name", form.name.trim());
    fd.append("college", form.college.trim());
    fd.append("grad_year", form.grad_year);
    fd.append("city", form.city.trim());
    fd.append("linkedin", form.linkedin.trim());
    fd.append("note", form.note.trim());
    try {
      const app = await api.post<Application>(`/api/jobs/${job.id}/apply`, fd);
      nav(`/applications/${app.id}/submitted`, { replace: true });
    } catch (e) {
      if (e instanceof ApiError && e.code === "duplicate") {
        await jobQ.reload(true);
        return;
      }
      setSendError(errorText(e));
      setSending(false);
    }
  };

  if (review)
    return (
      <div className="mx-auto max-w-xl">
        <button onClick={() => setReview(false)} className="-my-2 inline-flex items-center gap-1.5 py-2 text-[14px] text-grey-600 hover:text-ink">
          <ArrowLeft size={15} /> Edit details
        </button>
        <h1 className="mt-6 text-[28px] font-semibold">Check and send</h1>
        <p className="mt-1 text-grey-600">
          {job.title} at {job.company}
        </p>
        <dl className="mt-8 divide-y divide-grey-200 border-y border-grey-200">
          {[
            ["Resume", resumeName ?? "None"],
            ["Name", form.name],
            ["Email", me.email],
            ["Phone", formatPhone(me.phone)],
            ["College", `${form.college}, ${form.grad_year}`],
            ["City", form.city],
            ["LinkedIn", form.linkedin || "None"],
            ["Note", form.note || "None"],
          ].map(([k, v]) => (
            <div key={k} className="grid grid-cols-[110px_1fr] gap-4 py-3 text-[14px]">
              <dt className="text-grey-500">{k}</dt>
              <dd className="min-w-0 break-words">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-[14px] text-grey-600">After you send, you can't edit your application once the team has viewed it.</p>
        {sendError && (
          <div className="mt-4">
            <FormError>{sendError}</FormError>
          </div>
        )}
        <div className="mt-6 flex gap-3">
          <Button onClick={send} disabled={sending}>
            {sending ? "Sending" : "Send application"}
          </Button>
          <Button variant="secondary" onClick={() => setReview(false)} disabled={sending}>
            Back
          </Button>
        </div>
      </div>
    );

  return (
    <div className="mx-auto max-w-xl">
      <Back to={`/jobs/${job.id}`}>{job.title}</Back>
      <h1 className="mt-6 text-[28px] font-semibold">Apply to {job.company}</h1>
      <p className="mt-1 text-grey-600">{job.title}</p>
      <form
        className="mt-8 space-y-8"
        onSubmit={(e) => {
          e.preventDefault();
          setReview(true);
          window.scrollTo(0, 0);
        }}
      >
        <section>
          <h2 className="text-[15px] font-semibold">Resume</h2>
          {resumeName ? (
            <div className="mt-3 flex items-center gap-3 rounded-md border border-grey-300 p-3">
              <FileText size={20} strokeWidth={1.5} className="shrink-0 text-grey-600" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium">{resumeName}</p>
                <p className="text-[12px] text-grey-500">
                  PDF{file ? `, ${formatSize(file.size)}` : last?.size ? `, ${formatSize(last.size)}, from your last application` : ", from your last application"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setReplace(true);
                }}
                className="py-2 text-[13px] text-grey-600 underline underline-offset-2 hover:text-ink"
              >
                Replace
              </button>
            </div>
          ) : (
            <>
              <label
                className={cx(
                  "mt-3 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed px-4 py-8 text-center hover:border-ink",
                  fileError ? "border-bad" : "border-grey-400",
                )}
              >
                <Upload size={20} strokeWidth={1.5} />
                <span className="text-[14px] font-medium">Upload your resume</span>
                <span className="text-[13px] text-grey-500">PDF up to 5 MB</span>
                <input type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
              </label>
              {fileError && <p className="mt-2 text-[13px] text-bad">{fileError}</p>}
              {last?.name && (
                <button type="button" onClick={() => setReplace(false)} className="mt-2 py-2 text-[13px] text-grey-600 underline underline-offset-2 hover:text-ink">
                  Use {last.name} instead
                </button>
              )}
            </>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-[15px] font-semibold">About you</h2>
          <Field label="Full name">
            <Input value={form.name} onChange={set("name")} required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" hint="Verified">
              <Input value={me.email} readOnly />
            </Field>
            <Field label="Phone" hint="Verified">
              <Input value={formatPhone(me.phone)} readOnly className="tnum" />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
            <Field label="College or current company">
              <Input value={form.college} onChange={set("college")} required />
            </Field>
            <Field label="Graduation year">
              <Select value={form.grad_year} onChange={set("grad_year")}>
                {years.map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="City">
            <Input value={form.city} onChange={set("city")} required />
          </Field>
          <Field label="LinkedIn or portfolio" optional>
            <Input value={form.linkedin} onChange={set("linkedin")} />
          </Field>
          <Field label="Anything the team should know?" optional hint={`${form.note.length} of 300 characters`}>
            <Textarea value={form.note} onChange={set("note")} placeholder="Notice period, a project you're proud of, a link" />
          </Field>
        </section>

        <div className="flex gap-3 border-t border-grey-200 pt-6">
          <Button disabled={!resumeName}>Review application</Button>
          <ButtonLink to={`/jobs/${job.id}`} variant="ghost">
            Cancel
          </ButtonLink>
        </div>
      </form>
    </div>
  );
}

export function Submitted() {
  const { id } = useParams();
  const { data: app, error, reload } = useGet<Application>(`/api/applications/${id}`);
  if (error) return <ErrorState error={error} onRetry={() => reload()} />;
  if (!app) return <LoadingText />;
  return (
    <div className="mx-auto max-w-xl pt-6">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-paper">
        <Check size={20} strokeWidth={2.5} />
      </span>
      <h1 className="mt-6 text-[28px] font-semibold">Application sent</h1>
      <p className="mt-2 text-[15px] text-grey-700">
        {app.job.company} will reply to your application for {app.job.title} by{" "}
        <span className="tnum font-medium text-ink">{formatDateTime(app.reply_due_at)}</span>. We'll email you at each step.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink to={`/applications/${app.id}`}>Track your status</ButtonLink>
        <ButtonLink to="/jobs" variant="secondary">
          Browse jobs
        </ButtonLink>
      </div>
    </div>
  );
}

const closed = (s: string) => s === "declined" || s === "withdrawn" || s === "offer";

export function Applications() {
  const [tab, setTab] = useState<"active" | "closed">("active");
  const { data, error, loading, reload } = useGet<Application[]>("/api/applications");
  const all = data ?? [];
  const inTab = (t: "active" | "closed") => all.filter((a) => (t === "closed" ? closed(a.status) : !closed(a.status)));
  const list = inTab(tab);
  return (
    <div>
      <PageHeader title="Applications" />
      <div className="mt-6 flex gap-6 border-b border-grey-200" role="tablist">
        {(["active", "closed"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cx("-mb-px border-b-2 pb-3 text-[14px] capitalize", tab === t ? "border-ink font-medium" : "border-transparent text-grey-600 hover:text-ink")}
          >
            {t} {data && <span className="tnum text-grey-500">{inTab(t).length}</span>}
          </button>
        ))}
      </div>
      {loading && !data ? (
        <LoadingRows rows={3} className="border-t-0" />
      ) : error ? (
        <ErrorState className="mt-6" error={error} onRetry={() => reload()} />
      ) : all.length === 0 ? (
        <EmptyState
          className="border-t-0"
          title="No applications yet."
          body="When you apply to a role, you can follow every step here."
          action={<ButtonLink to="/jobs">Browse jobs</ButtonLink>}
        />
      ) : list.length === 0 ? (
        <EmptyState
          className="border-t-0"
          title={tab === "active" ? "Nothing active right now." : "No closed applications."}
          body={tab === "active" ? "Applications that are still moving show up here." : "Offers, decisions and withdrawn applications show up here."}
        />
      ) : (
        <ul className="divide-y divide-grey-200">
          {list.map((a) => {
            const last = a.events[a.events.length - 1];
            const waiting = !a.first_reply_at && !closed(a.status);
            return (
              <li key={a.id}>
                <Link to={`/applications/${a.id}`} className="grid gap-3 py-5 hover:bg-grey-50 sm:grid-cols-[1fr_200px_180px] sm:items-center sm:px-3">
                  <div className="flex items-center gap-4">
                    <CompanyMark name={a.job.company} />
                    <div className="min-w-0">
                      <p className="font-medium">{a.job.title}</p>
                      <p className="text-[14px] text-grey-600">{a.job.company}</p>
                    </div>
                  </div>
                  <div className="pl-14 sm:pl-0">
                    <MiniProgress stage={a.stage} status={a.status} />
                    <p className="mt-1.5 text-[13px] text-grey-600">{a.stage_label || stageLabel(a.stage)}</p>
                  </div>
                  <div className="pl-14 sm:pl-0 sm:text-right">
                    <p className="text-[14px]">{last?.text ?? "Application received"}</p>
                    <p className="tnum text-[13px] text-grey-500">
                      {waiting ? `Reply by ${formatDateTime(a.reply_due_at)}` : relative(last?.at ?? a.applied_at)}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function Tracker() {
  const { id } = useParams();
  const { data: app, error, reload, setData } = useGet<Application>(`/api/applications/${id}`);
  usePoll(() => void reload(true), 30_000);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  if (notFound(error)) return <Gone title="We couldn't find that application" body="It may belong to another account." to="/applications" label="Your applications" />;
  if (error) return <ErrorState error={error} onRetry={() => reload()} />;
  if (!app) return <LoadingText />;

  const job = app.job;
  const isClosed = closed(app.status);
  const stageIdx = Math.max(0, STAGES.findIndex((s) => s.key === app.stage));
  const late = !app.first_reply_at && slaState(app) === "overdue";
  const viewed = app.events.some((e) => e.kind === "viewed");

  const withdraw = async () => {
    setWithdrawing(true);
    setWithdrawError(null);
    try {
      setData(await api.post<Application>(`/api/applications/${app.id}/withdraw`));
      setConfirmWithdraw(false);
    } catch (e) {
      setWithdrawError(errorText(e));
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Back to="/applications">Applications</Back>

      <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <CompanyMark name={job.company} size={48} />
          <div className="min-w-0">
            <h1 className="text-[28px] font-semibold">{job.title}</h1>
            <p className="tnum text-grey-600">
              {job.company}, applied {formatDateTime(app.applied_at)}
            </p>
          </div>
        </div>
        <StatusChip status={app.status} />
      </div>

      <div className="mt-8 rounded-lg border border-grey-200">
        <div className="border-b border-grey-200 px-5 py-4 sm:px-6">
          {app.first_reply_at ? (
            <p className="tnum text-[14px] text-grey-700">
              <Check size={14} strokeWidth={2.5} className="mr-1.5 inline -translate-y-px" />
              {job.company} replied {formatDate(app.first_reply_at)}, {durationText(app.applied_at, app.first_reply_at)} after you applied.
            </p>
          ) : app.status === "withdrawn" ? (
            <p className="text-[14px] text-grey-700">You withdrew this application.</p>
          ) : late ? (
            <p className="text-[14px] text-bad">We're running late. You'll hear back shortly, and we've flagged this to the team.</p>
          ) : (
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p>
                <span className="text-[14px] text-grey-600">You'll hear back by </span>
                <span className="tnum font-display text-[22px] font-semibold">{formatDateTime(app.reply_due_at)}</span>
              </p>
              <span className="tnum text-[13px] text-grey-500">48 hours after you applied, {relative(app.reply_due_at)}</span>
            </div>
          )}
        </div>
        <div className="px-5 py-6 sm:px-6">
          <Stepper stage={app.stage} status={app.status} />
        </div>
      </div>

      <div className="mt-10 grid gap-10 md:grid-cols-[1fr_260px]">
        <section>
          <h2 className="text-[18px] font-semibold">Activity</h2>
          <div className="mt-5">
            <ActivityFeed signals={app.events} />
          </div>
        </section>
        <aside className="space-y-8">
          {!isClosed && (
            <section>
              <h2 className="text-[15px] font-semibold">What happens next</h2>
              <p className="mt-2 text-[14px] text-grey-700">
                <span className="font-medium text-ink">{STAGES[stageIdx].label}.</span> {STAGES[stageIdx].next}
              </p>
            </section>
          )}
          {app.status === "declined" && (
            <section>
              <h2 className="text-[15px] font-semibold">Decision</h2>
              <p className="mt-2 text-[14px] text-grey-700">
                The team decided not to move forward with your application for {job.title}. Thank you for applying.
              </p>
            </section>
          )}
          {app.status === "offer" && (
            <section>
              <h2 className="text-[15px] font-semibold">Decision</h2>
              <p className="mt-2 text-[14px] text-grey-700">
                {job.company} wants to make you an offer for {job.title}. They'll email you the details and next steps.
              </p>
            </section>
          )}
          <section>
            <h2 className="text-[15px] font-semibold">What you sent</h2>
            <div className="mt-3 flex items-center gap-2.5 text-[14px]">
              <FileText size={16} strokeWidth={1.5} className="shrink-0 text-grey-600" />
              <span className="truncate">{app.resume.name}</span>
            </div>
            <p className="mt-1 text-[13px] text-grey-500">{viewed ? "Locked after the team viewed it" : `Sent ${formatDate(app.applied_at)}`}</p>
          </section>
          {app.status === "withdrawn" && <p className="text-[14px] text-grey-700">You withdrew this application. {job.company} has been told.</p>}
          {!isClosed &&
            (confirmWithdraw ? (
              <div className="space-y-3">
                <p className="text-[14px] text-grey-700">Withdraw from {job.title}? You can't apply to this role again.</p>
                <FormError>{withdrawError}</FormError>
                <div className="flex gap-2">
                  <Button variant="danger" className="h-9 px-4 text-[13px]" onClick={withdraw} disabled={withdrawing}>
                    {withdrawing ? "Withdrawing" : "Withdraw"}
                  </Button>
                  <Button variant="ghost" className="h-9 px-4 text-[13px]" onClick={() => setConfirmWithdraw(false)} disabled={withdrawing}>
                    Keep it
                  </Button>
                </div>
              </div>
            ) : (
              <button onClick={() => setConfirmWithdraw(true)} className="py-2 text-[14px] text-grey-600 underline underline-offset-2 hover:text-bad">
                Withdraw application
              </button>
            ))}
        </aside>
      </div>
    </div>
  );
}
