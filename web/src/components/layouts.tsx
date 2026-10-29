import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { Bell, Menu, X } from "lucide-react";
import { LogoMark, Wordmark } from "./Logo";
import { Initials, cx } from "./ui";
import { applications, jobById, pipeline } from "../data/mock";
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

/** Small strip so reviewers can jump between sample screens. Removed once real auth ships. */
export function PreviewStrip() {
  return (
    <div className="border-b border-grey-200 bg-grey-50 text-[12px] text-grey-600">
      <div className="mx-auto flex h-8 max-w-6xl items-center justify-between px-4 sm:px-6">
        <span>Design preview with sample data</span>
        <Link to="/screens" className="py-2 font-medium text-ink underline underline-offset-2">
          All screens
        </Link>
      </div>
    </div>
  );
}

const navLink = ({ isActive }: { isActive: boolean }) =>
  cx("py-2 text-[14px] transition-colors", isActive ? "text-ink font-medium" : "text-grey-600 hover:text-ink");

export function CandidateLayout() {
  return (
    <div className="min-h-dvh">
      <PreviewStrip />
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

export function RecruiterLayout() {
  const [open, setOpen] = useState(false);
  const overdue = pipeline.filter((a) => slaState(a) !== "replied").length;
  const links = (
    <>
      <NavLink to="/r/inbox" className={sideLink} onClick={() => setOpen(false)}>
        <span>Inbox</span>
        {overdue > 0 && <span className="tnum rounded-full bg-ink px-1.5 text-[12px] leading-5 text-paper">{overdue}</span>}
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
      <PreviewStrip />
      <div className="lg:flex">
        <aside className="hidden w-60 shrink-0 border-r border-grey-200 lg:block">
          <div className="sticky top-0 flex h-dvh flex-col px-4 py-5">
            <Brand to="/r/inbox" />
            <div className="mt-8 flex items-center gap-2.5 rounded-md border border-grey-200 px-2 py-2">
              <span className="flex h-6 w-6 items-center justify-center rounded bg-ink font-display text-[12px] font-semibold text-paper">K</span>
              <span className="text-[14px] font-medium">Kite Labs</span>
            </div>
            <nav className="mt-4 flex flex-col gap-0.5">{links}</nav>
            <div className="mt-auto flex items-center gap-2.5 border-t border-grey-200 px-2 pt-4">
              <Initials name="Priya Nair" size={28} />
              <div className="leading-tight">
                <div className="text-[13px] font-medium">Priya Nair</div>
                <div className="text-[12px] text-grey-500">Recruiter</div>
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
        {open && <nav className="flex flex-col gap-0.5 border-b border-grey-200 p-3 lg:hidden">{links}</nav>}
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
      <PreviewStrip />
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
  const [open, setOpen] = useState<"bell" | "me" | null>(null);
  const toggle = (m: "bell" | "me") => setOpen(open === m ? null : m);
  const recent = applications
    .flatMap((a) => a.signals.map((s) => ({ ...s, app: a })))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 4);
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
        <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-ink" />
      </button>
      <button onClick={() => toggle("me")} className="rounded-full" aria-label="Account" aria-expanded={open === "me"}>
        <Initials name="Aarav Mehta" size={34} />
      </button>
      {open === "bell" && (
        <div className="absolute right-0 top-12 z-20 w-[min(340px,calc(100vw-32px))] rounded-lg border border-grey-200 bg-paper shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
          <p className="border-b border-grey-200 px-4 py-3 text-[14px] font-medium">Updates</p>
          <ul className="divide-y divide-grey-200">
            {recent.map((r) => (
              <li key={r.app.id + r.id}>
                <Link to={`/applications/${r.app.id}`} onClick={() => setOpen(null)} className="block px-4 py-3 hover:bg-grey-50">
                  <p className="text-[14px]">{r.text}</p>
                  <p className="tnum text-[12px] text-grey-500">
                    {jobById(r.app.jobId).company}, {relative(r.at)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {open === "me" && (
        <div className="absolute right-0 top-12 z-20 w-60 rounded-lg border border-grey-200 bg-paper py-1 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
          <div className="border-b border-grey-200 px-4 py-3">
            <p className="text-[14px] font-medium">Aarav Mehta</p>
            <p className="truncate text-[13px] text-grey-500">aarav.mehta@iitm.ac.in</p>
          </div>
          <Link to="/onboarding" className="block px-4 py-2.5 text-[14px] hover:bg-grey-50">
            Edit profile
          </Link>
          <Link to="/" className="block px-4 py-2.5 text-[14px] hover:bg-grey-50">
            Sign out
          </Link>
        </div>
      )}
    </div>
  );
}
