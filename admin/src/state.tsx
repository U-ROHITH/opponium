import { createContext, useContext, useState, type ReactNode } from "react";

type Decision = "Approved" | "Declined";

const Ctx = createContext<{ decided: Record<string, Decision>; decide: (id: string, d: Decision) => void } | null>(null);

/** Holds sample-data decisions so counts in the sidebar match the page. */
export function AdminState({ children }: { children: ReactNode }) {
  const [decided, setDecided] = useState<Record<string, Decision>>({});
  return <Ctx.Provider value={{ decided, decide: (id, d) => setDecided((m) => ({ ...m, [id]: d })) }}>{children}</Ctx.Provider>;
}

export function useAdminState() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAdminState outside AdminState");
  return v;
}
