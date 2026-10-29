import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

const BASE = (import.meta.env.VITE_API_URL ?? "https://opponium-api.onrender.com").replace(/\/+$/, "");

const ACCESS = "opponium.admin.access";
const REFRESH = "opponium.admin.refresh";

function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Storage blocked. The session lasts until the tab closes.
  }
}

let memAccess = read(ACCESS);
let memRefresh = read(REFRESH);

export function setTokens(access: string, refresh?: string) {
  memAccess = access;
  write(ACCESS, access);
  if (refresh) {
    memRefresh = refresh;
    write(REFRESH, refresh);
  }
}

export function clearTokens() {
  memAccess = null;
  memRefresh = null;
  write(ACCESS, null);
  write(REFRESH, null);
}

export const hasToken = () => !!memAccess;

/* Called when the session can't be saved, so the app can send people to /login. */
const logoutListeners = new Set<() => void>();
export function onLogout(fn: () => void) {
  logoutListeners.add(fn);
  return () => {
    logoutListeners.delete(fn);
  };
}

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

/* Slow request tracking, for the cold start notice. */
let slow = 0;
const slowListeners = new Set<() => void>();
const emitSlow = () => slowListeners.forEach((fn) => fn());
function subscribeSlow(fn: () => void) {
  slowListeners.add(fn);
  return () => {
    slowListeners.delete(fn);
  };
}
export function useServerWaking() {
  return useSyncExternalStore(subscribeSlow, () => slow > 0);
}

let refreshing: Promise<boolean> | null = null;
function refreshAccess() {
  if (!memRefresh) return Promise.resolve(false);
  refreshing ??= fetch(`${BASE}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: memRefresh }),
  })
    .then(async (r) => {
      if (!r.ok) return false;
      const d = (await r.json()) as { access?: string; refresh?: string };
      if (!d.access) return false;
      setTokens(d.access, d.refresh);
      return true;
    })
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

async function send(path: string, init: RequestInit) {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (memAccess) headers.set("Authorization", `Bearer ${memAccess}`);
  return fetch(`${BASE}${path}`, { ...init, headers });
}

export async function api<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const init: RequestInit = { method: opts.method ?? (opts.body !== undefined ? "POST" : "GET") };
  if (opts.body !== undefined) init.body = JSON.stringify(opts.body);

  let marked = false;
  const timer = setTimeout(() => {
    marked = true;
    slow += 1;
    emitSlow();
  }, 4000);

  try {
    let res: Response;
    try {
      const authed = !!memAccess;
      res = await send(path, init);
      if (res.status === 401 && authed && !path.startsWith("/api/auth/login") && !path.startsWith("/api/auth/otp")) {
        if (await refreshAccess()) res = await send(path, init);
        if (res.status === 401) {
          clearTokens();
          logoutListeners.forEach((fn) => fn());
        }
      }
    } catch {
      throw new ApiError("We couldn't reach the server. Check your connection and try again.", "network", 0);
    }
    const text = await res.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
    }
    if (!res.ok) {
      const d = (data ?? {}) as { error?: string; code?: string; detail?: string };
      const message =
        d.error ??
        (res.status === 401
          ? "Your session ended. Sign in again."
          : res.status === 403
            ? "You don't have access to this."
            : res.status === 404
              ? "We couldn't find that."
              : res.status === 429
                ? "Too many tries. Wait a little and try again."
                : "Something went wrong on our side. Try again.");
      throw new ApiError(message, d.code ?? `http_${res.status}`, res.status);
    }
    return data as T;
  } finally {
    clearTimeout(timer);
    if (marked) {
      slow -= 1;
      emitSlow();
    }
  }
}

/** Fetches a path and keeps the last good data while reloading. Pass null to skip. */
export function useQuery<T>(path: string | null) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(path !== null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (path === null) {
      setLoading(false);
      return;
    }
    let live = true;
    setLoading(true);
    setError(null);
    api<T>(path)
      .then((d) => {
        if (!live) return;
        setData(d);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (!live) return;
        setError(e instanceof ApiError ? e : new ApiError("Something went wrong. Try again.", "unknown", 0));
        setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [path, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading, reload, setData };
}

export function errorText(e: unknown) {
  return e instanceof ApiError ? e.message : "Something went wrong. Try again.";
}

/* Response shapes, from docs/API.md. */

export type Role = "candidate" | "recruiter" | "hiring_manager" | "admin";

export const roleLabel: Record<Role, string> = {
  candidate: "Candidate",
  recruiter: "Recruiter",
  hiring_manager: "Hiring manager",
  admin: "Admin",
};

export interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
  company: { id: number; name: string } | null;
  onboarded: boolean;
}

export interface Challenge {
  challenge: string;
  channel: "email" | "phone";
  sent_to: string;
  resend_in: number;
  resends_left: number;
}

export type StageKey = "resume" | "profile" | "hr" | "manager" | "decision";
export type AppStatus = "submitted" | "in_review" | "interviewing" | "offer" | "declined" | "withdrawn";
export type SlaState = "on_track" | "due_soon" | "overdue" | "replied" | "closed";
export type EventKind =
  | "received"
  | "viewed"
  | "reviewing_resume"
  | "reviewing_profile"
  | "interview_scheduled"
  | "step_completed"
  | "decision"
  | "withdrawn";

export interface AppEvent {
  id: number;
  kind: EventKind;
  text: string;
  at: string;
}

export interface Application {
  id: number;
  job: { id: number; title: string; company: string; location: string };
  stage: StageKey;
  stage_label: string;
  status: AppStatus;
  applied_at: string;
  reply_due_at: string;
  first_reply_at: string | null;
  sla: SlaState;
  events: AppEvent[];
  candidate: { name: string; email: string; phone: string; college: string; grad_year: number | null; city: string; linkedin: string; note: string };
  owner?: { id: number; name: string } | null;
  nudged_at?: string | null;
}

export interface AuditRow {
  id: number;
  at: string;
  actor: string;
  action: string;
  target: string;
  detail: string;
}

export interface Overview {
  open_applications: number;
  companies: number;
  due_soon: number;
  overdue: number;
  median_first_reply_hours: number | null;
  invites_pending: number;
  access_requests: number;
  attention: Application[];
  trend: { day: string; median_hours: number | null }[];
  recent: AuditRow[];
}

export type InviteStatus = "pending" | "accepted" | "expired" | "revoked";

export interface InviteRow {
  id: number;
  code: string;
  email: string;
  role: Role;
  role_label: string;
  company: string | null;
  invited_by: string;
  sent_at: string;
  status: InviteStatus;
  link: string;
}

export interface AccessRequestRow {
  id: number;
  name: string;
  email: string;
  joining_as: "candidate" | "recruiter";
  organisation: string;
  state: "pending" | "approved" | "declined";
  created_at: string;
}

export interface UserRow {
  id: number;
  name: string;
  email: string;
  role: Role;
  organisation: string;
  email_verified: boolean;
  phone_verified: boolean;
  onboarded: boolean;
  suspended: boolean;
  last_active: string | null;
}

export interface CompanyRow {
  id: number;
  name: string;
  domain: string;
  status: "onboarding" | "active" | "paused";
  recruiters: number;
  open_jobs: number;
  open_applications: number;
  reply_rate: number | null;
}

export interface PlatformSettings {
  reply_hours: number;
  due_soon_hours: number;
  email_template: string;
  sms_template: string;
  stages: { key: StageKey; label: string }[];
}
