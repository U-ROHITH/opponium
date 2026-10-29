import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, clearTokens, hasToken, onLogout, setTokens, useQuery, type Overview, type PlatformSettings, type User } from "./lib/api";

type AuthState = { status: "checking" } | { status: "out" } | { status: "in"; user: User };

interface Ctx {
  auth: AuthState;
  signIn: (access: string, refresh: string, user: User) => void;
  signOut: () => void;
  overview: ReturnType<typeof useQuery<Overview>>;
  settings: ReturnType<typeof useQuery<PlatformSettings>>;
  /** Refetch shared counts (sidebar, overview) after an action. */
  refreshCounts: () => void;
}

const AdminCtx = createContext<Ctx | null>(null);

/** Session plus the counts every page shares (sidebar badges, deadlines). */
export function AdminState({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(hasToken() ? { status: "checking" } : { status: "out" });

  useEffect(() => onLogout(() => setAuth({ status: "out" })), []);

  useEffect(() => {
    if (auth.status !== "checking") return;
    let live = true;
    api<User>("/api/auth/me")
      .then((u) => {
        if (!live) return;
        if (u.role !== "admin") {
          clearTokens();
          setAuth({ status: "out" });
        } else setAuth({ status: "in", user: u });
      })
      .catch(() => {
        if (!live) return;
        clearTokens();
        setAuth({ status: "out" });
      });
    return () => {
      live = false;
    };
  }, [auth.status]);

  const signedIn = auth.status === "in";
  const overview = useQuery<Overview>(signedIn ? "/api/admin/overview" : null);
  const settings = useQuery<PlatformSettings>(signedIn ? "/api/admin/settings" : null);

  const signIn = useCallback((access: string, refresh: string, user: User) => {
    setTokens(access, refresh);
    setAuth({ status: "in", user });
  }, []);
  const signOut = useCallback(() => {
    clearTokens();
    setAuth({ status: "out" });
  }, []);

  const value = useMemo(
    () => ({ auth, signIn, signOut, overview, settings, refreshCounts: overview.reload }),
    [auth, signIn, signOut, overview, settings],
  );
  return <AdminCtx.Provider value={value}>{children}</AdminCtx.Provider>;
}

export function useAdmin() {
  const v = useContext(AdminCtx);
  if (!v) throw new Error("useAdmin outside AdminState");
  return v;
}

export function useDueSoonHours() {
  return useAdmin().settings.data?.due_soon_hours ?? 8;
}
