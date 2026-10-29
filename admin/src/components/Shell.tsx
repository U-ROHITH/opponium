import { useState } from "react";
import { Link, NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { LogoMark, Wordmark } from "./Logo";
import { Initials, cx } from "./ui";
import { WakeNotice } from "./states";
import { useAdmin } from "../state";

const sections = (pendingRequests: number, overdue: number): { links: [string, string, number?][] }[] => [
  { links: [["/", "Overview"]] },
  {
    links: [
      ["/invites", "Invites"],
      ["/requests", "Access requests", pendingRequests],
      ["/users", "Users"],
    ],
  },
  {
    links: [
      ["/companies", "Companies"],
      ["/sla", "Reply breaches", overdue],
      ["/applications", "Application lookup"],
    ],
  },
  {
    links: [
      ["/audit", "Audit log"],
      ["/settings", "Settings"],
    ],
  },
];

const link = ({ isActive }: { isActive: boolean }) =>
  cx("flex h-9 items-center justify-between rounded-md px-2 text-[14px]", isActive ? "bg-grey-100 font-medium" : "text-grey-700 hover:bg-grey-50 hover:text-ink");

export function Brand() {
  return (
    <Link to="/" className="inline-flex min-h-10 items-center gap-2.5">
      <LogoMark className="h-6 w-auto" />
      <Wordmark className="h-[11px] w-auto" />
      <span className="rounded border border-grey-300 px-1.5 text-[12px] font-medium leading-5 text-grey-600">Admin</span>
    </Link>
  );
}

function shortName(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
}

/** Guards every page but /login: signed in, role admin. */
export function Shell() {
  const { auth, overview, signOut } = useAdmin();
  const location = useLocation();
  if (auth.status === "out") return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (auth.status === "checking")
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4">
        <span className="sr-only">Loading</span>
        <WakeNotice className="max-w-sm" />
      </div>
    );
  const pending = overview.data?.access_requests ?? 0;
  const overdue = overview.data?.overdue ?? 0;
  const user = auth.user;
  const display = user.name || user.email;
  return <Frame pending={pending} overdue={overdue} name={display} onSignOut={signOut} />;
}

function Frame({ pending, overdue, name, onSignOut }: { pending: number; overdue: number; name: string; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  const footer = (
    <div className="flex items-center gap-2.5 border-t border-grey-200 px-2 pt-4">
      <Initials name={name} size={28} />
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-[13px] font-medium">{shortName(name)}</p>
        <p className="text-[12px] text-grey-500">Admin</p>
      </div>
      <button onClick={onSignOut} className="h-8 shrink-0 rounded-full px-2.5 text-[13px] text-grey-600 hover:bg-grey-100 hover:text-ink">
        Sign out
      </button>
    </div>
  );
  const nav = (
    <nav className="divide-y divide-grey-200">
      {sections(pending, overdue).map((s, i) => (
        <div key={i} className="py-3 first:pt-0">
          <div className="space-y-0.5">
            {s.links.map(([to, label, n]) => (
              <NavLink key={to} to={to} end={to === "/"} className={link} onClick={() => setOpen(false)}>
                {label}
                {!!n && <span className="tnum text-[12px] text-grey-500">{n}</span>}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
  return (
    <div className="min-h-dvh lg:flex">
      <aside className="hidden w-56 shrink-0 border-r border-grey-200 lg:block">
        <div className="sticky top-0 flex h-dvh flex-col px-3 py-5">
          <div className="px-2">
            <Brand />
          </div>
          <div className="mt-8">{nav}</div>
          <div className="mt-auto">{footer}</div>
        </div>
      </aside>
      <header className="flex h-14 items-center justify-between border-b border-grey-200 px-4 lg:hidden">
        <Brand />
        <button onClick={() => setOpen(!open)} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-grey-100" aria-label="Menu">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>
      {open && (
        <div className="border-b border-grey-200 p-3 lg:hidden">
          {nav}
          <div className="pb-1">{footer}</div>
        </div>
      )}
      <main className="min-w-0 flex-1 px-4 py-8 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-6xl">
          <WakeNotice className="mb-6" />
          <Outlet />
        </div>
      </main>
    </div>
  );
}
