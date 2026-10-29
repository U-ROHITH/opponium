import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, Columns3, ExternalLink, FileText, Mail, Phone, Rows3 } from "lucide-react";
import { ActivityFeed, SignalGlyph, SlaLabel, Stepper } from "../components/status";
import {
  Button,
  EmptyState,
  ErrorState,
  Field,
  FormError,
  Initials,
  Input,
  LoadingRows,
  LoadingText,
  PageHeader,
  Select,
  Textarea,
  cx,
} from "../components/ui";
import type { Application, Job, Member, SignalKind } from "../data/types";
import { STAGES, stageLabel } from "../data/stages";
import { ApiError, api, errorText } from "../lib/api";
import { useMe } from "../lib/auth";
import { useGet, usePoll } from "../lib/hooks";
import { slaState, type SlaState } from "../lib/sla";
import { formatDateTime, formatPhone, relative } from "../lib/time";

const slaFilters: { key: "all" | SlaState; label: string }[] = [
  { key: "all", label: "All" },
  { key: "overdue", label: "Overdue" },
  { key: "due_soon", label: "Due soon" },
  { key: "on_track", label: "On track" },
  { key: "replied", label: "Replied" },
];

const collegeLine = (a: Application) => [a.candidate.college, a.candidate.grad_year].filter(Boolean).join(", ");

function Segmented<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { key: T; label: string; count?: number }[] }) {
  return (
    <div className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-full border border-grey-200 p-1 [scrollbar-width:none]">
      {items.map((it) => (
        <button
          key={it.key}
          onClick={() => onChange(it.key)}
          className={cx("h-8 shrink-0 rounded-full px-3 text-[13px]", value === it.key ? "bg-ink text-paper" : "text-grey-700 hover:bg-grey-100")}
        >
          {it.label}
          {it.count !== undefined && <span className={cx("tnum ml-1.5", value === it.key ? "text-grey-300" : "text-grey-500")}>{it.count}</span>}
        </button>
      ))}
    </div>
  );
}

function Back({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className="-my-2 inline-flex items-center gap-1.5 py-2 text-[14px] text-grey-600 hover:text-ink">
      <ArrowLeft size={15} /> {children}
    </Link>
  );
}

