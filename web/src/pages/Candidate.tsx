import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Check, FileText, Upload } from "lucide-react";
import { ActivityFeed, MiniProgress, StatusChip, Stepper } from "../components/status";
import { Button, ButtonLink, CompanyMark, Field, Input, PageHeader, Select, Textarea, cx } from "../components/ui";
import { applications, jobById, jobs, NOW, STAGES } from "../data/mock";
import { durationHours, formatDate, formatDateTime, hoursFromNow, relative } from "../lib/time";

export function Jobs() {
  const [type, setType] = useState("All");
  const shown = jobs.filter((j) => type === "All" || j.type === type);
  const applied = new Set(applications.map((a) => a.jobId));
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
      <ul className="mt-6 divide-y divide-grey-200 border-y border-grey-200">
        {shown.map((j) => (
          <li key={j.id}>
            <Link to={`/jobs/${j.id}`} className="flex items-center gap-4 py-5 hover:bg-grey-50 sm:px-3">
              <CompanyMark name={j.company} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="font-medium">{j.title}</p>
                  {applied.has(j.id) && (
                    <span className="inline-flex items-center gap-1 text-[12px] text-grey-600">
                      <Check size={12} strokeWidth={2.5} /> Applied
                    </span>
                  )}
                </div>
                <p className="text-[14px] text-grey-600">{j.company}</p>
              </div>
              <div className="hidden w-48 text-[14px] text-grey-700 md:block">{j.location}</div>
              <div className="hidden w-28 text-[14px] text-grey-700 sm:block">{j.type}</div>
              <div className="tnum hidden w-20 text-right text-[13px] text-grey-500 sm:block">{relative(j.postedAt)}</div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function JobDetail() {
  const { id } = useParams();
  const job = jobById(id!);
  const existing = applications.find((a) => a.jobId === job.id);
  const due = new Date(NOW.getTime() + 48 * 3600_000).toISOString();
  return (
    <div>
      <Link to="/jobs" className="-my-2 inline-flex items-center gap-1.5 py-2 text-[14px] text-grey-600 hover:text-ink">
        <ArrowLeft size={15} /> Jobs
      </Link>
      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_320px]">
        <article>
          <div className="flex items-center gap-4">
            <CompanyMark name={job.company} size={48} />
            <div>
              <h1 className="text-[28px] font-semibold">{job.title}</h1>
              <p className="text-grey-600">
                {job.company}, {job.team}
              </p>
            </div>
          </div>
          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 border-y border-grey-200 py-5 sm:grid-cols-4">
            {[
              ["Location", job.location],
              ["Type", job.type],
              ["Pay", job.salary ?? "Shared at HR round"],
              ["Applicants", String(job.applicants)],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-[13px] text-grey-500">{k}</dt>
                <dd className="tnum mt-0.5 text-[14px] font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-8 max-w-2xl space-y-8">
            <p className="text-[15px] leading-relaxed text-grey-800">{job.summary}</p>
            <section>
              <h2 className="text-[18px] font-semibold">What you'll do</h2>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-grey-700 marker:text-grey-400">
                {job.responsibilities.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </section>
            <section>
              <h2 className="text-[18px] font-semibold">What we're looking for</h2>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-grey-700 marker:text-grey-400">
                {job.requirements.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </section>
          </div>
        </article>
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-lg border border-grey-200 p-5">
            {existing ? (
              <>
                <p className="text-[14px] text-grey-600">You applied {relative(existing.appliedAt)}.</p>
                <ButtonLink to={`/applications/${existing.id}`} className="mt-4 w-full">
                  Track application
                </ButtonLink>
              </>
            ) : (
              <>
                <p className="text-[14px] text-grey-600">Apply now and you'll hear back by</p>
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

export function Apply() {
  const { id } = useParams();
  const job = jobById(id!);
  const nav = useNavigate();
  const [file, setFile] = useState<string | null>("Aarav_Mehta_Resume.pdf");
  const [review, setReview] = useState(false);
  const [note, setNote] = useState("");
  const existing = applications.find((a) => a.jobId === job.id);

  if (existing)
    return (
      <div className="mx-auto max-w-xl">
        <h1 className="text-[28px] font-semibold">You've already applied</h1>
        <p className="mt-2 text-grey-600">
          You applied to {job.title} at {job.company} {relative(existing.appliedAt)}. You can apply to each role once.
        </p>
        <ButtonLink to={`/applications/${existing.id}`} className="mt-6">
          Track application
        </ButtonLink>
      </div>
    );

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
            ["Resume", file ?? "None"],
            ["Name", "Aarav Mehta"],
            ["Email", "aarav.mehta@iitm.ac.in"],
            ["Phone", "+91 98480 22314"],
            ["College", "IIT Madras, 2026"],
            ["City", "Chennai"],
            ["LinkedIn", "linkedin.com/in/aaravmehta"],
            ["Note", note || "None"],
          ].map(([k, v]) => (
            <div key={k} className="grid grid-cols-[110px_1fr] gap-4 py-3 text-[14px]">
              <dt className="text-grey-500">{k}</dt>
              <dd className="break-words">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-[14px] text-grey-600">
          After you send, you can't edit your application once the team has viewed it.
        </p>
        <div className="mt-6 flex gap-3">
          <Button onClick={() => nav(`/applications/new/submitted?job=${job.id}`)}>Send application</Button>
          <Button variant="secondary" onClick={() => setReview(false)}>
            Back
          </Button>
        </div>
      </div>
    );

  return (
    <div className="mx-auto max-w-xl">
      <Link to={`/jobs/${job.id}`} className="-my-2 inline-flex items-center gap-1.5 py-2 text-[14px] text-grey-600 hover:text-ink">
        <ArrowLeft size={15} /> {job.title}
      </Link>
      <h1 className="mt-6 text-[28px] font-semibold">Apply to {job.company}</h1>
      <p className="mt-1 text-grey-600">{job.title}</p>
      <form
        className="mt-8 space-y-8"
        onSubmit={(e) => {
          e.preventDefault();
          setReview(true);
        }}
      >
        <section>
          <h2 className="text-[15px] font-semibold">Resume</h2>
          {file ? (
            <div className="mt-3 flex items-center gap-3 rounded-md border border-grey-300 p-3">
              <FileText size={20} strokeWidth={1.5} className="text-grey-600" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium">{file}</p>
                <p className="text-[12px] text-grey-500">PDF, 184 KB, from your profile</p>
              </div>
              <button type="button" onClick={() => setFile(null)} className="py-2 text-[13px] text-grey-600 underline underline-offset-2 hover:text-ink">
                Replace
              </button>
            </div>
          ) : (
            <label className="mt-3 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-grey-400 px-4 py-8 text-center hover:border-ink">
              <Upload size={20} strokeWidth={1.5} />
              <span className="text-[14px] font-medium">Upload your resume</span>
              <span className="text-[13px] text-grey-500">PDF up to 5 MB</span>
              <input type="file" accept="application/pdf" className="sr-only" onChange={(e) => setFile(e.target.files?.[0]?.name ?? null)} />
            </label>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-[15px] font-semibold">About you</h2>
          <Field label="Full name">
            <Input defaultValue="Aarav Mehta" required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" hint="Verified">
              <Input value="aarav.mehta@iitm.ac.in" readOnly />
            </Field>
            <Field label="Phone" hint="Verified">
              <Input value="+91 98480 22314" readOnly className="tnum" />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
            <Field label="College or current company">
              <Input defaultValue="IIT Madras" required />
            </Field>
            <Field label="Graduation year">
              <Select defaultValue="2026">
                {[2023, 2024, 2025, 2026, 2027, 2028].map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="City">
            <Input defaultValue="Chennai" required />
          </Field>
          <Field label="LinkedIn or portfolio" optional>
            <Input defaultValue="linkedin.com/in/aaravmehta" />
          </Field>
          <Field label="Anything the team should know?" optional hint={`${note.length} of 300 characters`}>
            <Textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 300))} placeholder="Notice period, a project you're proud of, a link" />
          </Field>
        </section>

        <div className="flex gap-3 border-t border-grey-200 pt-6">
          <Button disabled={!file}>Review application</Button>
          <ButtonLink to={`/jobs/${job.id}`} variant="ghost">
            Cancel
          </ButtonLink>
        </div>
      </form>
    </div>
  );
}

export function Submitted() {
  const [params] = useSearchParams();
  const job = jobById(params.get("job") ?? "j-105");
  const due = new Date(NOW.getTime() + 48 * 3600_000).toISOString();
  return (
    <div className="mx-auto max-w-xl pt-6">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-paper">
        <Check size={20} strokeWidth={2.5} />
      </span>
      <h1 className="mt-6 text-[28px] font-semibold">Application sent</h1>
      <p className="mt-2 text-[15px] text-grey-700">
        {job.company} will reply to your application for {job.title} by{" "}
        <span className="tnum font-medium text-ink">{formatDateTime(due)}</span>. We'll email and text
        you at each step.
      </p>
      <div className="mt-8 flex gap-3">
        <ButtonLink to="/applications/a-5002">Track your status</ButtonLink>
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
  const list = applications.filter((a) => (tab === "closed" ? closed(a.status) : !closed(a.status)));
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
            {t} <span className="tnum text-grey-500">{applications.filter((a) => (t === "closed" ? closed(a.status) : !closed(a.status))).length}</span>
          </button>
        ))}
      </div>
      <ul className="divide-y divide-grey-200">
        {list.map((a) => {
          const job = jobById(a.jobId);
          const last = a.signals[a.signals.length - 1];
          const waiting = !a.firstReplyAt;
          return (
            <li key={a.id}>
              <Link to={`/applications/${a.id}`} className="grid gap-3 py-5 hover:bg-grey-50 sm:grid-cols-[1fr_200px_180px] sm:items-center sm:px-3">
                <div className="flex items-center gap-4">
                  <CompanyMark name={job.company} />
                  <div className="min-w-0">
                    <p className="font-medium">{job.title}</p>
                    <p className="text-[14px] text-grey-600">{job.company}</p>
                  </div>
                </div>
                <div className="pl-14 sm:pl-0">
                  <MiniProgress stage={a.stage} status={a.status} />
                  <p className="mt-1.5 text-[13px] text-grey-600">{STAGES.find((s) => s.key === a.stage)!.label}</p>
                </div>
                <div className="pl-14 sm:pl-0 sm:text-right">
                  <p className="text-[14px]">{last.text}</p>
                  <p className="tnum text-[13px] text-grey-500">
                    {waiting ? `Reply by ${formatDateTime(a.replyDueAt)}` : relative(last.at)}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function Tracker() {
  const { id } = useParams();
  const seed = applications.find((a) => a.id === id) ?? applications[0];
  const [app, setApp] = useState(seed);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const job = jobById(app.jobId);
  const isClosed = closed(app.status);
  const stageIdx = STAGES.findIndex((s) => s.key === app.stage);
  const late = !app.firstReplyAt && hoursFromNow(app.replyDueAt) < 0;

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/applications" className="-my-2 inline-flex items-center gap-1.5 py-2 text-[14px] text-grey-600 hover:text-ink">
        <ArrowLeft size={15} /> Applications
      </Link>

      <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <CompanyMark name={job.company} size={48} />
          <div>
            <h1 className="text-[28px] font-semibold">{job.title}</h1>
            <p className="tnum text-grey-600">
              {job.company}, applied {formatDateTime(app.appliedAt)}
            </p>
          </div>
        </div>
        <StatusChip status={app.status} />
      </div>

      <div className="mt-8 rounded-lg border border-grey-200">
        <div className="border-b border-grey-200 px-5 py-4 sm:px-6">
          {app.firstReplyAt ? (
            <p className="tnum text-[14px] text-grey-700">
              <Check size={14} strokeWidth={2.5} className="mr-1.5 inline -translate-y-px" />
              {job.company} replied {formatDate(app.firstReplyAt)}, {durationHours(app.appliedAt, app.firstReplyAt)} hours after you applied.
            </p>
          ) : late ? (
            <p className="text-[14px] text-bad">We're running late. You'll hear back shortly, and we've flagged this to the team.</p>
          ) : (
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p>
                <span className="text-[14px] text-grey-600">You'll hear back by </span>
                <span className="tnum font-display text-[22px] font-semibold">{formatDateTime(app.replyDueAt)}</span>
              </p>
              <span className="tnum text-[13px] text-grey-500">{relative(app.replyDueAt)}, within 48 hours of applying</span>
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
            <ActivityFeed signals={app.signals} />
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
          <section>
            <h2 className="text-[15px] font-semibold">What you sent</h2>
            <div className="mt-3 flex items-center gap-2.5 text-[14px]">
              <FileText size={16} strokeWidth={1.5} className="text-grey-600" />
              <span className="truncate">{app.resumeFile}</span>
            </div>
            <p className="mt-1 text-[13px] text-grey-500">Locked after the team viewed it</p>
          </section>
          {app.status === "withdrawn" && (
            <p className="text-[14px] text-grey-700">You withdrew this application. {job.company} has been told.</p>
          )}
          {!isClosed &&
            (confirmWithdraw ? (
              <div className="space-y-3">
                <p className="text-[14px] text-grey-700">Withdraw from {job.title}? You can't apply to this role again.</p>
                <div className="flex gap-2">
                  <Button
                    variant="danger"
                    className="h-9 px-4 text-[13px]"
                    onClick={() =>
                      setApp({ ...app, status: "withdrawn", signals: [...app.signals, { id: "w", kind: "decision", text: "You withdrew your application", at: NOW.toISOString() }] })
                    }
                  >
                    Withdraw
                  </Button>
                  <Button variant="ghost" className="h-9 px-4 text-[13px]" onClick={() => setConfirmWithdraw(false)}>
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
