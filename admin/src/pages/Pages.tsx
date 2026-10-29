import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Check, Search, Upload } from "lucide-react";
import { Button, Field, Initials, Input, PageHeader, Select, Textarea, cx } from "../components/ui";
import { ActivityFeed, SlaLabel, Stepper } from "../components/status";
import { Brand } from "../components/Shell";
import { OtpBoxes } from "../components/OtpBoxes";
import { EmptyState, ErrorState, InlineError, Loadable, Placeholder, WakeNotice } from "../components/states";
import {
  api,
  errorText,
  roleLabel,
  useQuery,
  type AccessRequestRow,
  type Application,
  type AuditRow,
  type Challenge,
  type CompanyRow,
  type InviteRow,
  type InviteStatus,
  type PlatformSettings,
  type Role,
  type User,
  type UserRow,
} from "../lib/api";
import { useAdmin, useDueSoonHours } from "../state";
import { formatDate, formatDateTime, formatToday, relative } from "../lib/time";

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
          {sub && <div className="mt-0.5 break-words text-[13px] text-grey-600">{sub}</div>}
        </div>
        {meta && <div className="shrink-0 text-right">{meta}</div>}
      </div>
      {actions && <div className="mt-3 flex flex-wrap items-center gap-2">{actions}</div>}
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

function SmallButton({ children, onClick, tone, disabled }: { children: React.ReactNode; onClick?: () => void; tone?: "bad"; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "h-8 whitespace-nowrap rounded-full border border-grey-300 px-3.5 text-[13px] font-medium hover:border-ink disabled:pointer-events-none disabled:opacity-40",
        tone === "bad" && "text-bad hover:border-bad",
      )}
    >
      {children}
    </button>
  );
}

function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Refetch when a page opens, unless this is the very first load. */
function useRefetchOnOpen(reload: () => void, hasData: boolean) {
  const had = useRef(hasData);
  useEffect(() => {
    if (had.current) reload();
  }, [reload]);
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }
}

