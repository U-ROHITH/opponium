import { useEffect, useState, useSyncExternalStore } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Bell, Menu, X } from "lucide-react";
import { LogoMark, Wordmark } from "./Logo";
import { Initials, cx } from "./ui";
import type { Application } from "../data/types";
import { local, wakeStore } from "../lib/api";
import { useAuth, useMe } from "../lib/auth";
import { useGet, usePoll } from "../lib/hooks";
import { relative } from "../lib/time";
import { slaState } from "../lib/sla";

export function Brand({ to = "/" }: { to?: string }) {
  return (
    <Link to={to} className="inline-flex min-h-10 items-center gap-2.5" aria-label="Opponium home">
      <LogoMark className="h-7 w-auto" />
      <Wordmark className="h-[13px] w-auto" />
    </Link>
  );
}

/** Shown once, quietly, when the free API host is waking from sleep. */
export function WakeNotice() {
  const waking = useSyncExternalStore(wakeStore.subscribe, wakeStore.get);
  if (!waking) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4" role="status">
      <p className="max-w-[360px] rounded-md border border-grey-200 bg-paper px-4 py-2.5 text-center text-[13px] text-grey-700 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
        Waking up the server. This can take up to a minute on first load.
      </p>
    </div>
  );
}

const navLink = ({ isActive }: { isActive: boolean }) =>
  cx("py-2 text-[14px] transition-colors", isActive ? "text-ink font-medium" : "text-grey-600 hover:text-ink");

export function CandidateLayout() {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-grey-200">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-8">
            <Brand to="/jobs" />
            <nav className="hidden items-center gap-6 sm:flex">
              <NavLink to="/jobs" className={navLink}>
                Jobs
              </NavLink>
              <NavLink to="/applications" className={navLink}>
                Applications
              </NavLink>
            </nav>
          </div>
          <HeaderMenus />
        </div>
        <nav className="mx-auto flex max-w-6xl gap-6 px-4 pb-3 sm:hidden">
          <NavLink to="/jobs" className={navLink}>
            Jobs
          </NavLink>
          <NavLink to="/applications" className={navLink}>
            Applications
          </NavLink>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <Outlet />
      </main>
    </div>
  );
}

const roleLabel = (r: string) => (r === "hiring_manager" ? "Hiring manager" : r === "recruiter" ? "Recruiter" : r === "admin" ? "Admin" : "Candidate");