export function Inbox() {
  const [filter, setFilter] = useState<"all" | SlaState>("all");
  const nav = useNavigate();
  const { data, error, loading, reload } = useGet<Application[]>("/api/team/inbox");
  usePoll(() => void reload(true), 30_000);
  const all = data ?? [];
  const rows = all.filter((a) => filter === "all" || slaState(a) === filter);
  const counts = (k: "all" | SlaState) => (k === "all" ? all.length : all.filter((a) => slaState(a) === k).length);
  const waiting = all.filter((a) => !a.first_reply_at).length;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Inbox"
        sub={
          !data
            ? "Everyone who applied to your jobs, sorted by who has waited longest."
            : waiting === 0
              ? "No one is waiting on a reply right now."
              : `${waiting} ${waiting === 1 ? "candidate is" : "candidates are"} waiting on a reply. The longest wait is at the top.`
        }
      />
      <div className="mt-8">
        <Segmented value={filter} onChange={setFilter} items={slaFilters.map((f) => ({ ...f, count: data ? counts(f.key) : undefined }))} />
      </div>

      {loading && !data ? (
        <LoadingRows className="mt-6" />
      ) : error ? (
        <ErrorState className="mt-6" error={error} onRetry={() => reload()} />
      ) : all.length === 0 ? (
        <EmptyState
          className="mt-6"
          title="No applications yet."
          body="When candidates apply to your open jobs, they show up here with a reply due time."
          action={
            <Link to="/r/jobs" className="py-2 text-[14px] font-medium underline underline-offset-2">
              See your jobs
            </Link>
          }
        />
      ) : (
        <>
          {/* table on wide screens */}
          {rows.length > 0 && (
            <div className="mt-6 hidden overflow-hidden rounded-lg border border-grey-200 md:block">
              <table className="w-full text-left text-[14px]">
                <thead className="border-b border-grey-200 bg-grey-50 text-[12px] text-grey-600">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Candidate</th>
                    <th className="px-4 py-2.5 font-medium">Job</th>
                    <th className="px-4 py-2.5 font-medium">Stage</th>
                    <th className="px-4 py-2.5 font-medium">Applied</th>
                    <th className="px-4 py-2.5 font-medium">Owner</th>
                    <th className="px-4 py-2.5 text-right font-medium">Reply</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-grey-200">
                  {rows.map((a) => (
                    <tr key={a.id} onClick={() => nav(`/r/applications/${a.id}`)} className="cursor-pointer hover:bg-grey-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Initials name={a.candidate.name} />
                          <div>
                            <Link to={`/r/applications/${a.id}`} className="font-medium hover:underline">
                              {a.candidate.name}
                            </Link>
                            <p className="text-[13px] text-grey-500">{collegeLine(a)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-grey-700">{a.job.title}</td>
                      <td className="px-4 py-3 text-grey-700">{a.stage_label || stageLabel(a.stage)}</td>
                      <td className="tnum px-4 py-3 text-grey-600">{relative(a.applied_at)}</td>
                      <td className="px-4 py-3 text-grey-700">{a.owner?.name || "Unassigned"}</td>
                      <td className="px-4 py-3 text-right">
                        <SlaLabel app={a} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* list on phones */}
          {rows.length > 0 && (
            <ul className="mt-6 divide-y divide-grey-200 border-y border-grey-200 md:hidden">
              {rows.map((a) => (
                <li key={a.id}>
                  <Link to={`/r/applications/${a.id}`} className="flex items-start gap-3 py-4">
                    <Initials name={a.candidate.name} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="truncate font-medium">{a.candidate.name}</p>
                        <SlaLabel app={a} className="shrink-0" />
                      </div>
                      <p className="truncate text-[13px] text-grey-600">{a.job.title}</p>
                      <p className="text-[13px] text-grey-500">{a.stage_label || stageLabel(a.stage)}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {rows.length === 0 && <p className="mt-10 text-center text-grey-500">Nothing here. No candidate in this view right now.</p>}
        </>
      )}
    </div>
  );
}

const newJobLink = (
  <Link to="/r/jobs/new" className="inline-flex h-10 items-center rounded-full bg-ink px-5 text-[14px] font-medium text-paper hover:bg-grey-800">
    New job
  </Link>
);

export function RecruiterJobs() {
  const { data, error, loading, reload } = useGet<Job[]>("/api/team/jobs");
  const jobs = data ?? [];
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Jobs" actions={newJobLink} />
      {loading && !data ? (
        <LoadingRows className="mt-8" rows={3} />
      ) : error ? (
        <ErrorState className="mt-8" error={error} onRetry={() => reload()} />
      ) : jobs.length === 0 ? (
        <EmptyState className="mt-8" title="No jobs yet." body="Post your first role and invited candidates can apply right away." />
      ) : (
        <ul className="mt-8 divide-y divide-grey-200 border-y border-grey-200">
          {jobs.map((j) => {
            const late = j.overdue ?? 0;
            return (
              <li key={j.id}>
                <Link to={`/r/jobs/${j.id}`} className="grid gap-4 py-5 hover:bg-grey-50 sm:px-3 md:grid-cols-[1fr_auto] md:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <p className="font-medium">{j.title}</p>
                      {j.status !== "open" && (
                        <span className="inline-flex h-5 items-center rounded-full border border-grey-300 px-2 text-[12px] capitalize text-grey-600">{j.status}</span>
                      )}
                    </div>
                    <p className="text-[14px] text-grey-600">{[j.team, j.location].filter(Boolean).join(", ") || j.type}</p>
                  </div>
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
                    {STAGES.map((s) => (
                      <div key={s.key} className="min-w-14">
                        <p className="tnum text-[15px] font-medium">{j.stage_counts?.[s.key] ?? 0}</p>
                        <p className="text-grey-500">{s.label.split(" ")[0]}</p>
                      </div>
                    ))}
                    {late > 0 && (
                      <div className="min-w-14 text-bad">
                        <p className="tnum text-[15px] font-medium">{late}</p>
                        <p>Overdue</p>
                      </div>
                    )}
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

function BoardCard({ a }: { a: Application }) {
  return (
    <Link to={`/r/applications/${a.id}`} className="block rounded-md border border-grey-200 bg-paper p-3 hover:border-grey-400">
      <div className="flex items-center gap-2.5">
        <Initials name={a.candidate.name} size={26} />
        <p className="truncate text-[14px] font-medium">{a.candidate.name}</p>
      </div>
      <p className="mt-2 truncate text-[13px] text-grey-600">{a.candidate.college}</p>
      <div className="mt-3 flex items-center justify-between">
        <span className="tnum text-[12px] text-grey-500">{relative(a.applied_at)}</span>
        <SlaLabel app={a} className="text-[12px]" />
      </div>
    </Link>
  );
}

export function JobPipeline() {
  const { id } = useParams();
  const { data, error, reload } = useGet<{ job: Job; applications: Application[] }>(`/api/team/jobs/${id}`);
  usePoll(() => void reload(true), 30_000);
  const [view, setView] = useState<"board" | "table">("board");
  if (error) return <ErrorState error={error} onRetry={() => reload()} />;
  if (!data) return <LoadingText />;
  const { job, applications: apps } = data;
  return (
    <div className="mx-auto max-w-7xl">
      <Back to="/r/jobs">Jobs</Back>
      <div className="mt-4">
        <PageHeader
          title={job.title}
          sub={`${apps.length} ${apps.length === 1 ? "candidate" : "candidates"}${job.location ? `, ${job.location}` : ""}${job.status !== "open" ? `, ${job.status}` : ""}`}
          actions={
            <div className="flex rounded-full border border-grey-200 p-1">
              {(
                [
                  ["board", Columns3, "Board"],
                  ["table", Rows3, "Table"],
                ] as const
              ).map(([k, Icon, label]) => (
                <button
                  key={k}
                  onClick={() => setView(k)}
                  className={cx("inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px]", view === k ? "bg-ink text-paper" : "text-grey-700 hover:bg-grey-100")}
                >
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>
          }
        />
      </div>
      {apps.length === 0 ? (
        <EmptyState
          className="mt-8"
          title="No applicants yet."
          body={job.status === "open" ? "Candidates see this role on their jobs list. New applicants land in Resume screen." : "This job isn't published, so candidates can't see it yet."}
        />
      ) : view === "board" ? (
        <div className="-mx-4 mt-8 overflow-x-auto px-4 pb-4 sm:-mx-8 sm:px-8">
          <div className="grid min-w-[1000px] grid-cols-5 gap-3">
            {STAGES.map((s) => {
              const col = apps.filter((a) => a.stage === s.key);
              return (
                <section key={s.key} className="rounded-lg bg-grey-50 p-2">
                  <h2 className="flex items-center justify-between px-1.5 pb-2 pt-1 font-sans text-[13px] font-medium tracking-normal">
                    {s.label}
                    <span className="tnum text-grey-500">{col.length}</span>
                  </h2>
                  <div className="space-y-2">
                    {col.map((a) => (
                      <BoardCard key={a.id} a={a} />
                    ))}
                    {col.length === 0 && <p className="px-1.5 py-4 text-[13px] text-grey-400">No one here</p>}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-lg border border-grey-200">
          <table className="w-full min-w-[640px] text-left text-[14px]">
            <thead className="border-b border-grey-200 bg-grey-50 text-[12px] text-grey-600">
              <tr>
                <th className="px-4 py-2.5 font-medium">Candidate</th>
                <th className="px-4 py-2.5 font-medium">Stage</th>
                <th className="px-4 py-2.5 font-medium">Last update</th>
                <th className="px-4 py-2.5 text-right font-medium">Reply</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-grey-200">
              {apps.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3">
                    <Link to={`/r/applications/${a.id}`} className="font-medium hover:underline">
                      {a.candidate.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-grey-700">{a.stage_label || stageLabel(a.stage)}</td>
                  <td className="px-4 py-3 text-grey-700">{a.events[a.events.length - 1]?.text}</td>
                  <td className="px-4 py-3 text-right">
                    <SlaLabel app={a} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const presets: { kind: SignalKind; text: string }[] = [
  { kind: "viewed", text: "Your application was viewed" },
  { kind: "reviewing_resume", text: "Reviewing your resume" },
  { kind: "reviewing_profile", text: "Reviewing your profile" },
  { kind: "interview_scheduled", text: "Interview scheduled" },
];

type ResumeLink = { url: string; name: string };

export function ReviewApplicant() {
  const { id } = useParams();
  const { data: app, error, reload, setData } = useGet<Application>(`/api/team/applications/${id}`);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("skills");
  const [when, setWhen] = useState("");
  const [askWhen, setAskWhen] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [resume, setResume] = useState<ResumeLink | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setResume(null);
    setResumeError(null);
    api
      .get<ResumeLink>(`/api/applications/${id}/resume`)
      .then((r) => live && setResume(r))
      .catch((e) => live && setResumeError(errorText(e)));
    return () => {
      live = false;
    };
  }, [id]);

  if (error instanceof ApiError && error.status === 404)
    return (
      <div className="mx-auto max-w-xl">
        <Back to="/r/inbox">Inbox</Back>
        <h1 className="mt-6 text-[28px] font-semibold">We couldn't find that application</h1>
        <p className="mt-2 text-grey-600">It may belong to another company, or the candidate withdrew.</p>
      </div>
    );
  if (error) return <ErrorState error={error} onRetry={() => reload()} />;
  if (!app) return <LoadingText />;

  const idx = Math.max(0, STAGES.findIndex((s) => s.key === app.stage));
  const first = app.candidate.name.split(" ")[0];
  const decided = app.status === "declined" || app.status === "offer" || app.status === "withdrawn";
  const nextStage = STAGES[idx + 1];

  const act = async (key: string, path: string, body?: unknown) => {
    setBusy(key);
    setActionError(null);
    try {
      setData(await api.post<Application>(`/api/team/applications/${app.id}/${path}`, body));
      return true;
    } catch (e) {
      setActionError(errorText(e));
      return false;
    } finally {
      setBusy(null);
    }
  };

  const openResume = async () => {
    const w = window.open("", "_blank");
    try {
      const r = await api.get<ResumeLink>(`/api/applications/${app.id}/resume`);
      setResume(r);
      if (w) w.location.href = r.url;
      else window.location.href = r.url;
    } catch (e) {
      w?.close();
      setResumeError(errorText(e));
    }
  };

  const card = "rounded-lg border border-grey-200 p-5";
  const h2 = "font-sans text-[14px] font-semibold tracking-normal";

  return (
    <div className="mx-auto max-w-7xl">
      <Back to="/r/inbox">Inbox</Back>

      <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <Initials name={app.candidate.name} size={48} />
          <div className="min-w-0">
            <h1 className="text-[28px] font-semibold">{app.candidate.name}</h1>
            <p className="text-grey-600">
              {app.job.title}, applied {relative(app.applied_at)}
            </p>
          </div>
        </div>
        <SlaLabel app={app} />
      </div>

      <div className="mt-6 rounded-lg border border-grey-200 p-5">
        <Stepper stage={app.stage} status={app.status} />
      </div>

      <div className="mt-8 flex flex-col gap-6 lg:grid lg:grid-cols-[1fr_380px] lg:items-start">
        <section className={cx(card, "lg:col-start-2 lg:row-start-1")}>
          <h2 className={h2}>Tell {first} what's happening</h2>
          <p className="mt-1 text-[13px] text-grey-500">They see this right away, by email and in their tracker.</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {presets.map((p) => {
              const sent = app.events.some((s) => s.kind === p.kind);
              const off = sent || decided || p.kind === "viewed" || busy !== null;
              return (
                <button
                  key={p.kind}
                  disabled={off}
                  onClick={() => {
                    if (p.kind === "interview_scheduled") setAskWhen(true);
                    else void act(p.kind, "signal", { kind: p.kind });
                  }}
                  className={cx(
                    "flex min-h-11 items-center gap-2 rounded-md border px-3 py-2 text-left text-[13px] leading-tight",
                    sent || decided ? "border-grey-200 text-grey-400" : off ? "border-grey-200 text-grey-500" : "border-grey-300 hover:border-ink",
                    askWhen && p.kind === "interview_scheduled" && "border-ink",
                  )}
                >
                  {sent ? <Check size={15} strokeWidth={2} className="shrink-0" /> : <SignalGlyph kind={p.kind} />}
                  <span>{p.kind === "viewed" ? "Viewed" : busy === p.kind ? "Sending" : p.text}</span>
                </button>
              );
            })}
          </div>
          {askWhen && !decided && !app.events.some((s) => s.kind === "interview_scheduled") && (
            <form
              className="mt-3 space-y-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (await act("interview_scheduled", "signal", { kind: "interview_scheduled", when: when.trim() || undefined })) {
                  setAskWhen(false);
                  setWhen("");
                }
              }}
            >
              <Field label="When" optional>
                <Input value={when} onChange={(e) => setWhen(e.target.value)} placeholder="Fri 31 Oct, 11:00" maxLength={60} />
              </Field>
              <div className="flex gap-2">
                <Button className="h-9 px-4 text-[13px]" disabled={busy !== null}>
                  {busy === "interview_scheduled" ? "Sending" : "Send update"}
                </Button>
                <Button type="button" variant="ghost" className="h-9 px-4 text-[13px]" onClick={() => setAskWhen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
          <div className="mt-4 flex flex-col gap-2 border-t border-grey-200 pt-4">
            {decided ? (
              <p className="text-[14px] text-grey-600">
                {app.status === "declined"
                  ? "Decision shared: not moving forward."
                  : app.status === "withdrawn"
                    ? `${first} withdrew this application.`
                    : "Offer stage. Share the offer details by email."}
              </p>
            ) : confirmReject ? (
              <div className="space-y-3">
                <Field label="Reason, only your team sees this">
                  <Select value={reason} onChange={(e) => setReason(e.target.value)}>
                    <option value="skills">Skills don't match the role</option>
                    <option value="experience">Not enough experience yet</option>
                    <option value="location">Location or availability</option>
                    <option value="filled">Role filled</option>
                  </Select>
                </Field>
                <p className="text-[13px] text-grey-600">{first} will see: “The team decided not to move forward with your application.”</p>
                <div className="flex gap-2">
                  <Button
                    variant="danger"
                    disabled={busy !== null}
                    onClick={async () => {
                      if (await act("decline", "decline", { reason })) setConfirmReject(false);
                    }}
                  >
                    {busy === "decline" ? "Sending" : "Send decision"}
                  </Button>
                  <Button variant="ghost" onClick={() => setConfirmReject(false)} disabled={busy !== null}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {nextStage && (
                  <Button onClick={() => act("advance", "advance")} disabled={busy !== null}>
                    {busy === "advance" ? "Moving" : nextStage.key === "decision" ? "Move to decision: offer" : `Move to ${nextStage.label}`}
                  </Button>
                )}
                <Button variant="secondary" onClick={() => setConfirmReject(true)} disabled={busy !== null}>
                  Not moving forward
                </Button>
              </>
            )}
            {actionError && <FormError>{actionError}</FormError>}
          </div>
        </section>

        <section className="min-w-0 lg:col-start-1 lg:row-span-4 lg:row-start-1">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-[18px] font-semibold">Resume</h2>
            <button onClick={openResume} className="inline-flex min-w-0 items-center gap-1.5 py-2 text-[13px] text-grey-700 hover:text-ink">
              <ExternalLink size={14} className="shrink-0" /> <span className="truncate">{app.resume.name || "Open resume"}</span>
            </button>
          </div>
          {resume ? (
            <>
              <iframe title={`Resume of ${app.candidate.name}`} src={resume.url} className="mt-3 hidden h-[80vh] min-h-[640px] w-full rounded-lg border border-grey-200 lg:block" />
              <button onClick={openResume} className="mt-3 flex w-full items-center gap-3 rounded-lg border border-grey-200 p-4 text-left hover:border-grey-400 lg:hidden">
                <FileText size={20} strokeWidth={1.5} className="shrink-0 text-grey-600" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium">{app.resume.name}</span>
                  <span className="block text-[13px] text-grey-500">Opens in a new tab</span>
                </span>
              </button>
            </>
          ) : (
            <div className="mt-3 rounded-lg border border-grey-200 p-6 text-[14px] text-grey-600">
              {resumeError ? (
                <>
                  <p>{resumeError}</p>
                  <p className="mt-1 text-[13px] text-grey-500">{app.resume.name}</p>
                </>
              ) : (
                <p>Loading resume</p>
              )}
            </div>
          )}
        </section>

        <section className={cx(card, "lg:col-start-2")}>
          <h2 className={h2}>Details</h2>
          <dl className="mt-3 space-y-2.5 text-[14px]">
            <div className="flex items-center gap-2.5">
              <Mail size={14} className="shrink-0 text-grey-500" />
              <a href={`mailto:${app.candidate.email}`} className="truncate hover:underline">
                {app.candidate.email}
              </a>
            </div>
            {app.candidate.phone && (
              <div className="flex items-center gap-2.5">
                <Phone size={14} className="shrink-0 text-grey-500" />
                <a href={`tel:${app.candidate.phone}`} className="tnum hover:underline">
                  {formatPhone(app.candidate.phone)}
                </a>
              </div>
            )}
            {app.candidate.linkedin && (
              <div className="flex items-center gap-2.5">
                <ExternalLink size={14} className="shrink-0 text-grey-500" />
                <a
                  href={/^https?:\/\//.test(app.candidate.linkedin) ? app.candidate.linkedin : `https://${app.candidate.linkedin}`}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate hover:underline"
                >
                  {app.candidate.linkedin}
                </a>
              </div>
            )}
          </dl>
          <p className="mt-3 text-[13px] text-grey-500">
            {[collegeLine(app), app.candidate.city].filter(Boolean).join(". ")}
          </p>
          {app.candidate.note && <p className="mt-4 border-t border-grey-200 pt-3 text-[14px] text-grey-700">“{app.candidate.note}”</p>}
        </section>

        <section className={cx(card, "lg:col-start-2")}>
          <h2 className={h2}>Notes</h2>
          <p className="mt-1 text-[13px] text-grey-500">Only your team sees these.</p>
          {(app.notes ?? []).length > 0 && (
            <ul className="mt-3 space-y-3">
              {(app.notes ?? []).map((n) => (
                <li key={n.id} className="text-[14px]">
                  <p className="whitespace-pre-line">{n.text}</p>
                  <p className="tnum text-[12px] text-grey-500">
                    {n.author}, {formatDateTime(n.at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <form
            className="mt-3"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!note.trim()) return;
              setBusy("note");
              setNoteError(null);
              try {
                setData(await api.post<Application>(`/api/team/applications/${app.id}/notes`, { text: note.trim() }));
                setNote("");
              } catch (err) {
                setNoteError(errorText(err));
              } finally {
                setBusy(null);
              }
            }}
          >
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note" className="min-h-16" />
            {noteError && (
              <div className="mt-2">
                <FormError>{noteError}</FormError>
              </div>
            )}
            <Button variant="secondary" className="mt-2 h-9 px-4 text-[13px]" disabled={!note.trim() || busy !== null}>
              {busy === "note" ? "Saving" : "Save note"}
            </Button>
          </form>
        </section>

        <section className="lg:col-start-2">
          <h2 className={h2}>What {first} sees</h2>
          <div className="mt-4">
            <ActivityFeed signals={app.events} />
          </div>
        </section>
      </div>
    </div>
  );
}

const roleName = (r: string) => (r === "hiring_manager" ? "Hiring manager" : r === "recruiter" ? "Recruiter" : r === "admin" ? "Admin" : "Candidate");

export function Team() {
  const me = useMe();
  const { data, error, loading, reload, setData } = useGet<Member[]>("/api/team/members");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("recruiter");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const domain = me.email.split("@")[1] ?? "company.com";
  const company = me.company?.name ?? "your company";
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Team" sub={`People at ${company} who can review candidates.`} />
      <form
        className="mt-8 flex flex-col gap-3 rounded-lg border border-grey-200 p-5 sm:flex-row sm:flex-wrap sm:items-end"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setFormError(null);
          setSentTo(null);
          try {
            setData(await api.post<Member[]>("/api/team/members", { email: email.trim(), role }));
            setSentTo(email.trim());
            setEmail("");
          } catch (err) {
            setFormError(errorText(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="flex-1">
          <Field label="Invite by email">
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={`name@${domain}`} />
          </Field>
        </div>
        <div className="sm:w-44">
          <Field label="Role">
            <Select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="recruiter">Recruiter</option>
              <option value="hiring_manager">Hiring manager</option>
            </Select>
          </Field>
        </div>
        <Button disabled={busy}>{busy ? "Sending" : "Send invite"}</Button>
        {(formError || sentTo) && (
          <div className="sm:basis-full">
            {formError ? <FormError>{formError}</FormError> : <p className="text-[14px] text-grey-700">Invite sent to {sentTo}. It lasts 7 days.</p>}
          </div>
        )}
      </form>
      {loading && !data ? (
        <LoadingRows className="mt-8" rows={3} />
      ) : error ? (
        <ErrorState className="mt-8" error={error} onRetry={() => reload()} />
      ) : (
        <ul className="mt-8 divide-y divide-grey-200 border-y border-grey-200">
          {(data ?? []).map((m) => (
            <li key={m.id} className="flex items-center gap-3 py-4">
              <Initials name={m.name || m.email.slice(0, 1).toUpperCase()} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{m.name || m.email}</p>
                {m.name && <p className="truncate text-[13px] text-grey-500">{m.email}</p>}
              </div>
              <span className="hidden text-[14px] text-grey-700 sm:block">{roleName(m.role)}</span>
              <span className={cx("w-24 text-right text-[13px]", m.status === "active" ? "text-grey-500" : "font-medium")}>
                {m.status === "active" ? "Active" : "Invite sent"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function NewJob() {
  const nav = useNavigate();
  const [form, setForm] = useState({ title: "", team: "", type: "Full-time", location: "", salary: "", summary: "", responsibilities: "", requirements: "" });
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState<"publish" | "draft" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  const save = async (draft: boolean) => {
    setTried(true);
    if (!form.title.trim()) return;
    setBusy(draft ? "draft" : "publish");
    setError(null);
    try {
      const job = await api.post<Job>("/api/team/jobs", { ...form, title: form.title.trim(), draft });
      nav(`/r/jobs/${job.id}`);
    } catch (e) {
      setError(errorText(e));
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Back to="/r/jobs">Jobs</Back>
      <h1 className="mt-6 text-[28px] font-semibold">New job</h1>
      <p className="mt-1 text-grey-600">Candidates see this exactly as written. Every applicant must hear back within 48 hours.</p>
      <form
        noValidate
        className="mt-8 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          void save(false);
        }}
      >
        <Field label="Title">
          <Input value={form.title} onChange={set("title")} placeholder="Frontend Engineer" className={tried && !form.title.trim() ? "border-bad" : ""} />
          {tried && !form.title.trim() && <span className="mt-1.5 block text-[13px] text-bad">Add a job title. Candidates see it first.</span>}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Team">
            <Input value={form.team} onChange={set("team")} placeholder="Product Engineering" />
          </Field>
          <Field label="Type">
            <Select value={form.type} onChange={set("type")}>
              <option>Full-time</option>
              <option>Internship</option>
              <option>Contract</option>
            </Select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Location">
            <Input value={form.location} onChange={set("location")} placeholder="Bengaluru, hybrid" />
          </Field>
          <Field label="Pay range" optional>
            <Input value={form.salary} onChange={set("salary")} placeholder="₹18L to ₹26L" />
          </Field>
        </div>
        <Field label="Summary" hint="Two or three sentences. What the person will actually do.">
          <Textarea value={form.summary} onChange={set("summary")} />
        </Field>
        <Field label="What they'll do" optional hint="One per line.">
          <Textarea value={form.responsibilities} onChange={set("responsibilities")} />
        </Field>
        <Field label="Requirements" hint="One per line.">
          <Textarea value={form.requirements} onChange={set("requirements")} />
        </Field>
        <FormError>{error}</FormError>
        <div className="flex gap-3 border-t border-grey-200 pt-6">
          <Button disabled={busy !== null}>{busy === "publish" ? "Publishing" : "Publish job"}</Button>
          <Button type="button" variant="secondary" disabled={busy !== null} onClick={() => save(true)}>
            {busy === "draft" ? "Saving" : "Save draft"}
          </Button>
        </div>
      </form>
    </div>
  );
}