function downloadCsv(filename: string, rows: string[][]) {
  const esc = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const csv = rows.map((r) => r.map(esc).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const hours = (v: number) => `${Math.round(v)}h`;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function Overview() {
  const { overview: q, settings } = useAdmin();
  useRefetchOnOpen(q.reload, q.data !== undefined);
  const soonH = settings.data?.due_soon_hours ?? 8;
  const replyH = settings.data?.reply_hours ?? 48;
  return (
    <div>
      <PageHeader title="Overview" sub={`${formatToday()}.`} />
      <Loadable q={q} rows={5}>
        {(o) => {
          const stats: [string, string | null, string][] = [
            ["Open applications", String(o.open_applications), `Across ${plural(o.companies, "company", "companies")}`],
            [`Replies due in ${soonH}h`, String(o.due_soon), "Watch these first"],
            ["Overdue now", String(o.overdue), `Past ${replyH} hours`],
            ["Median first reply", o.median_first_reply_hours === null ? null : hours(o.median_first_reply_hours), "Last 14 days"],
            ["Invites pending", String(o.invites_pending), plural(o.access_requests, "access request", "access requests")],
          ];
          const values = o.trend.map((t) => t.median_hours).filter((v): v is number => v !== null);
          const max = Math.max(1, ...values);
          const last = o.trend[o.trend.length - 1];
          const attention = o.attention;
          return (
            <>
              <dl className="mt-8 grid border-t border-grey-200 sm:grid-cols-2 sm:gap-x-12">
                {stats.map(([k, v, sub]) => (
                  <div key={k} className="flex items-baseline justify-between gap-4 border-b border-grey-200 py-3.5">
                    <dt>
                      <span className="text-[14px]">{k}</span>
                      <span className="block text-[12px] text-grey-500">{sub}</span>
                    </dt>
                    {v === null ? (
                      <dd className="text-[14px] text-grey-400">No data</dd>
                    ) : (
                      <dd className={cx("tnum font-display text-[22px] font-semibold", k === "Overdue now" && o.overdue > 0 && "text-bad")}>{v}</dd>
                    )}
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
                  {attention.length === 0 ? (
                    <EmptyState title={o.open_applications === 0 ? "No applications yet" : "Nothing needs attention"} className="mt-4">
                      {o.open_applications === 0 ? "Open applications show up here once candidates apply." : "Every open application is on track."}
                    </EmptyState>
                  ) : (
                    <ul className="mt-4 divide-y divide-grey-200 border-y border-grey-200">
                      {attention.map((a) => (
                        <li key={a.id} className="flex items-center gap-3 py-3">
                          <Initials name={a.candidate.name} size={32} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[14px] font-medium">{a.candidate.name}</p>
                            <p className="truncate text-[13px] text-grey-500">
                              {a.job.company}, {a.job.title}
                              {a.owner ? `, owner ${a.owner.name}` : ""}
                            </p>
                          </div>
                          <SlaLabel app={a} className="shrink-0" />
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
                <section>
                  <h2 className="text-[18px] font-semibold">Median time to first reply</h2>
                  <p className="mt-1 text-[13px] text-grey-500">Hours, last 14 days. Target is under {replyH}.</p>
                  <div
                    className="mt-6 flex h-36 items-end gap-1 border-b border-grey-300 sm:gap-1.5"
                    role="img"
                    aria-label={
                      values.length
                        ? `Median first reply by day over 14 days, most recent ${hours(values[values.length - 1])}`
                        : "No replies in the last 14 days"
                    }
                  >
                    {o.trend.map((t, i) => (
                      <div key={t.day} className="group relative h-full min-w-0 flex-1">
                        {t.median_hours !== null && (
                          <div
                            className={cx("absolute inset-x-0 bottom-0 rounded-t-sm", i === o.trend.length - 1 ? "bg-ink" : "bg-grey-300")}
                            style={{ height: `${Math.max(2, (t.median_hours / max) * 128)}px` }}
                          />
                        )}
                        <span className="tnum pointer-events-none absolute -top-5 left-1/2 hidden -translate-x-1/2 whitespace-nowrap text-[12px] group-hover:block">
                          {t.median_hours === null ? "None" : hours(t.median_hours)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="tnum mt-2 flex justify-between text-[12px] text-grey-500">
                    <span>{o.trend.length ? formatDate(o.trend[0].day) : ""}</span>
                    <span>{last && last.median_hours !== null ? `Today, ${hours(last.median_hours)}` : "Today, no replies yet"}</span>
                  </div>
                  {values.length === 0 && <p className="mt-3 text-[13px] text-grey-500">No first replies in the last 14 days.</p>}
                </section>
              </div>

              <section className="mt-12">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-[18px] font-semibold">Recent activity</h2>
                  <Link to="/audit" className="py-2 text-[13px] text-grey-600 underline underline-offset-2 hover:text-ink">
                    Audit log
                  </Link>
                </div>
                {o.recent.length === 0 ? (
                  <EmptyState title="No activity yet" className="mt-4" />
                ) : (
                  <ul className="mt-4 divide-y divide-grey-200 border-y border-grey-200">
                    {o.recent.slice(0, 5).map((l) => (
                      <li key={l.id} className="grid gap-1 py-3 text-[14px] sm:grid-cols-[110px_1fr]">
                        <span className="tnum text-[13px] text-grey-500">{relative(l.at)}</span>
                        <span className="break-words">
                          <span className="font-medium">{l.actor}</span> <span className="text-grey-600">{l.action.toLowerCase()}</span> {l.target}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          );
        }}
      </Loadable>
    </div>
  );
}

const inviteTone: Record<InviteStatus, string> = {
  pending: "text-ink",
  accepted: "text-grey-500",
  expired: "text-warn",
  revoked: "text-grey-400 line-through",
};
const inviteLabel: Record<InviteStatus, string> = { pending: "Pending", accepted: "Accepted", expired: "Expired", revoked: "Revoked" };

function BulkInvites({ onDone }: { onDone: () => void }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ sent: number; errors: string[] } | null>(null);
  return (
    <form
      className="mt-6 rounded-lg border border-grey-200 p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!text.trim()) {
          setError("Add at least one line, or choose a CSV file.");
          return;
        }
        setBusy(true);
        setError("");
        setResult(null);
        try {
          const r = await api<{ sent: number; errors: string[] }>("/api/admin/invites/bulk", { body: { csv: text } });
          setResult(r);
          if (r.sent > 0) {
            setText("");
            setFile("");
            onDone();
          }
        } catch (err) {
          setError(errorText(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2 className="text-[16px] font-semibold">Upload a CSV</h2>
      <p className="mt-1 text-[13px] text-grey-600">
        One invite per line: email, role, company name. Role is candidate, recruiter or hiring manager. Candidates need no company.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="inline-flex h-9 cursor-pointer items-center rounded-full border border-grey-300 px-4 text-[13px] font-medium hover:border-ink">
          Choose file
          <input
            type="file"
            accept=".csv,text/csv,text/plain"
            className="sr-only"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setFile(f.name);
              setText(await f.text());
              e.target.value = "";
            }}
          />
        </label>
        <span className="min-w-0 truncate text-[13px] text-grey-500">{file || "Or paste lines below"}</span>
      </div>
      <Textarea
        className="tnum mt-3 min-h-32 text-[14px]"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"ishita.rao@bits-pilani.ac.in, candidate\nhr@kitelabs.in, recruiter, Kite Labs"}
        aria-label="CSV lines"
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button disabled={busy}>{busy ? "Sending" : "Send invites"}</Button>
        {result && (
          <span className={cx("inline-flex items-center gap-1.5 text-[14px]", result.sent > 0 ? "text-ok" : "text-grey-600")}>
            {result.sent > 0 && <Check size={15} />} Sent {plural(result.sent, "invite", "invites")}.
          </span>
        )}
      </div>
      <InlineError className="mt-3">{error}</InlineError>
      {result && result.errors.length > 0 && (
        <ul className="mt-3 space-y-1 text-[13px] text-bad">
          {result.errors.map((er) => (
            <li key={er}>{er}</li>
          ))}
        </ul>
      )}
    </form>
  );
}

export function Invites() {
  const q = useQuery<InviteRow[]>("/api/admin/invites");
  const companiesQ = useQuery<CompanyRow[]>("/api/admin/companies");
  const { refreshCounts } = useAdmin();
  const [tab, setTab] = useState<"all" | InviteStatus>("all");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("candidate");
  const [companyId, setCompanyId] = useState("");
  const [copied, setCopied] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);
  const [rowError, setRowError] = useState<{ id: number; text: string } | null>(null);
  const [bulk, setBulk] = useState(false);

  const list = q.data ?? [];
  const companies = companiesQ.data ?? [];
  const cid = companyId || (companies[0] ? String(companies[0].id) : "");
  const shown = list.filter((i) => tab === "all" || i.status === tab);
  const count = (s: InviteStatus) => list.filter((i) => i.status === s).length;
  const replace = (row: InviteRow) => q.setData((l) => l?.map((i) => (i.id === row.id ? row : i)));

  const act = async (i: InviteRow, action: "resend" | "revoke") => {
    setBusy(i.id);
    setRowError(null);
    try {
      replace(await api<InviteRow>(`/api/admin/invites/${i.id}/${action}`, { method: "POST" }));
      refreshCounts();
    } catch (e) {
      setRowError({ id: i.id, text: errorText(e) });
    } finally {
      setBusy(null);
    }
  };

  const InviteActions = ({ i }: { i: InviteRow }) => (
    <>
      {(i.status === "pending" || i.status === "expired") && (
        <SmallButton disabled={busy === i.id} onClick={() => act(i, "resend")}>
          Resend
        </SmallButton>
      )}
      {i.status === "pending" && (
        <>
          <SmallButton
            onClick={async () => {
              if (await copyText(i.link)) {
                setCopied(i.id);
                setRowError(null);
                setTimeout(() => setCopied((c) => (c === i.id ? null : c)), 2000);
              } else setRowError({ id: i.id, text: `Copy didn't work here. The link is ${i.link}` });
            }}
          >
            {copied === i.id ? "Copied" : "Copy link"}
          </SmallButton>
          <SmallButton tone="bad" disabled={busy === i.id} onClick={() => act(i, "revoke")}>
            Revoke
          </SmallButton>
        </>
      )}
    </>
  );
  const RowError = ({ i }: { i: InviteRow }) => (rowError?.id === i.id ? <InlineError className="mt-2 basis-full">{rowError.text}</InlineError> : null);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Enter a full email address, like name@college.edu.");
      return;
    }
    if (role !== "candidate" && !cid) {
      setError("Add a company first, then invite its recruiters.");
      return;
    }
    setError("");
    setSending(true);
    try {
      const row = await api<InviteRow>("/api/admin/invites", {
        body: { email: email.trim(), role, ...(role === "candidate" ? {} : { company_id: Number(cid) }) },
      });
      q.setData((l) => [row, ...(l ?? []).map((i) => (i.email === row.email && i.status === "pending" ? { ...i, status: "revoked" as const } : i))]);
      setEmail("");
      setTab("all");
      refreshCounts();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Invites"
        sub="Nobody joins Opponium without one. Links last 7 days and work once."
        actions={
          <Button variant="secondary" onClick={() => setBulk(!bulk)} aria-expanded={bulk}>
            <Upload size={15} /> Upload CSV
          </Button>
        }
      />
      {bulk && (
        <BulkInvites
          onDone={() => {
            q.reload();
            refreshCounts();
          }}
        />
      )}
      <form className="mt-8 grid gap-3 rounded-lg border border-grey-200 p-5 sm:grid-cols-[1fr_180px_180px_auto] sm:items-end" onSubmit={send} noValidate>
        <Field label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@college.edu" className={error ? "border-bad" : ""} />
        </Field>
        <Field label="Role">
          <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="candidate">Candidate</option>
            <option value="recruiter">Recruiter</option>
            <option value="hiring_manager">Hiring manager</option>
          </Select>
        </Field>
        <Field label="Company">
          {role === "candidate" ? (
            <Input value="Not needed for candidates" disabled />
          ) : companiesQ.data === undefined ? (
            <Input value={companiesQ.error ? "Couldn't load companies" : "Loading companies"} disabled />
          ) : companies.length === 0 ? (
            <Input value="Add a company first" disabled />
          ) : (
            <Select value={cid} onChange={(e) => setCompanyId(e.target.value)}>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Button disabled={sending}>{sending ? "Sending" : "Send invite"}</Button>
        {error && <p className="text-[13px] text-bad sm:col-span-4">{error}</p>}
      </form>
      <div className="mt-8">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            ["all", "All", list.length],
            ["pending", "Pending", count("pending")],
            ["accepted", "Accepted", count("accepted")],
            ["expired", "Expired", count("expired")],
            ["revoked", "Revoked", count("revoked")],
          ]}
        />
      </div>
      <div className="mt-4">
        <Loadable q={q}>
          {() =>
            shown.length === 0 ? (
              <EmptyState title={list.length === 0 ? "No invites yet" : `No ${inviteLabel[tab as InviteStatus]?.toLowerCase() ?? ""} invites`}>
                {list.length === 0 ? "Send the first one above." : undefined}
              </EmptyState>
            ) : (
              <Table
                head={["Email", "Role", "Company", "Invited by", "Sent", "Status", ""]}
                min={860}
                mobile={shown.map((i) => (
                  <MobileRow
                    key={i.id}
                    title={i.email}
                    sub={`${i.role_label}${i.company ? `, ${i.company}` : ""}, sent ${relative(i.sent_at)}`}
                    meta={<span className={cx("text-[13px] font-medium", inviteTone[i.status])}>{inviteLabel[i.status]}</span>}
                    actions={
                      i.status === "pending" || i.status === "expired" || rowError?.id === i.id ? (
                        <>
                          <InviteActions i={i} />
                          <RowError i={i} />
                        </>
                      ) : undefined
                    }
                  />
                ))}
              >
                {shown.map((i) => (
                  <tr key={i.id}>
                    <td className={cx(td, "font-medium")}>{i.email}</td>
                    <td className={cx(td, "text-grey-700")}>{i.role_label}</td>
                    <td className={cx(td, "text-grey-700")}>{i.company || "None"}</td>
                    <td className={cx(td, "text-grey-700")}>{i.invited_by}</td>
                    <td className={cx(td, "tnum whitespace-nowrap text-grey-600")}>{relative(i.sent_at)}</td>
                    <td className={cx(td, "text-[13px] font-medium", inviteTone[i.status])}>{inviteLabel[i.status]}</td>
                    <td className={cx(td, "text-right")}>
                      <div className="flex flex-wrap justify-end gap-2">
                        <InviteActions i={i} />
                      </div>
                      {rowError?.id === i.id && <InlineError className="mt-2 text-right">{rowError.text}</InlineError>}
                    </td>
                  </tr>
                ))}
              </Table>
            )
          }
        </Loadable>
      </div>
    </div>
  );
}

export function Requests() {
  const q = useQuery<AccessRequestRow[]>("/api/admin/access-requests");
  const { refreshCounts } = useAdmin();
  const [busy, setBusy] = useState<number | null>(null);
  const [rowError, setRowError] = useState<{ id: number; text: string } | null>(null);
  const list = q.data ?? [];
  const pending = list.filter((r) => r.state === "pending").length;

  const decide = async (r: AccessRequestRow, action: "approve" | "decline") => {
    setBusy(r.id);
    setRowError(null);
    try {
      const row = await api<AccessRequestRow>(`/api/admin/access-requests/${r.id}/${action}`, { method: "POST" });
      q.setData((l) => l?.map((x) => (x.id === row.id ? row : x)));
      refreshCounts();
    } catch (e) {
      setRowError({ id: r.id, text: errorText(e) });
      q.reload();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Access requests"
        sub={q.data ? `${pending} waiting. Approving sends an invite to the email they gave.` : "Approving sends an invite to the email they gave."}
      />
      <div className="mt-8">
        <Loadable q={q}>
          {() =>
            list.length === 0 ? (
              <EmptyState title="No access requests yet">People who ask to join from the website show up here.</EmptyState>
            ) : (
              <ul className="divide-y divide-grey-200 border-y border-grey-200">
                {list.map((r) => (
                  <li key={r.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:flex-wrap sm:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <Initials name={r.name} />
                      <div className="min-w-0">
                        <p className="font-medium">{r.name}</p>
                        <p className="truncate text-[13px] text-grey-500">
                          {r.email}, {r.organisation}
                        </p>
                      </div>
                    </div>
                    <span className="text-[13px] text-grey-600 sm:w-40 sm:text-[14px]">
                      {r.joining_as === "recruiter" ? "Recruiter" : "Candidate"}, {relative(r.created_at)}
                    </span>
                    <div className="flex gap-2 sm:w-48 sm:justify-end">
                      {r.state !== "pending" ? (
                        <span className={cx("inline-flex items-center gap-1.5 text-[13px] font-medium", r.state === "approved" ? "text-ok" : "text-grey-500")}>
                          {r.state === "approved" && <Check size={14} />} {r.state === "approved" ? "Invite sent" : "Declined"}
                        </span>
                      ) : (
                        <>
                          <Button className="h-9 px-4 text-[13px]" disabled={busy === r.id} onClick={() => decide(r, "approve")}>
                            Approve
                          </Button>
                          <Button variant="secondary" className="h-9 px-4 text-[13px]" disabled={busy === r.id} onClick={() => decide(r, "decline")}>
                            Decline
                          </Button>
                        </>
                      )}
                    </div>
                    {rowError?.id === r.id && <InlineError className="sm:basis-full sm:text-right">{rowError.text}</InlineError>}
                  </li>
                ))}
              </ul>
            )
          }
        </Loadable>
      </div>
    </div>
  );
}

const roleFilters: [string, string][] = [
  ["", "All"],
  ["candidate", "Candidate"],
  ["recruiter", "Recruiter"],
  ["hiring_manager", "Hiring manager"],
  ["admin", "Admin"],
];

export function Users() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const term = useDebounced(q.trim(), 300);
  const params = new URLSearchParams();
  if (term) params.set("q", term);
  if (role) params.set("role", role);
  const path = `/api/admin/users${params.size ? `?${params}` : ""}`;
  const query = useQuery<UserRow[]>(path);
  const [busy, setBusy] = useState<number | null>(null);
  const [rowError, setRowError] = useState<{ id: number; text: string } | null>(null);
  const shown = query.data ?? [];
  const filtered = !!(term || role);

  const toggle = async (u: UserRow) => {
    setBusy(u.id);
    setRowError(null);
    try {
      const row = await api<UserRow>(`/api/admin/users/${u.id}/${u.suspended ? "restore" : "suspend"}`, { method: "POST" });
      query.setData((l) => l?.map((x) => (x.id === row.id ? row : x)));
    } catch (e) {
      setRowError({ id: u.id, text: errorText(e) });
    } finally {
      setBusy(null);
    }
  };
  const action = (u: UserRow) =>
    u.suspended ? (
      <SmallButton disabled={busy === u.id} onClick={() => toggle(u)}>
        Restore
      </SmallButton>
    ) : u.role !== "admin" ? (
      <SmallButton tone="bad" disabled={busy === u.id} onClick={() => toggle(u)}>
        Suspend
      </SmallButton>
    ) : null;
  const active = (u: UserRow) => (u.last_active ? relative(u.last_active) : u.onboarded ? "Never" : "Not joined");
  const name = (u: UserRow) => u.name || u.email;

  return (
    <div>
      <PageHeader
        title="Users"
        sub={query.data ? (filtered ? `${plural(shown.length, "person matches", "people match")}.` : `${plural(shown.length, "person", "people")} on Opponium.`) : "Everyone on Opponium."}
      />
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-500" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email" className="pl-9" aria-label="Search users" />
        </div>
        <Select value={role} onChange={(e) => setRole(e.target.value)} className="sm:w-44" aria-label="Role">
          {roleFilters.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
      </div>
      <div className="mt-4">
        <Loadable q={query}>
          {() =>
            shown.length === 0 ? (
              <EmptyState title={filtered ? "No one matches" : "No users yet"}>{filtered ? "Try another name, email or role." : undefined}</EmptyState>
            ) : (
              <Table
                head={["Name", "Role", "Organisation", "Email", "Phone", "Last active", ""]}
                mobile={shown.map((u) => (
                  <MobileRow
                    key={u.id}
                    title={name(u)}
                    sub={
                      <>
                        {roleLabel[u.role]}
                        {u.organisation ? `, ${u.organisation}` : ""}
                        <br />
                        {u.email_verified ? "Email verified" : <span className="text-warn">Email not verified</span>},{" "}
                        {u.phone_verified ? "phone verified" : <span className="text-warn">phone not verified</span>}
                      </>
                    }
                    meta={u.suspended ? <span className="text-[13px] font-medium text-bad">Suspended</span> : <span className="tnum text-[13px] text-grey-500">{active(u)}</span>}
                    actions={
                      action(u) || rowError?.id === u.id ? (
                        <>
                          {action(u)}
                          {rowError?.id === u.id && <InlineError className="basis-full">{rowError.text}</InlineError>}
                        </>
                      ) : undefined
                    }
                  />
                ))}
              >
                {shown.map((u) => (
                  <tr key={u.id}>
                    <td className={td}>
                      <p className="font-medium">{name(u)}</p>
                      <p className="text-[13px] text-grey-500">{u.email}</p>
                    </td>
                    <td className={cx(td, "text-grey-700")}>{roleLabel[u.role]}</td>
                    <td className={cx(td, "text-grey-700")}>{u.organisation || "None"}</td>
                    <td className={cx(td, "text-[13px]")}>{u.email_verified ? "Verified" : <span className="text-warn">Not verified</span>}</td>
                    <td className={cx(td, "text-[13px]")}>{u.phone_verified ? "Verified" : <span className="text-warn">Not verified</span>}</td>
                    <td className={cx(td, "tnum whitespace-nowrap text-grey-600")}>{active(u)}</td>
                    <td className={cx(td, "text-right")}>
                      <div className="flex items-center justify-end gap-3">
                        {u.suspended && <span className="text-[13px] font-medium text-bad">Suspended</span>}
                        {action(u)}
                      </div>
                      {rowError?.id === u.id && <InlineError className="mt-2">{rowError.text}</InlineError>}
                    </td>
                  </tr>
                ))}
              </Table>
            )
          }
        </Loadable>
      </div>
    </div>
  );
}

const companyStatus: Record<CompanyRow["status"], string> = { active: "Active", onboarding: "Onboarding", paused: "Paused" };

function AddCompany({ onAdded, onCancel }: { onAdded: (c: CompanyRow) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className="mt-8 grid gap-3 rounded-lg border border-grey-200 p-5 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim()) {
          setError("Add the company name.");
          return;
        }
        setBusy(true);
        setError("");
        try {
          onAdded(await api<CompanyRow>("/api/admin/companies", { body: { name: name.trim(), domain: domain.trim() } }));
        } catch (err) {
          setError(errorText(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <Field label="Company name">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Kite Labs" autoFocus className={error ? "border-bad" : ""} />
      </Field>
      <Field label="Domain" optional>
        <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="kitelabs.in" />
      </Field>
      <Button disabled={busy}>{busy ? "Adding" : "Add company"}</Button>
      <Button type="button" variant="ghost" onClick={onCancel}>
        Cancel
      </Button>
      {error && <p className="text-[13px] text-bad sm:col-span-4">{error}</p>}
    </form>
  );
}

export function Companies() {
  const q = useQuery<CompanyRow[]>("/api/admin/companies");
  const { refreshCounts, settings } = useAdmin();
  const [adding, setAdding] = useState(false);
  const list = q.data ?? [];
  const rate = (c: CompanyRow) => c.reply_rate;
  return (
    <div>
      <PageHeader
        title="Companies"
        sub={`Reply rate is the share of applications answered within ${settings.data?.reply_hours ?? 48} hours, last 30 days.`}
        actions={!adding && <Button onClick={() => setAdding(true)}>Add company</Button>}
      />
      {adding && (
        <AddCompany
          onCancel={() => setAdding(false)}
          onAdded={(c) => {
            q.setData((l) => [...(l ?? []), c].sort((a, b) => a.name.localeCompare(b.name)));
            setAdding(false);
            refreshCounts();
          }}
        />
      )}
      <div className="mt-8">
        <Loadable q={q}>
          {() =>
            list.length === 0 ? (
              <EmptyState title="No companies yet">Add the first company, then invite its recruiters.</EmptyState>
            ) : (
              <Table
                head={["Company", "Domain", "Recruiters", "Open jobs", "Open applications", "Reply rate", "Status"]}
                mobile={list.map((c) => {
                  const r = rate(c);
                  return (
                    <MobileRow
                      key={c.id}
                      title={c.name}
                      sub={`${c.domain ? `${c.domain}, ` : ""}${plural(c.recruiters, "recruiter", "recruiters")}, ${plural(c.open_jobs, "open job", "open jobs")}`}
                      meta={
                        r === null ? (
                          <span className="text-[13px] text-grey-500">{c.status === "active" ? "No data" : companyStatus[c.status]}</span>
                        ) : (
                          <span className={cx("tnum text-[14px] font-medium", r < 85 && "text-warn")}>{r}% on time</span>
                        )
                      }
                    />
                  );
                })}
              >
                {list.map((c) => {
                  const r = rate(c);
                  return (
                    <tr key={c.id}>
                      <td className={cx(td, "font-medium")}>{c.name}</td>
                      <td className={cx(td, "text-grey-600")}>{c.domain || "None"}</td>
                      <td className={cx(td, "tnum")}>{c.recruiters}</td>
                      <td className={cx(td, "tnum")}>{c.open_jobs}</td>
                      <td className={cx(td, "tnum")}>{c.open_applications}</td>
                      <td className={td}>
                        {r === null ? (
                          <span className="text-grey-400">No data</span>
                        ) : (
                          <div className="flex items-center gap-3">
                            <div className="h-1.5 w-20 rounded-full bg-grey-200">
                              <div className={cx("h-1.5 rounded-full", r < 85 ? "bg-warn" : "bg-ink")} style={{ width: `${r}%` }} />
                            </div>
                            <span className={cx("tnum text-[13px]", r < 85 && "font-medium text-warn")}>{r}%</span>
                          </div>
                        )}
                      </td>
                      <td className={cx(td, "text-right text-[13px] text-grey-600")}>{companyStatus[c.status]}</td>
                    </tr>
                  );
                })}
              </Table>
            )
          }
        </Loadable>
      </div>
    </div>
  );
}

export function Sla() {
  const q = useQuery<Application[]>("/api/admin/sla");
  const { refreshCounts, settings } = useAdmin();
  const soonH = useDueSoonHours();
  const replyH = settings.data?.reply_hours ?? 48;
  const [busy, setBusy] = useState<number | null>(null);
  const [rowError, setRowError] = useState<{ id: number; text: string } | null>(null);
  const rows = [...(q.data ?? [])].sort((a, b) => a.reply_due_at.localeCompare(b.reply_due_at));

  const nudge = async (a: Application) => {
    setBusy(a.id);
    setRowError(null);
    try {
      const r = await api<{ nudged_at: string }>(`/api/admin/sla/${a.id}/nudge`, { method: "POST" });
      q.setData((l) => l?.map((x) => (x.id === a.id ? { ...x, nudged_at: r.nudged_at } : x)));
      refreshCounts();
    } catch (e) {
      setRowError({ id: a.id, text: errorText(e) });
    } finally {
      setBusy(null);
    }
  };
  const nudgeCell = (a: Application) =>
    a.nudged_at ? (
      <span className="inline-flex items-center gap-1 whitespace-nowrap text-[13px] text-grey-500">
        <Check size={13} /> Nudged {relative(a.nudged_at)}
      </span>
    ) : (
      <SmallButton disabled={busy === a.id} onClick={() => nudge(a)}>
        {a.owner ? `Nudge ${a.owner.name.split(" ")[0]}` : "Nudge"}
      </SmallButton>
    );
  const ownerName = (a: Application) => a.owner?.name ?? "No owner";

  return (
    <div>
      <PageHeader title="Reply breaches" sub={`Applications past, or within ${soonH} hours of, the ${replyH}-hour reply deadline.`} />
      <div className="mt-8">
        <Loadable q={q}>
          {() =>
            rows.length === 0 ? (
              <EmptyState title="No breaches right now">Every open application is on track for a reply.</EmptyState>
            ) : (
              <Table
                head={["Candidate", "Company and job", "Stage", "Owner", "Deadline", "Status", ""]}
                min={900}
                mobile={rows.map((a) => (
                  <MobileRow
                    key={a.id}
                    title={a.candidate.name}
                    sub={`${a.job.company}, ${a.job.title}, ${a.owner ? `owner ${a.owner.name}` : "no owner"}`}
                    meta={<SlaLabel app={a} />}
                    actions={
                      <>
                        {nudgeCell(a)}
                        {rowError?.id === a.id && <InlineError className="basis-full">{rowError.text}</InlineError>}
                      </>
                    }
                  />
                ))}
              >
                {rows.map((a) => (
                  <tr key={a.id}>
                    <td className={cx(td, "font-medium")}>{a.candidate.name}</td>
                    <td className={td}>
                      <p>{a.job.company}</p>
                      <p className="text-[13px] text-grey-500">{a.job.title}</p>
                    </td>
                    <td className={cx(td, "text-grey-700")}>{a.stage_label}</td>
                    <td className={cx(td, a.owner ? "text-grey-700" : "text-grey-400")}>{ownerName(a)}</td>
                    <td className={cx(td, "tnum whitespace-nowrap text-grey-600")}>{formatDateTime(a.reply_due_at)}</td>
                    <td className={td}>
                      <SlaLabel app={a} />
                    </td>
                    <td className={cx(td, "text-right")}>
                      {nudgeCell(a)}
                      {rowError?.id === a.id && <InlineError className="mt-2">{rowError.text}</InlineError>}
                    </td>
                  </tr>
                ))}
              </Table>
            )
          }
        </Loadable>
      </div>
      <p className="mt-4 text-[13px] text-grey-500">
        A nudge emails the owner and logs it. Once {replyH} hours pass, the candidate's tracker shows a "running late" notice automatically.
      </p>
    </div>
  );
}

export function Lookup() {
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const query = useQuery<Application[]>(term ? `/api/admin/applications?q=${encodeURIComponent(term)}` : null);
  const [openId, setOpenId] = useState<number | null>(null);
  const found = term ? (query.data ?? []) : [];
  const open = found.find((a) => a.id === openId) ?? found[0];
  return (
    <div>
      <PageHeader title="Application lookup" sub="For support. Shows exactly what the candidate sees. Read only." />
      <form
        className="relative mt-8 max-w-lg"
        onSubmit={(e) => {
          e.preventDefault();
          const t = q.trim().replace(/^#/, "");
          setOpenId(null);
          if (t === term) query.reload();
          else setTerm(t);
        }}
      >
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-500" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Candidate email or application ID"
          className="pl-9 pr-24"
         
          enterKeyHint="search"
          aria-label="Candidate email or application ID"
        />
        <button className="absolute right-1 top-1 h-8 rounded-full px-3.5 text-[13px] font-medium hover:bg-grey-100">Search</button>
      </form>
      <div className="mt-8">
        {!term ? (
          <p className="text-[14px] text-grey-500">Search by the full email the candidate applied with, or an application ID.</p>
        ) : query.error && !query.data ? (
          <ErrorState error={query.error} onRetry={query.reload} />
        ) : query.loading && !query.data ? (
          <Placeholder rows={3} className="max-w-[320px]" />
        ) : (
          <div className="grid gap-8 lg:grid-cols-[320px_1fr] [&>*]:min-w-0">
            <ul className="divide-y divide-grey-200 border-y border-grey-200">
              {found.map((a) => (
                <li key={a.id}>
                  <button onClick={() => setOpenId(a.id)} className={cx("w-full px-2 py-3 text-left hover:bg-grey-50", open?.id === a.id && "bg-grey-100")}>
                    <p className="text-[14px] font-medium">
                      {a.job.title}, {a.job.company}
                    </p>
                    <p className="tnum text-[13px] text-grey-500">
                      ID {a.id}, {a.stage_label}
                    </p>
                  </button>
                </li>
              ))}
              {found.length === 0 && <li className="py-6 text-[14px] text-grey-500">No applications match.</li>}
            </ul>
            {open && (
              <div className="rounded-lg border border-grey-200 p-5">
                <p className="font-medium">{open.candidate.name}</p>
                <p className="break-words text-[13px] text-grey-500">{open.candidate.email}</p>
                <p className="tnum mt-1 text-[13px] text-grey-500">
                  Applied {formatDateTime(open.applied_at)}, reply due {formatDateTime(open.reply_due_at)}
                  {open.sla === "overdue" ? ", overdue" : ""}
                </p>
                <div className="mt-6">
                  <Stepper stage={open.stage} status={open.status} />
                </div>
                <div className="mt-8 border-t border-grey-200 pt-6">
                  {open.events.length ? <ActivityFeed signals={open.events} /> : <p className="text-[14px] text-grey-500">No activity yet.</p>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function Audit() {
  const [q, setQ] = useState("");
  const term = useDebounced(q.trim(), 300);
  const query = useQuery<AuditRow[]>(`/api/admin/audit${term ? `?q=${encodeURIComponent(term)}` : ""}`);
  const shown = query.data ?? [];
  return (
    <div>
      <PageHeader
        title="Audit log"
        sub="Every invite, stage move, signal and setting change. Entries can't be edited or deleted."
        actions={
          <Button
            variant="secondary"
            disabled={!shown.length}
            onClick={() =>
              downloadCsv(`opponium-audit-${new Date().toISOString().slice(0, 10)}.csv`, [
                ["Time", "Actor", "Action", "Target", "Detail"],
                ...shown.map((l) => [l.at, l.actor, l.action, l.target, l.detail]),
              ])
            }
          >
            Export CSV
          </Button>
        }
      />
      <div className="relative mt-8 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-500" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by person, action or target" className="pl-9" aria-label="Filter audit log" />
      </div>
      <div className="mt-4">
        <Loadable q={query}>
          {() =>
            shown.length === 0 ? (
              <EmptyState title={term ? "No entries match" : "No activity yet"} />
            ) : (
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
            )
          }
        </Loadable>
      </div>
    </div>
  );
}

function SettingsForm({ initial, onSaved }: { initial: PlatformSettings; onSaved: (s: PlatformSettings) => void }) {
  const [replyH, setReplyH] = useState(String(initial.reply_hours));
  const [soonH, setSoonH] = useState(String(initial.due_soon_hours));
  const [email, setEmail] = useState(initial.email_template);
  const [sms, setSms] = useState(initial.sms_template);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ code: string; text: string } | null>(null);
  const bad = (code: string) => (error?.code === code ? "border-bad" : "");
  return (
    <form
      className="mt-8 space-y-12"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        setSaved(false);
        try {
          const s = await api<PlatformSettings>("/api/admin/settings", {
            method: "PUT",
            body: { reply_hours: replyH, due_soon_hours: soonH, email_template: email, sms_template: sms },
          });
          onSaved(s);
          setReplyH(String(s.reply_hours));
          setSoonH(String(s.due_soon_hours));
          setSaved(true);
        } catch (err) {
          const code = err && typeof err === "object" && "code" in err ? String(err.code) : "";
          setError({ code, text: errorText(err) });
        } finally {
          setBusy(false);
        }
      }}
      onChange={() => setSaved(false)}
    >
      <section>
        <h2 className="text-[18px] font-semibold">Reply deadline</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Reply within (hours)" hint="Counted from submission to the first reply beyond “Viewed”.">
            <Input type="number" inputMode="numeric" min={1} value={replyH} onChange={(e) => setReplyH(e.target.value)} className={cx("tnum", bad("hours"))} />
          </Field>
          <Field label="Due soon warning (hours left)">
            <Input type="number" inputMode="numeric" min={1} value={soonH} onChange={(e) => setSoonH(e.target.value)} className={cx("tnum", bad("hours"))} />
          </Field>
        </div>
      </section>
      <section>
        <h2 className="text-[18px] font-semibold">Stages</h2>
        <p className="mt-1 text-[14px] text-grey-600">The same five stages apply to every company. Candidates see these names. They're fixed and can't be renamed here.</p>
        <ol className="mt-4 space-y-2">
          {initial.stages.map((s, i) => (
            <li key={s.key} className="flex items-center gap-3">
              <span className="tnum w-5 text-[13px] text-grey-500">{i + 1}</span>
              <Input value={s.label} readOnly aria-label={`Stage ${i + 1}`} />
            </li>
          ))}
        </ol>
      </section>
      <section>
        <h2 className="text-[18px] font-semibold">Messages</h2>
        <div className="mt-4 space-y-4">
          <Field label="Email code" hint="Sent through Resend. {code} is replaced with the 6 digits.">
            <Textarea value={email} onChange={(e) => setEmail(e.target.value)} className={bad("template")} />
          </Field>
          <Field label="SMS code" hint="Sent through 2Factor. Keep it under 160 characters.">
            <Textarea value={sms} onChange={(e) => setSms(e.target.value)} className={bad("template")} />
          </Field>
        </div>
      </section>
      <div className="flex flex-wrap items-center gap-4 border-t border-grey-200 pt-6">
        <Button disabled={busy}>{busy ? "Saving" : "Save changes"}</Button>
        {saved && (
          <span className="inline-flex items-center gap-1.5 text-[14px] text-ok">
            <Check size={15} /> Saved
          </span>
        )}
        <InlineError className="text-[14px]">{error?.text}</InlineError>
      </div>
    </form>
  );
}

export function Settings() {
  const { settings } = useAdmin();
  return (
    <div className="max-w-3xl">
      <PageHeader title="Settings" />
      <div className="mt-2">
        <Loadable q={settings} rows={3}>
          {(s) => <SettingsForm initial={s} onSaved={(n) => settings.setData(n)} />}
        </Loadable>
      </div>
    </div>
  );
}

type VerifyResult = { next: string; access?: string; refresh?: string; user?: User };

export function Login() {
  const nav = useNavigate();
  const location = useLocation();
  const { auth, signIn } = useAdmin();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const from = (location.state as { from?: string } | null)?.from;

  useEffect(() => {
    if (step !== "code") return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [step]);

  if (auth.status === "in") return <Navigate to={from && from !== "/login" ? from : "/"} replace />;

  const wait = Math.max(0, Math.ceil((resendAt - now) / 1000));

  const start = (ch: Challenge) => {
    setChallenge(ch);
    setResendAt(Date.now() + (ch.resend_in ?? 30) * 1000);
    setNow(Date.now());
  };

  const verify = async (value: string) => {
    if (!challenge) return;
    setBusy(true);
    setError("");
    setNote("");
    try {
      const r = await api<VerifyResult>("/api/auth/otp/verify", { body: { challenge: challenge.challenge, code: value } });
      if (!r.access || !r.refresh || !r.user) throw new Error("bad");
      if (r.user.role !== "admin") {
        setError("This email doesn't have admin access.");
        setCode("");
        return;
      }
      signIn(r.access, r.refresh, r.user);
      nav(from && from !== "/login" ? from : "/", { replace: true });
    } catch (e) {
      setError(errorText(e));
      setCode("");
    } finally {
      setBusy(false);
    }
  };

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
                noValidate
                onSubmit={async (e) => {
                  e.preventDefault();
                  const value = email.trim();
                  if (!/^\S+@\S+\.\S+$/.test(value)) {
                    setError("Enter your full work email.");
                    return;
                  }
                  setBusy(true);
                  setError("");
                  try {
                    start(await api<Challenge>("/api/auth/login", { body: { email: value, admin: true } }));
                    setCode("");
                    setStep("code");
                  } catch (err) {
                    setError(errorText(err));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Field label="Work email">
                  <Input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                    }}
                    placeholder="you@opponium.com"
                    className={error ? "border-bad" : ""}
                    autoFocus
                  />
                </Field>
                {error && <InlineError>{error}</InlineError>}
                <Button className="w-full" disabled={busy}>
                  {busy ? "Sending code" : "Email me a code"}
                </Button>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-[28px] font-semibold">Check your email</h1>
              <p className="mt-2 break-words text-grey-600">Enter the 6-digit code we sent to {email.trim()}.</p>
              <div className="mt-8">
                <OtpBoxes
                  value={code}
                  error={!!error}
                  onChange={(v) => {
                    if (busy) return;
                    setCode(v);
                    if (v.length) setError("");
                    if (v.length === 6) verify(v);
                  }}
                />
              </div>
              {error ? <InlineError className="mt-3">{error}</InlineError> : note && <p className="mt-3 text-[13px] text-grey-600">{note}</p>}
              {busy && <p className="mt-3 text-[13px] text-grey-500">Checking</p>}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-[14px]">
                <button
                  className="py-2 text-grey-600 underline underline-offset-2 hover:text-ink disabled:no-underline disabled:opacity-60"
                  disabled={wait > 0 || busy}
                  onClick={async () => {
                    if (!challenge) return;
                    setError("");
                    setNote("");
                    try {
                      start(await api<Challenge>("/api/auth/otp/resend", { body: { challenge: challenge.challenge } }));
                      setCode("");
                      setNote("We sent a new code.");
                    } catch (e) {
                      setError(errorText(e));
                    }
                  }}
                >
                  {wait > 0 ? `Resend code in ${wait}s` : "Resend code"}
                </button>
                <button
                  className="py-2 text-grey-600 underline underline-offset-2 hover:text-ink"
                  onClick={() => {
                    setStep("email");
                    setError("");
                    setNote("");
                    setCode("");
                  }}
                >
                  Use a different email
                </button>
              </div>
            </>
          )}
          <WakeNotice className="mt-6" />
        </div>
      </main>
    </div>
  );
}
