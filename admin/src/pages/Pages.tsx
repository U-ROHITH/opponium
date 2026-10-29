import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, Search, Upload } from "lucide-react";
import { Button, Field, Initials, Input, PageHeader, Select, Textarea, cx } from "../components/ui";
import { ActivityFeed, SlaLabel, Stepper } from "../components/status";
import { Brand } from "../components/Shell";
import { OtpBoxes } from "../components/OtpBoxes";
import { accessRequests, audit, companies, invites as seedInvites, replyTrend, users, type InviteStatus } from "../data/admin";
import { applications, jobById, NOW, pipeline, STAGES } from "../data/mock";
import { useAdminState } from "../state";
import { slaState } from "../lib/sla";
import { formatDateTime, hoursFromNow, relative } from "../lib/time";

const stageLabel = (k: string) => STAGES.find((s) => s.key === k)!.label;

function Table({ head, children, min = 720, mobile }: { head: string[]; children: React.ReactNode; min?: number; mobile?: React.ReactNode }) {
  return (
    <>
      {mobile && <ul className="divide-y divide-grey-200 border-y border-grey-200 md:hidden">{mobile}</ul>}
    <div className={cx("overflow-x-auto rounded-lg border border-grey-200", mobile ? "hidden md:block" : undefined)}>
      <table className="w-full text-left text-[14px]" style={{ minWidth: min }}>
        <thead className="border-b border-grey-200 bg-grey-50 text-[12px] text-grey-600">
          <tr>
            {head.map((h, i) => (
              <th key={h + i} className={cx("px-4 py-2.5 font-medium", i === head.length - 1 && "text-right")}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-grey-200">{children}</tbody>
      </table>
    </div>
    </>
  );
}

function MobileRow({ title, sub, meta, actions }: { title: React.ReactNode; sub?: React.ReactNode; meta?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <li className="py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-medium">{title}</div>
          {sub && <div className="mt-0.5 text-[13px] text-grey-600">{sub}</div>}
        </div>
        {meta && <div className="shrink-0 text-right">{meta}</div>}
      </div>
      {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
    </li>
  );
}

const td = "px-4 py-3";

function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: [T, string, number?][] }) {
  return (
    <div className="flex gap-5 overflow-x-auto border-b border-grey-200">
      {items.map(([k, label, n]) => (
        <button
          key={k}
          onClick={() => onChange(k)}
          className={cx("-mb-px shrink-0 border-b-2 pb-2.5 text-[14px]", value === k ? "border-ink font-medium" : "border-transparent text-grey-600 hover:text-ink")}
        >
          {label}
          {n !== undefined && <span className="tnum ml-1.5 text-grey-500">{n}</span>}
        </button>
      ))}
    </div>
  );
}

function SmallButton({ children, onClick, tone }: { children: React.ReactNode; onClick?: () => void; tone?: "bad" }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "h-8 rounded-full border border-grey-300 px-3.5 text-[13px] font-medium hover:border-ink",
        tone === "bad" && "text-bad hover:border-bad",
      )}
    >
      {children}
    </button>
  );
}

