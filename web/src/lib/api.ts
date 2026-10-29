export const API_URL = (import.meta.env.VITE_API_URL || "https://opponium-api.onrender.com").replace(/\/+$/, "");

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(message: string, code = "error", status = 0) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

export const errorText = (e: unknown) => (e instanceof Error && e.message ? e.message : "Something went wrong. Try again.");

// Storage ------------------------------------------------------------------

function safe(kind: "local" | "session") {
  const get = () => (kind === "local" ? window.localStorage : window.sessionStorage);
  return {
    get(key: string): string | null {
      try {
        return get().getItem(key);
      } catch {
        return null;
      }
    },
    set(key: string, value: string) {
      try {
        get().setItem(key, value);
      } catch {
        // storage blocked, the app still works for this page load
      }
    },
    remove(key: string) {
      try {
        get().removeItem(key);
      } catch {
        // ignore
      }
    },
  };
}

export const local = safe("local");
export const session = safe("session");

const ACCESS = "opp.access";
const REFRESH = "opp.refresh";

// Kept in memory too, so a blocked localStorage still allows a session.
let memAccess: string | null = local.get(ACCESS);
let memRefresh: string | null = local.get(REFRESH);

export function setTokens(t: { access: string; refresh?: string }) {
  memAccess = t.access;
  local.set(ACCESS, t.access);
  if (t.refresh) {
    memRefresh = t.refresh;
    local.set(REFRESH, t.refresh);
  }
}

export function clearTokens() {
  memAccess = memRefresh = null;
  local.remove(ACCESS);
  local.remove(REFRESH);
}

export const hasToken = () => Boolean(memAccess || memRefresh);

const lostListeners = new Set<() => void>();
export function onSessionLost(fn: () => void) {
  lostListeners.add(fn);
  return () => {
    lostListeners.delete(fn);
  };
}

// Cold start notice ---------------------------------------------------------

let pending = 0;
let waking = false;
let wokeOnce = false;
const wakeListeners = new Set<() => void>();
const emitWake = () => wakeListeners.forEach((fn) => fn());

export const wakeStore = {
  subscribe(fn: () => void) {
    wakeListeners.add(fn);
    return () => {
      wakeListeners.delete(fn);
    };
  },
  get: () => waking,
};

function track<T>(p: Promise<T>): Promise<T> {
  pending++;
  const timer = window.setTimeout(() => {
    if (!wokeOnce && !waking) {
      waking = true;
      emitWake();
    }
  }, 4000);
  return p.finally(() => {
    pending--;
    window.clearTimeout(timer);
    if (pending === 0 && waking) {
      waking = false;
      wokeOnce = true;
      emitWake();
    }
  });
}

// Requests ------------------------------------------------------------------

let refreshing: Promise<boolean> | null = null;

function refreshOnce(): Promise<boolean> {
  if (!memRefresh) return Promise.resolve(false);
  if (!refreshing) {
    refreshing = fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ refresh: memRefresh }),
    })
      .then(async (r) => {
        if (!r.ok) return false;
        const data = await r.json();
        if (!data.access) return false;
        setTokens({ access: data.access, refresh: data.refresh });
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

type Options = { auth?: boolean };

async function send<T>(method: string, path: string, body: unknown, opts: Options, retried = false): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  if (body !== undefined && !isForm) headers["Content-Type"] = "application/json";
  const useAuth = opts.auth !== false;
  if (useAuth && memAccess) headers.Authorization = `Bearer ${memAccess}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("We couldn't reach Opponium. Check your connection and try again.", "network", 0);
  }

  if (res.status === 401 && useAuth && (memAccess || memRefresh)) {
    if (!retried && (await refreshOnce())) return send<T>(method, path, body, opts, true);
    clearTokens();
    lostListeners.forEach((fn) => fn());
    throw new ApiError("Your session ended. Sign in again.", "session_expired", 401);
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
    const d = (data ?? {}) as { error?: string; detail?: string; code?: string };
    const fallback = res.status >= 500 ? "Something went wrong on our side. Try again in a minute." : "Something went wrong. Try again.";
    throw new ApiError(d.error || d.detail || fallback, d.code || `http_${res.status}`, res.status);
  }
  return data as T;
}

function request<T>(method: string, path: string, body?: unknown, opts: Options = {}) {
  return track(send<T>(method, path, body, opts));
}

export const api = {
  get: <T>(path: string, opts?: Options) => request<T>("GET", path, undefined, opts),
  post: <T>(path: string, body?: unknown, opts?: Options) => request<T>("POST", path, body ?? {}, opts),
  patch: <T>(path: string, body: unknown, opts?: Options) => request<T>("PATCH", path, body, opts),
};