export function RecruiterLayout() {
  const me = useMe();
  const { signOut } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const inbox = useGet<Application[]>("/api/team/inbox");
  const { pathname } = useLocation();
  const reloadInbox = inbox.reload;
  usePoll(() => void reloadInbox(true), 60_000);
  // Keep the waiting count honest after a reply sent from another page.
  useEffect(() => {
    void reloadInbox(true);
  }, [pathname, reloadInbox]);
  const waiting = (inbox.data ?? []).filter((a) => !["replied", "closed"].includes(slaState(a))).length;
  const company = me.company?.name ?? "Your company";
  const out = () => {
    signOut();
    nav("/login");
  };
  const links = (
    <>
      <NavLink to="/r/inbox" className={sideLink} onClick={() => setOpen(false)}>
        <span>Inbox</span>
        {waiting > 0 && <span className="tnum rounded-full bg-ink px-1.5 text-[12px] leading-5 text-paper">{waiting}</span>}
      </NavLink>
      <NavLink to="/r/jobs" end className={sideLink} onClick={() => setOpen(false)}>
        Jobs
      </NavLink>
      <NavLink to="/r/team" className={sideLink} onClick={() => setOpen(false)}>
        Team
      </NavLink>
    </>
  );
  return (
    <div className="min-h-dvh">
      <div className="lg:flex">
        <aside className="hidden w-60 shrink-0 border-r border-grey-200 lg:block">
          <div className="sticky top-0 flex h-dvh flex-col px-4 py-5">
            <Brand to="/r/inbox" />
            <div className="mt-8 flex items-center gap-2.5 rounded-md border border-grey-200 px-2 py-2">
              <span className="flex h-6 w-6 items-center justify-center rounded bg-ink font-display text-[12px] font-semibold text-paper">{company[0]}</span>
              <span className="truncate text-[14px] font-medium">{company}</span>
            </div>
            <nav className="mt-4 flex flex-col gap-0.5">{links}</nav>
            <div className="mt-auto border-t border-grey-200 px-2 pt-4">
              <div className="flex items-center gap-2.5">
                <Initials name={me.name || me.email} size={28} />
                <div className="min-w-0 leading-tight">
                  <div className="truncate text-[13px] font-medium">{me.name || me.email}</div>
                  <div className="truncate text-[12px] text-grey-500">{me.title || roleLabel(me.role)}</div>
                </div>
              </div>
              <div className="mt-3 flex gap-4 text-[13px]">
                <Link to="/r/settings" className="py-1 text-grey-600 hover:text-ink">
                  Edit profile
                </Link>
                <button onClick={out} className="py-1 text-grey-600 hover:text-ink">
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </aside>
        <header className="flex h-14 items-center justify-between border-b border-grey-200 px-4 lg:hidden">
          <Brand to="/r/inbox" />
          <button className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-grey-100" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </header>
        {open && (
          <nav className="flex flex-col gap-0.5 border-b border-grey-200 p-3 lg:hidden">
            {links}
            <div className="mt-2 border-t border-grey-200 px-2 pt-3">
              <p className="truncate text-[13px] font-medium">{me.name || me.email}</p>
              <p className="truncate text-[12px] text-grey-500">
                {me.title || roleLabel(me.role)}, {company}
              </p>
            </div>
            <NavLink to="/r/settings" className={sideLink} onClick={() => setOpen(false)}>
              Edit profile
            </NavLink>
            <button onClick={out} className="flex h-9 items-center rounded-md px-2 text-left text-[14px] text-grey-700 hover:bg-grey-50 hover:text-ink">
              Sign out
            </button>
          </nav>
        )}
        <main className="min-w-0 flex-1 px-4 py-8 sm:px-8 sm:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

const sideLink = ({ isActive }: { isActive: boolean }) =>
  cx(
    "flex h-9 items-center justify-between rounded-md px-2 text-[14px]",
    isActive ? "bg-grey-100 font-medium text-ink" : "text-grey-700 hover:bg-grey-50 hover:text-ink",
  );

export function AuthLayout({ children, step }: { children: React.ReactNode; step?: string }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Brand />
        {step && <span className="tnum text-[13px] text-grey-500">{step}</span>}
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-8 sm:pt-16">
        <div className="w-full max-w-[400px]">{children}</div>
      </main>
    </div>
  );
}

function HeaderMenus() {
  const me = useMe();
  const { signOut } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState<"bell" | "me" | null>(null);
  const seenKey = `opp.seen.${me.id}`;
  const [seen, setSeen] = useState(() => local.get(seenKey) ?? "");
  const apps = useGet<Application[]>("/api/applications");
  usePoll(() => void apps.reload(true), 60_000);
  const recent = (apps.data ?? [])
    .flatMap((a) => a.events.map((s) => ({ ...s, app: a })))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 5);
  const latest = recent[0]?.at ?? "";
  const unread = latest !== "" && latest > seen;
  const toggle = (m: "bell" | "me") => {
    if (m === "bell" && open !== "bell" && latest) {
      setSeen(latest);
      local.set(seenKey, latest);
    }
    setOpen(open === m ? null : m);
  };
  return (
    <div className="relative flex items-center gap-2">
      {open && <button aria-hidden tabIndex={-1} className="fixed inset-0 z-10 cursor-default" onClick={() => setOpen(null)} />}
      <button
        onClick={() => toggle("bell")}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-grey-700 hover:bg-grey-100"
        aria-label="Updates"
        aria-expanded={open === "bell"}
      >
        <Bell size={18} strokeWidth={1.75} />
        {unread && <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-ink" />}
      </button>
      <button onClick={() => toggle("me")} className="rounded-full" aria-label="Account" aria-expanded={open === "me"}>
        <Initials name={me.name || me.email} size={34} />
      </button>
      {open === "bell" && (
        <div className="absolute right-0 top-12 z-20 w-[min(340px,calc(100vw-32px))] rounded-lg border border-grey-200 bg-paper shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
          <p className="border-b border-grey-200 px-4 py-3 text-[14px] font-medium">Updates</p>
          {apps.loading && !apps.data ? (
            <p className="px-4 py-4 text-[14px] text-grey-500">Loading</p>
          ) : recent.length === 0 ? (
            <p className="px-4 py-4 text-[14px] text-grey-500">No updates yet. When a team moves your application, it shows up here.</p>
          ) : (
            <ul className="divide-y divide-grey-200">
              {recent.map((r) => (
                <li key={`${r.app.id}-${r.id}`}>
                  <Link to={`/applications/${r.app.id}`} onClick={() => setOpen(null)} className="block px-4 py-3 hover:bg-grey-50">
                    <p className="text-[14px]">{r.text}</p>
                    <p className="tnum text-[12px] text-grey-500">
                      {r.app.job.company}, {relative(r.at)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {open === "me" && (
        <div className="absolute right-0 top-12 z-20 w-60 rounded-lg border border-grey-200 bg-paper py-1 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
          <div className="border-b border-grey-200 px-4 py-3">
            <p className="truncate text-[14px] font-medium">{me.name}</p>
            <p className="truncate text-[13px] text-grey-500">{me.email}</p>
          </div>
          <Link to="/settings" onClick={() => setOpen(null)} className="block px-4 py-2.5 text-[14px] hover:bg-grey-50">
            Edit profile
          </Link>
          <button
            onClick={() => {
              setOpen(null);
              signOut();
              nav("/login");
            }}
            className="block w-full px-4 py-2.5 text-left text-[14px] hover:bg-grey-50"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
