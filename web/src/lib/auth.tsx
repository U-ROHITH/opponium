import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Role, Tokens, User } from "../data/types";
import { api, clearTokens, hasToken, onSessionLost, setTokens } from "./api";
import { loginFlow, signupFlow } from "./flow";

export const ADMIN_URL = "https://opponium-admin.vercel.app";

interface AuthValue {
  user: User | null;
  ready: boolean;
  error: unknown;
  retry: () => void;
  signIn: (t: Tokens) => void;
  signOut: () => void;
  setUser: (u: User) => void;
}

const Ctx = createContext<AuthValue | null>(null);

export function homeFor(role: Role) {
  if (role === "candidate") return "/jobs";
  if (role === "recruiter" || role === "hiring_manager") return "/r/inbox";
  return "/admin";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!hasToken());
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(() => {
    if (!hasToken()) {
      setReady(true);
      return;
    }
    setReady(false);
    setError(null);
    api
      .get<User>("/api/auth/me")
      .then((u) => setUser(u))
      .catch((e) => {
        if (e?.status !== 401) setError(e);
      })
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => onSessionLost(() => setUser(null)), []);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      ready,
      error,
      retry: load,
      signIn: (t) => {
        setTokens(t);
        setError(null);
        setUser(t.user);
        signupFlow.clear();
        loginFlow.clear();
      },
      signOut: () => {
        clearTokens();
        setUser(null);
      },
      setUser,
    }),
    [user, ready, error, load],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth outside AuthProvider");
  return v;
}

/** Only for pages behind a guard, where a user is always present. */
export function useMe() {
  const { user } = useAuth();
  return user as User;
}