export function Overview() {
  const overdue = pipeline.filter((a) => slaState(a) === "overdue");
  const soon = pipeline.filter((a) => slaState(a) === "due_soon");
  const stats: [string, string, string][] = [
    ["Open applications", String(pipeline.filter((a) => a.status !== "offer").length + 48), "Across 4 companies"],
    ["Replies due in 8h", String(soon.length), "Watch these first"],
    ["Overdue now", String(overdue.length), "Past 48 hours"],
    ["Median first reply", "14h", "Last 14 days"],
    ["Invites pending", String(seedInvites.filter((i) => i.status === "Pending").length), `${accessRequests.length} access requests`],
  ];
  const max = Math.max(...replyTrend);
  return (
    <div>
      <PageHeader title="Overview" sub="Thursday 29 October, sample data." />
      <dl className="mt-8 grid border-t border-grey-200 sm:grid-cols-2 sm:gap-x-12">
        {stats.map(([k, v, sub]) => (
          <div key={k} className="flex items-baseline justify-between gap-4 border-b border-grey-200 py-3.5">
            <dt>
              <span className="text-[14px]">{k}</span>
              <span className="block text-[12px] text-grey-500">{sub}</span>
            </dt>
            <dd className={cx("tnum font-display text-[22px] font-semibold", k === "Overdue now" && overdue.length > 0 && "text-bad")}>{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.3fr_1fr] [&>*]:min-w-0">
        <section>
          <div className="flex items-baseline justify-between">
            <h2 className="text-[18px] font-semibold">Needs attention</h2>
            <Link to="/sla" className="py-2 text-[13px] text-grey-600 underline underline-offset-2 hover:text-ink">
              All breaches
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-grey-200 border-y border-grey-200">
            {[...overdue, ...soon].map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-3">
                <Initials name={a.candidate.name} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium">{a.candidate.name}</p>
                  <p className="truncate text-[13px] text-grey-500">
                    {jobById(a.jobId).company}, {jobById(a.jobId).title}, owner {a.owner}
                  </p>
                </div>
                <SlaLabel app={a} className="shrink-0" />
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="text-[18px] font-semibold">Median time to first reply</h2>
          <p className="mt-1 text-[13px] text-grey-500">Hours, last 14 days. Target is under 48.</p>
          <div className="mt-6 flex h-36 items-end gap-1 border-b border-grey-300 sm:gap-1.5" role="img" aria-label="Median first reply fell from 31 to 14 hours over 14 days">
            {replyTrend.map((v, i) => (
              <div key={i} className="group relative min-w-0 flex-1">
                <div className={cx("w-full rounded-t-sm", i === replyTrend.length - 1 ? "bg-ink" : "bg-grey-300")} style={{ height: `${(v / max) * 128}px` }} />
                <span className="tnum pointer-events-none absolute -top-5 left-1/2 hidden -translate-x-1/2 text-[12px] group-hover:block">{v}h</span>
              </div>
            ))}
          </div>
          <div className="tnum mt-2 flex justify-between text-[12px] text-grey-500">
            <span>16 Oct</span>
            <span>Today, 14h</span>
          </div>
        </section>
      </div>

      <section className="mt-12">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[18px] font-semibold">Recent activity</h2>
          <Link to="/audit" className="py-2 text-[13px] text-grey-600 underline underline-offset-2 hover:text-ink">
            Audit log
          </Link>
        </div>
        <ul className="mt-4 divide-y divide-grey-200 border-y border-grey-200">
          {audit.slice(0, 5).map((l) => (
            <li key={l.id} className="grid gap-1 py-3 text-[14px] sm:grid-cols-[110px_1fr]">
              <span className="tnum text-[13px] text-grey-500">{relative(l.at)}</span>
              <span>
                <span className="font-medium">{l.actor}</span> <span className="text-grey-600">{l.action.toLowerCase()}</span> {l.target}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

const inviteTone: Record<InviteStatus, string> = {
  Pending: "text-ink",
  Accepted: "text-grey-500",
  Expired: "text-warn",
  Revoked: "text-grey-400 line-through",
};

export function Invites() {
  const [list, setList] = useState(seedInvites);
  const [tab, setTab] = useState<"all" | InviteStatus>("all");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Candidate");
  const [copied, setCopied] = useState<string | null>(null);
  const [company, setCompany] = useState(companies[0].name);
  const [error, setError] = useState("");
  const shown = list.filter((i) => tab === "all" || i.status === tab);
  const InviteActions = ({ i }: { i: (typeof list)[number] }) => (
    <>
      {(i.status === "Pending" || i.status === "Expired") && <SmallButton onClick={() => set(i.id, { status: "Pending", sent: NOW.toISOString() })}>Resend</SmallButton>}
      {i.status === "Pending" && (
        <>
          <SmallButton onClick={() => setCopied(i.id)}>{copied === i.id ? "Copied" : "Copy link"}</SmallButton>
          <SmallButton tone="bad" onClick={() => set(i.id, { status: "Revoked" })}>
            Revoke
          </SmallButton>
        </>
      )}
    </>
  );
  const count = (s: InviteStatus) => list.filter((i) => i.status === s).length;
  const set = (id: string, patch: Partial<(typeof list)[number]>) => setList(list.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  return (
    <div>
      <PageHeader
        title="Invites"
        sub="Nobody joins Opponium without one. Links last 7 days and work once."
        actions={
          <Button variant="secondary">
            <Upload size={15} /> Upload CSV
          </Button>
        }
      />
      <form
        className="mt-8 grid gap-3 rounded-lg border border-grey-200 p-5 sm:grid-cols-[1fr_180px_180px_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          if (!/^\S+@\S+\.\S+$/.test(email)) {
            setError("Enter a full email address, like name@college.edu.");
            return;
          }
          setError("");
          setList([{ id: String(list.length + 100), email, role, company: role === "Candidate" ? "" : company, by: "Rohith Uppunuthula", sent: NOW.toISOString(), status: "Pending" }, ...list]);
          setEmail("");
        }}
      >
        <Field label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@college.edu" className={error ? "border-bad" : ""} />
        </Field>
        <Field label="Role">
          <Select value={role} onChange={(e) => setRole(e.target.value)}>
            <option>Candidate</option>
            <option>Recruiter</option>
            <option>Hiring manager</option>
          </Select>
        </Field>
        <Field label="Company">
          {role === "Candidate" ? (
            <Input value="Not needed for candidates" disabled />
          ) : (
            <Select value={company} onChange={(e) => setCompany(e.target.value)}>
              {companies.map((c) => (
                <option key={c.id}>{c.name}</option>
              ))}
            </Select>
          )}
        </Field>
        <Button>Send invite</Button>
        {error && <p className="text-[13px] text-bad sm:col-span-4">{error}</p>}
      </form>
      <div className="mt-8">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[["all", "All", list.length], ["Pending", "Pending", count("Pending")], ["Accepted", "Accepted", count("Accepted")], ["Expired", "Expired", count("Expired")], ["Revoked", "Revoked", count("Revoked")]]}
        />
      </div>
      <div className="mt-4">
        <Table
          head={["Email", "Role", "Company", "Invited by", "Sent", "Status", ""]}
          mobile={shown.map((i) => (
            <MobileRow
              key={i.id}
              title={i.email}
              sub={`${i.role}${i.company ? `, ${i.company}` : ""}, sent ${relative(i.sent)}`}
              meta={<span className={cx("text-[13px] font-medium", inviteTone[i.status])}>{i.status}</span>}
              actions={<InviteActions i={i} />}
            />
          ))}
        >
          {shown.map((i) => (
            <tr key={i.id}>
              <td className={cx(td, "font-medium")}>{i.email}</td>
              <td className={cx(td, "text-grey-700")}>{i.role}</td>
              <td className={cx(td, "text-grey-700")}>{i.company || "None"}</td>
              <td className={cx(td, "text-grey-700")}>{i.by}</td>
              <td className={cx(td, "tnum text-grey-600")}>{relative(i.sent)}</td>
              <td className={cx(td, "text-[13px] font-medium", inviteTone[i.status])}>{i.status}</td>
              <td className={cx(td, "text-right")}>
                <div className="flex justify-end gap-2">
                  <InviteActions i={i} />
                </div>
              </td>
            </tr>
          ))}
        </Table>
      </div>
    </div>
  );
}

export function Requests() {
  const { decided, decide } = useAdminState();
  return (
    <div>
      <PageHeader title="Access requests" sub={`${accessRequests.filter((r) => !decided[r.id]).length} waiting. Approving sends an invite to the email they gave.`} />
      <ul className="mt-8 divide-y divide-grey-200 border-y border-grey-200">
        {accessRequests.map((r) => (
          <li key={r.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Initials name={r.name} />
              <div className="min-w-0">
                <p className="font-medium">{r.name}</p>
                <p className="truncate text-[13px] text-grey-500">
                  {r.email}, {r.org}
                </p>
              </div>
            </div>
            <span className="text-[13px] text-grey-600 sm:w-40 sm:text-[14px]">
              {r.as}, {relative(r.at)}
            </span>
            <div className="flex gap-2 sm:w-48 sm:justify-end">
              {decided[r.id] ? (
                <span className={cx("inline-flex items-center gap-1.5 text-[13px] font-medium", decided[r.id] === "Approved" ? "text-ok" : "text-grey-500")}>
                  {decided[r.id] === "Approved" && <Check size={14} />} {decided[r.id] === "Approved" ? "Invite sent" : "Declined"}
                </span>
              ) : (
                <>
                  <Button className="h-9 px-4 text-[13px]" onClick={() => decide(r.id, "Approved")}>
                    Approve
                  </Button>
                  <Button variant="secondary" className="h-9 px-4 text-[13px]" onClick={() => decide(r.id, "Declined")}>
                    Decline
                  </Button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Users() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("All");
  const [suspended, setSuspended] = useState<Set<string>>(new Set(users.filter((u) => u.suspended).map((u) => u.id)));
  const shown = users.filter((u) => (role === "All" || u.role === role) && (u.name + u.email).toLowerCase().includes(q.toLowerCase()));
  const action = (u: (typeof users)[number]) =>
    suspended.has(u.id) ? (
      <SmallButton onClick={() => { const n = new Set(suspended); n.delete(u.id); setSuspended(n); }}>Restore</SmallButton>
    ) : u.role !== "Admin" ? (
      <SmallButton tone="bad" onClick={() => setSuspended(new Set(suspended).add(u.id))}>Suspend</SmallButton>
    ) : null;
  return (
    <div>
      <PageHeader title="Users" sub={`${users.length} people on Opponium.`} />
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-500" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email" className="pl-9" />
        </div>
        <Select value={role} onChange={(e) => setRole(e.target.value)} className="sm:w-44">
          {["All", "Candidate", "Recruiter", "Admin"].map((r) => (
            <option key={r}>{r}</option>
          ))}
        </Select>
      </div>
      <div className="mt-4">
        <Table
          head={["Name", "Role", "Organisation", "Email", "Phone", "Last active", ""]}
          mobile={shown.map((u) => (
            <MobileRow
              key={u.id}
              title={u.name}
              sub={
                <>
                  {u.role}, {u.org}
                  <br />
                  {u.email_ok ? "Email verified" : <span className="text-warn">Email not verified</span>},{" "}
                  {u.phone_ok ? "phone verified" : <span className="text-warn">phone not verified</span>}
                </>
              }
              meta={suspended.has(u.id) ? <span className="text-[13px] font-medium text-bad">Suspended</span> : <span className="tnum text-[13px] text-grey-500">{relative(u.active)}</span>}
              actions={action(u)}
            />
          ))}
        >
          {shown.map((u) => (
            <tr key={u.id}>
              <td className={td}>
                <p className="font-medium">{u.name}</p>
                <p className="text-[13px] text-grey-500">{u.email}</p>
              </td>
              <td className={cx(td, "text-grey-700")}>{u.role}</td>
              <td className={cx(td, "text-grey-700")}>{u.org}</td>
              <td className={cx(td, "text-[13px]")}>{u.email_ok ? "Verified" : <span className="text-warn">Not verified</span>}</td>
              <td className={cx(td, "text-[13px]")}>{u.phone_ok ? "Verified" : <span className="text-warn">Not verified</span>}</td>
              <td className={cx(td, "tnum text-grey-600")}>{relative(u.active)}</td>
              <td className={cx(td, "text-right")}>
                <div className="flex items-center justify-end gap-3">
                  {suspended.has(u.id) && <span className="text-[13px] font-medium text-bad">Suspended</span>}
                  {action(u)}
                </div>
              </td>
            </tr>
          ))}
        </Table>
      </div>
    </div>
  );
}

export function Companies() {
  return (
    <div>
      <PageHeader title="Companies" sub="Reply rate is the share of applications answered within 48 hours, last 30 days." actions={<Button>Add company</Button>} />
      <div className="mt-8">
        <Table
          head={["Company", "Domain", "Recruiters", "Open jobs", "Open applications", "Reply rate", "Status"]}
          mobile={companies.map((c) => (
            <MobileRow
              key={c.id}
              title={c.name}
              sub={`${c.domain}, ${c.recruiters} recruiters, ${c.jobs} open jobs`}
              meta={
                c.status === "Onboarding" ? (
                  <span className="text-[13px] text-grey-500">Onboarding</span>
                ) : (
                  <span className={cx("tnum text-[14px] font-medium", c.compliance < 85 && "text-warn")}>{c.compliance}% on time</span>
                )
              }
            />
          ))}
        >
          {companies.map((c) => (
            <tr key={c.id}>
              <td className={cx(td, "font-medium")}>{c.name}</td>
              <td className={cx(td, "text-grey-600")}>{c.domain}</td>
              <td className={cx(td, "tnum")}>{c.recruiters}</td>
              <td className={cx(td, "tnum")}>{c.jobs}</td>
              <td className={cx(td, "tnum")}>{c.open}</td>
              <td className={td}>
                {c.status === "Onboarding" ? (
                  <span className="text-grey-400">No data</span>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 w-20 rounded-full bg-grey-200">
                      <div className={cx("h-1.5 rounded-full", c.compliance < 85 ? "bg-warn" : "bg-ink")} style={{ width: `${c.compliance}%` }} />
                    </div>
                    <span className={cx("tnum text-[13px]", c.compliance < 85 && "font-medium text-warn")}>{c.compliance}%</span>
                  </div>
                )}
              </td>
              <td className={cx(td, "text-right text-[13px] text-grey-600")}>{c.status}</td>
            </tr>
          ))}
        </Table>
      </div>
    </div>
  );
}

export function Sla() {
  const [nudged, setNudged] = useState<Set<string>>(new Set());
  const rows = pipeline.filter((a) => ["overdue", "due_soon"].includes(slaState(a))).sort((a, b) => a.replyDueAt.localeCompare(b.replyDueAt));
  return (
    <div>
      <PageHeader title="Reply breaches" sub="Applications past, or within 8 hours of, the 48-hour reply deadline." />
      <div className="mt-8">
        <Table
          head={["Candidate", "Company and job", "Stage", "Owner", "Deadline", "Status", ""]}
          mobile={rows.map((a) => (
            <MobileRow
              key={a.id}
              title={a.candidate.name}
              sub={`${jobById(a.jobId).company}, ${jobById(a.jobId).title}, owner ${a.owner}`}
              meta={<SlaLabel app={a} />}
              actions={
                nudged.has(a.id) ? (
                  <span className="inline-flex items-center gap-1 text-[13px] text-grey-500">
                    <Check size={13} /> Nudged
                  </span>
                ) : (
                  <SmallButton onClick={() => setNudged(new Set(nudged).add(a.id))}>Nudge {a.owner.split(" ")[0]}</SmallButton>
                )
              }
            />
          ))}
        >
          {rows.map((a) => {
            const job = jobById(a.jobId);
            return (
              <tr key={a.id}>
                <td className={cx(td, "font-medium")}>{a.candidate.name}</td>
                <td className={td}>
                  <p>{job.company}</p>
                  <p className="text-[13px] text-grey-500">{job.title}</p>
                </td>
                <td className={cx(td, "text-grey-700")}>{stageLabel(a.stage)}</td>
                <td className={cx(td, "text-grey-700")}>{a.owner}</td>
                <td className={cx(td, "tnum text-grey-600")}>{formatDateTime(a.replyDueAt)}</td>
                <td className={td}>
                  <SlaLabel app={a} />
                </td>
                <td className={cx(td, "text-right")}>
                  {nudged.has(a.id) ? (
                    <span className="inline-flex items-center gap-1 text-[13px] text-grey-500">
                      <Check size={13} /> Nudged
                    </span>
                  ) : (
                    <SmallButton onClick={() => setNudged(new Set(nudged).add(a.id))}>Nudge {a.owner.split(" ")[0]}</SmallButton>
                  )}
                </td>
              </tr>
            );
          })}
        </Table>
      </div>
      <p className="mt-4 text-[13px] text-grey-500">
        A nudge emails the owner and logs it. Once 48 hours pass, the candidate's tracker shows a "running late" notice automatically.
      </p>
    </div>
  );
}

export function Lookup() {
  const [q, setQ] = useState("aarav.mehta@iitm.ac.in");
  const found = applications.filter((a) => q && (a.candidate.email.includes(q.toLowerCase()) || a.id === q));
  const [openId, setOpenId] = useState(found[0]?.id);
  const open = found.find((a) => a.id === openId);
  return (
    <div>
      <PageHeader title="Application lookup" sub="For support. Shows exactly what the candidate sees. Read only." />
      <div className="relative mt-8 max-w-lg">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-500" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Candidate email or application ID" className="pl-9" />
      </div>
      <div className="mt-8 grid gap-8 lg:grid-cols-[320px_1fr]">
        <ul className="divide-y divide-grey-200 border-y border-grey-200">
          {found.map((a) => {
            const job = jobById(a.jobId);
            return (
              <li key={a.id}>
                <button onClick={() => setOpenId(a.id)} className={cx("w-full px-2 py-3 text-left hover:bg-grey-50", openId === a.id && "bg-grey-100")}>
                  <p className="text-[14px] font-medium">
                    {job.title}, {job.company}
                  </p>
                  <p className="tnum text-[13px] text-grey-500">
                    {a.id}, {stageLabel(a.stage)}
                  </p>
                </button>
              </li>
            );
          })}
          {found.length === 0 && <li className="py-6 text-[14px] text-grey-500">No applications match.</li>}
        </ul>
        {open && (
          <div className="rounded-lg border border-grey-200 p-5">
            <p className="font-medium">{open.candidate.name}</p>
            <p className="tnum text-[13px] text-grey-500">
              Applied {formatDateTime(open.appliedAt)}, reply due {formatDateTime(open.replyDueAt)}
              {hoursFromNow(open.replyDueAt) < 0 && !open.firstReplyAt ? ", overdue" : ""}
            </p>
            <div className="mt-6">
              <Stepper stage={open.stage} status={open.status} />
            </div>
            <div className="mt-8 border-t border-grey-200 pt-6">
              <ActivityFeed signals={open.signals} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function Audit() {
  const [q, setQ] = useState("");
  const shown = audit.filter((l) => (l.actor + l.action + l.target).toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <PageHeader title="Audit log" sub="Every invite, stage move, signal and setting change. Entries can't be edited or deleted." actions={<Button variant="secondary">Export CSV</Button>} />
      <div className="relative mt-8 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-500" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by person, action or target" className="pl-9" />
      </div>
      <div className="mt-4">
        <Table
          head={["Time", "Actor", "Action", "Target", "Detail"]}
          mobile={shown.map((l) => (
            <MobileRow
              key={l.id}
              title={
                <span className="whitespace-normal">
                  {l.actor} <span className="font-normal text-grey-600">{l.action.toLowerCase()}</span>
                </span>
              }
              sub={
                <>
                  {l.target}
                  {l.detail && <>, {l.detail}</>}
                </>
              }
              meta={<span className="tnum text-[12px] text-grey-500">{relative(l.at)}</span>}
            />
          ))}
        >
          {shown.map((l) => (
            <tr key={l.id}>
              <td className={cx(td, "tnum whitespace-nowrap text-grey-600")}>{formatDateTime(l.at)}</td>
              <td className={cx(td, "font-medium")}>{l.actor}</td>
              <td className={td}>{l.action}</td>
              <td className={cx(td, "text-grey-700")}>{l.target}</td>
              <td className={cx(td, "text-right text-grey-600")}>{l.detail || "None"}</td>
            </tr>
          ))}
        </Table>
      </div>
    </div>
  );
}

export function Settings() {
  const [saved, setSaved] = useState(false);
  return (
    <div className="max-w-3xl">
      <PageHeader title="Settings" />
      <form
        className="mt-8 space-y-12"
        onSubmit={(e) => {
          e.preventDefault();
          setSaved(true);
        }}
        onChange={() => setSaved(false)}
      >
        <section>
          <h2 className="text-[18px] font-semibold">Reply deadline</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Reply within (hours)" hint="Counted from submission to the first reply beyond “Viewed”.">
              <Input type="number" defaultValue={48} className="tnum" />
            </Field>
            <Field label="Due soon warning (hours left)">
              <Input type="number" defaultValue={8} className="tnum" />
            </Field>
          </div>
        </section>
        <section>
          <h2 className="text-[18px] font-semibold">Stages</h2>
          <p className="mt-1 text-[14px] text-grey-600">The same five stages apply to every company. Candidates see these names.</p>
          <ol className="mt-4 space-y-2">
            {STAGES.map((s, i) => (
              <li key={s.key} className="flex items-center gap-3">
                <span className="tnum w-5 text-[13px] text-grey-500">{i + 1}</span>
                <Input defaultValue={s.label} />
              </li>
            ))}
          </ol>
        </section>
        <section>
          <h2 className="text-[18px] font-semibold">Messages</h2>
          <div className="mt-4 space-y-4">
            <Field label="Email code" hint="Sent through Resend. {code} is replaced with the 6 digits.">
              <Textarea defaultValue={"Your Opponium code is {code}. It expires in 10 minutes. If you didn't ask for it, ignore this email."} />
            </Field>
            <Field label="SMS code" hint="Sent through 2Factor. Keep it under 160 characters.">
              <Textarea defaultValue={"{code} is your Opponium code. It expires in 10 minutes.\n\n@opponium.com #{code}"} />
            </Field>
          </div>
        </section>
        <div className="flex items-center gap-4 border-t border-grey-200 pt-6">
          <Button>Save changes</Button>
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-[14px] text-ok">
              <Check size={15} /> Saved
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

export function Login() {
  const nav = useNavigate();
  const [step, setStep] = useState<"email" | "code">("email");
  const [code, setCode] = useState("");
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-16 items-center px-4 sm:px-6">
        <Brand />
      </header>
      <main className="flex flex-1 justify-center px-4 pt-10 sm:pt-20">
        <div className="w-full max-w-[380px]">
          {step === "email" ? (
            <>
              <h1 className="text-[28px] font-semibold">Admin sign in</h1>
              <p className="mt-2 text-grey-600">For the Opponium team only. Every sign in is logged.</p>
              <form
                className="mt-8 space-y-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  setStep("code");
                }}
              >
                <Field label="Work email">
                  <Input type="email" defaultValue="rohith@opponium.com" />
                </Field>
                <Button className="w-full">Email me a code</Button>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-[28px] font-semibold">Check your email</h1>
              <p className="mt-2 text-grey-600">Enter the 6-digit code we sent to rohith@opponium.com.</p>
              <div className="mt-8">
                <OtpBoxes
                  value={code}
                  onChange={(v) => {
                    setCode(v);
                    if (v.length === 6) setTimeout(() => nav("/"), 300);
                  }}
                />
              </div>
              <p className="mt-3 text-[13px] text-grey-500">Any 6 digits work in this preview.</p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
