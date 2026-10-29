import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, Columns3, Download, ExternalLink, Mail, Phone, Rows3 } from "lucide-react";
import { ActivityFeed, SignalGlyph, SlaLabel, Stepper } from "../components/status";
import { Button, Field, Initials, Input, PageHeader, Select, Textarea, cx } from "../components/ui";
import { jobById, jobs, NOW, pipeline, STAGES } from "../data/mock";
import type { Application, Signal, SignalKind, StageKey } from "../data/types";
import { slaState, type SlaState } from "../lib/sla";
import { formatDateTime, relative } from "../lib/time";

const stageLabel = (k: StageKey) => STAGES.find((s) => s.key === k)!.label;

const slaFilters: { key: "all" | SlaState; label: string }[] = [
  { key: "all", label: "All" },
  { key: "overdue", label: "Overdue" },
  { key: "due_soon", label: "Due soon" },
  { key: "on_track", label: "On track" },
  { key: "replied", label: "Replied" },
];

const slaOrder: Record<SlaState, number> = { overdue: 0, due_soon: 1, on_track: 2, replied: 3 };

function Segmented<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { key: T; label: string; count?: number }[] }) {
  return (
    <div className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-full border border-grey-200 p-1 [scrollbar-width:none]">
      {items.map((it) => (
        <button
          key={it.key}
          onClick={() => onChange(it.key)}
          className={cx(
            "h-8 shrink-0 rounded-full px-3 text-[13px]",
            value === it.key ? "bg-ink text-paper" : "text-grey-700 hover:bg-grey-100",
          )}
        >
          {it.label}
          {it.count !== undefined && <span className={cx("tnum ml-1.5", value === it.key ? "text-grey-300" : "text-grey-500")}>{it.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Inbox() {
  const [filter, setFilter] = useState<"all" | SlaState>("all");
  const nav = useNavigate();
  const sorted = useMemo(
    () => [...pipeline].sort((a, b) => slaOrder[slaState(a)] - slaOrder[slaState(b)] || a.replyDueAt.localeCompare(b.replyDueAt)),
    [],
  );
  const rows = sorted.filter((a) => filter === "all" || slaState(a) === filter);
  const counts = (k: "all" | SlaState) => (k === "all" ? pipeline.length : pipeline.filter((a) => slaState(a) === k).length);
  const waiting = pipeline.filter((a) => !a.firstReplyAt).length;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Inbox" sub={`${waiting} candidates are waiting on a reply. The longest wait is at the top.`} />
      <div className="mt-8">
        <Segmented value={filter} onChange={setFilter} items={slaFilters.map((f) => ({ ...f, count: counts(f.key) }))} />
      </div>

      {/* table on wide screens */}
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
                      <p className="text-[13px] text-grey-500">
                        {a.candidate.college}, {a.candidate.gradYear}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-grey-700">{jobById(a.jobId).title}</td>
                <td className="px-4 py-3 text-grey-700">{stageLabel(a.stage)}</td>
                <td className="tnum px-4 py-3 text-grey-600">{relative(a.appliedAt)}</td>
                <td className="px-4 py-3 text-grey-700">{a.owner}</td>
                <td className="px-4 py-3 text-right">
                  <SlaLabel app={a} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* list on phones */}
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
                <p className="truncate text-[13px] text-grey-600">{jobById(a.jobId).title}</p>
                <p className="text-[13px] text-grey-500">{stageLabel(a.stage)}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {rows.length === 0 && <p className="mt-10 text-center text-grey-500">Nothing here. Every candidate in this view has a reply.</p>}
    </div>
  );
}

export function RecruiterJobs() {
  const mine = jobs.filter((j) => j.company === "Kite Labs");
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Jobs" actions={<Link to="/r/jobs/new" className="inline-flex h-10 items-center rounded-full bg-ink px-5 text-[14px] font-medium text-paper hover:bg-grey-800">New job</Link>} />
      <ul className="mt-8 divide-y divide-grey-200 border-y border-grey-200">
        {mine.map((j) => {
          const apps = pipeline.filter((a) => a.jobId === j.id);
          const late = apps.filter((a) => slaState(a) === "overdue").length;
          return (
            <li key={j.id}>
              <Link to={`/r/jobs/${j.id}`} className="grid gap-4 py-5 hover:bg-grey-50 sm:px-3 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <p className="font-medium">{j.title}</p>
                  <p className="text-[14px] text-grey-600">
                    {j.team}, {j.location}
                  </p>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
                  {STAGES.map((s) => (
                    <div key={s.key} className="min-w-14">
                      <p className="tnum text-[15px] font-medium">{apps.filter((a) => a.stage === s.key).length}</p>
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
        <span className="tnum text-[12px] text-grey-500">{relative(a.appliedAt)}</span>
        <SlaLabel app={a} className="text-[12px]" />
      </div>
    </Link>
  );
}

export function JobPipeline() {
  const { id } = useParams();
  const job = jobById(id!);
  const [view, setView] = useState<"board" | "table">("board");
  const apps = pipeline.filter((a) => a.jobId === job.id);
  return (
    <div className="mx-auto max-w-7xl">
      <Link to="/r/jobs" className="-my-2 inline-flex items-center gap-1.5 py-2 text-[14px] text-grey-600 hover:text-ink">
        <ArrowLeft size={15} /> Jobs
      </Link>
      <div className="mt-4">
        <PageHeader
          title={job.title}
          sub={`${apps.length} candidates, ${job.location}`}
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
      {view === "board" ? (
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
                  <td className="px-4 py-3 text-grey-700">{stageLabel(a.stage)}</td>
                  <td className="px-4 py-3 text-grey-700">{a.signals[a.signals.length - 1].text}</td>
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

export function ReviewApplicant() {
  const { id } = useParams();
  const initial = pipeline.find((a) => a.id === id) ?? pipeline[0];
  const job = jobById(initial.jobId);
  const [app, setApp] = useState<Application>(initial);
  const [note, setNote] = useState("");
  const [notes, setNotes] = useState<{ text: string; at: string }[]>([
    { text: "Strong React project on GitHub. Check state management depth in HR round.", at: initial.appliedAt },
  ]);
  const [confirmReject, setConfirmReject] = useState(false);
  const idx = STAGES.findIndex((s) => s.key === app.stage);
  const first = app.candidate.name.split(" ")[0];
  const decided = app.status === "declined" || app.status === "offer";

  // Sample data runs on a fixed clock, so new events use it too.
  const push = (s: Omit<Signal, "id" | "at">, patch: Partial<Application> = {}) => {
    const at = NOW.toISOString();
    setApp((prev) => ({
      ...prev,
      ...patch,
      firstReplyAt: prev.firstReplyAt ?? (s.kind !== "viewed" ? at : undefined),
      signals: [...prev.signals, { ...s, id: String(prev.signals.length + 1), at }],
    }));
  };

  const advance = () => {
    const next = STAGES[idx + 1];
    if (!next) return;
    push(
      { kind: "step_completed", text: `Step completed: ${STAGES[idx].label}` },
      { stage: next.key, status: next.key === "decision" ? "offer" : next.key === "hr" || next.key === "manager" ? "interviewing" : "in_review" },
    );
  };

  const card = "rounded-lg border border-grey-200 p-5";
  const h2 = "font-sans text-[14px] font-semibold tracking-normal";

  return (
    <div className="mx-auto max-w-7xl">
      <Link to="/r/inbox" className="-my-2 inline-flex items-center gap-1.5 py-2 text-[14px] text-grey-600 hover:text-ink">
        <ArrowLeft size={15} /> Inbox
      </Link>

      <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex items-center gap-4">
          <Initials name={app.candidate.name} size={48} />
          <div>
            <h1 className="text-[28px] font-semibold">{app.candidate.name}</h1>
            <p className="text-grey-600">
              {job.title}, applied {relative(app.appliedAt)}
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
              const sent = app.signals.some((s) => s.kind === p.kind);
              return (
                <button
                  key={p.kind}
                  disabled={sent || decided}
                  onClick={() => push(p)}
                  className={cx(
                    "flex min-h-11 items-center gap-2 rounded-md border px-3 py-2 text-left text-[13px] leading-tight",
                    sent || decided ? "border-grey-200 text-grey-400" : "border-grey-300 hover:border-ink",
                  )}
                >
                  {sent ? <Check size={15} strokeWidth={2} className="shrink-0" /> : <SignalGlyph kind={p.kind} />}
                  <span>{p.kind === "viewed" ? "Viewed" : p.text}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex flex-col gap-2 border-t border-grey-200 pt-4">
            {decided ? (
              <p className="text-[14px] text-grey-600">
                {app.status === "declined" ? "Decision shared: not moving forward." : "Offer stage. Share the offer details by email."}
              </p>
            ) : confirmReject ? (
              <div className="space-y-3">
                <Field label="Reason, only your team sees this">
                  <Select defaultValue="skills">
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
                    onClick={() => {
                      push({ kind: "decision", text: "Decision shared" }, { status: "declined" });
                      setConfirmReject(false);
                    }}
                  >
                    Send decision
                  </Button>
                  <Button variant="ghost" onClick={() => setConfirmReject(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <Button onClick={advance}>{STAGES[idx + 1]?.key === "decision" ? "Move to decision: offer" : `Move to ${STAGES[idx + 1].label}`}</Button>
                <Button variant="secondary" onClick={() => setConfirmReject(true)}>
                  Not moving forward
                </Button>
              </>
            )}
          </div>
        </section>

        <section className="lg:col-start-1 lg:row-span-4 lg:row-start-1">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-[18px] font-semibold">Resume</h2>
            <button className="inline-flex min-w-0 items-center gap-1.5 py-2 text-[13px] text-grey-700 hover:text-ink">
              <Download size={14} className="shrink-0" /> <span className="truncate">{app.resumeFile}</span>
            </button>
          </div>
          <div className="mt-3 rounded-lg border border-grey-200 p-6 sm:p-10">
            <p className="font-display text-[22px] font-semibold">{app.candidate.name}</p>
            <p className="text-[12px] text-grey-600">
              {app.candidate.email} | {app.candidate.phone} | {app.candidate.city}
            </p>
            <ResumeSection title="Education">
              <p className="font-medium">{app.candidate.college}</p>
              <p className="text-grey-600">B.Tech, Computer Science, {app.candidate.gradYear}. CGPA 8.4</p>
            </ResumeSection>
            <ResumeSection title="Experience">
              <p className="font-medium">Software Intern, Zeta</p>
              <p className="text-grey-600">May to July 2025</p>
              <ul className="mt-1 list-disc pl-4 text-grey-700">
                <li>Rebuilt the card controls screen in React, cutting load time from 2.1s to 0.8s</li>
                <li>Wrote 40 component tests and added them to CI</li>
              </ul>
            </ResumeSection>
            <ResumeSection title="Projects">
              <p className="font-medium">Hostel mess feedback app</p>
              <ul className="mt-1 list-disc pl-4 text-grey-700">
                <li>React and Firebase app used by 1,200 students for daily menu ratings</li>
              </ul>
            </ResumeSection>
            <ResumeSection title="Skills">
              <p className="text-grey-700">TypeScript, React, Node.js, PostgreSQL, Figma</p>
            </ResumeSection>
          </div>
        </section>

        <section className={cx(card, "lg:col-start-2")}>
          <h2 className={h2}>Details</h2>
          <dl className="mt-3 space-y-2.5 text-[14px]">
            <div className="flex items-center gap-2.5">
              <Mail size={14} className="shrink-0 text-grey-500" />
              <span className="truncate">{app.candidate.email}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Phone size={14} className="shrink-0 text-grey-500" />
              <span className="tnum">{app.candidate.phone}</span>
            </div>
            {app.candidate.linkedin && (
              <div className="flex items-center gap-2.5">
                <ExternalLink size={14} className="shrink-0 text-grey-500" />
                <span className="truncate">{app.candidate.linkedin}</span>
              </div>
            )}
          </dl>
          {app.candidate.note && <p className="mt-4 border-t border-grey-200 pt-3 text-[14px] text-grey-700">“{app.candidate.note}”</p>}
        </section>

        <section className={cx(card, "lg:col-start-2")}>
          <h2 className={h2}>Notes</h2>
          <p className="mt-1 text-[13px] text-grey-500">Only your team sees these.</p>
          <ul className="mt-3 space-y-3">
            {notes.map((n, i) => (
              <li key={i} className="text-[14px]">
                <p>{n.text}</p>
                <p className="tnum text-[12px] text-grey-500">Priya Nair, {formatDateTime(n.at)}</p>
              </li>
            ))}
          </ul>
          <form
            className="mt-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!note.trim()) return;
              setNotes([...notes, { text: note.trim(), at: NOW.toISOString() }]);
              setNote("");
            }}
          >
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note" className="min-h-16" />
            <Button variant="secondary" className="mt-2 h-9 px-4 text-[13px]" disabled={!note.trim()}>
              Save note
            </Button>
          </form>
        </section>

        <section className="lg:col-start-2">
          <h2 className={h2}>What {first} sees</h2>
          <div className="mt-4">
            <ActivityFeed signals={app.signals} />
          </div>
        </section>
      </div>
    </div>
  );
}

function ResumeSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 text-[13px]">
      <h3 className="border-b border-grey-300 pb-1 font-sans text-[12px] font-semibold tracking-normal text-grey-800">{title}</h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

export function Team() {
  const [sent, setSent] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const members = [
    ["Priya Nair", "priya@kitelabs.in", "Recruiter", "Active"],
    ["Rahul Iyer", "rahul@kitelabs.in", "Recruiter", "Active"],
    ["Sameer Joshi", "sameer@kitelabs.in", "Hiring manager", "Active"],
  ];
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Team" sub="People at Kite Labs who can review candidates." />
      <form
        className="mt-8 flex flex-col gap-3 rounded-lg border border-grey-200 p-5 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          setSent([...sent, email]);
          setEmail("");
        }}
      >
        <div className="flex-1">
          <Field label="Invite by email">
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@kitelabs.in" />
          </Field>
        </div>
        <div className="sm:w-44">
          <Field label="Role">
            <Select>
              <option>Recruiter</option>
              <option>Hiring manager</option>
            </Select>
          </Field>
        </div>
        <Button>Send invite</Button>
      </form>
      <ul className="mt-8 divide-y divide-grey-200 border-y border-grey-200">
        {[...members, ...sent.map((e) => [e, e, "Recruiter", "Invite sent"])].map(([n, e, r, s]) => (
          <li key={e} className="flex items-center gap-3 py-4">
            <Initials name={n === e ? e.slice(0, 1).toUpperCase() : n} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{n}</p>
              {n !== e && <p className="truncate text-[13px] text-grey-500">{e}</p>}
            </div>
            <span className="hidden text-[14px] text-grey-700 sm:block">{r}</span>
            <span className={cx("w-24 text-right text-[13px]", s === "Active" ? "text-grey-500" : "font-medium")}>{s}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function NewJob() {
  const nav = useNavigate();
  const [title, setTitle] = useState("");
  const [tried, setTried] = useState(false);
  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/r/jobs" className="-my-2 inline-flex items-center gap-1.5 py-2 text-[14px] text-grey-600 hover:text-ink">
        <ArrowLeft size={15} /> Jobs
      </Link>
      <h1 className="mt-6 text-[28px] font-semibold">New job</h1>
      <p className="mt-1 text-grey-600">Candidates see this exactly as written. Every applicant must hear back within 40 hours.</p>
      <form
        noValidate
        className="mt-8 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          setTried(true);
          if (title.trim()) nav("/r/jobs");
        }}
      >
        <Field label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Frontend Engineer" className={tried && !title.trim() ? "border-bad" : ""} />
          {tried && !title.trim() && <span className="mt-1.5 block text-[13px] text-bad">Add a job title. Candidates see it first.</span>}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Team">
            <Input placeholder="Product Engineering" />
          </Field>
          <Field label="Type">
            <Select>
              <option>Full-time</option>
              <option>Internship</option>
              <option>Contract</option>
            </Select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Location">
            <Input placeholder="Bengaluru, hybrid" />
          </Field>
          <Field label="Pay range" optional>
            <Input placeholder="₹18L to ₹26L" />
          </Field>
        </div>
        <Field label="Summary" hint="Two or three sentences. What the person will actually do.">
          <Textarea />
        </Field>
        <Field label="Requirements" hint="One per line.">
          <Textarea />
        </Field>
        <div className="flex gap-3 border-t border-grey-200 pt-6">
          <Button>Publish job</Button>
          <Button type="button" variant="secondary">
            Save draft
          </Button>
        </div>
      </form>
    </div>
  );
}
