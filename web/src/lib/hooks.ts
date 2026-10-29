import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";

export interface Loaded<T> {
  data: T | undefined;
  error: unknown;
  loading: boolean;
  reload: (quiet?: boolean) => Promise<void>;
  setData: (v: T) => void;
}

/** GET a path and keep the result. A null path waits. `reload(true)` refreshes without the loading state. */
export function useGet<T>(path: string | null): Loaded<T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const seq = useRef(0);

  const reload = useCallback(
    async (quiet = false) => {
      if (!path) return;
      const id = ++seq.current;
      if (!quiet) {
        setLoading(true);
        setError(null);
      }
      try {
        const d = await api.get<T>(path);
        if (id === seq.current) {
          setData(d);
          setError(null);
        }
      } catch (e) {
        if (id === seq.current && !quiet) setError(e);
      } finally {
        if (id === seq.current) setLoading(false);
      }
    },
    [path],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, error, loading, reload, setData };
}

/** Calls fn every `ms` while the tab is visible. */
export function usePoll(fn: () => void, ms: number) {
  const ref = useRef(fn);
  useEffect(() => {
    ref.current = fn;
  });
  useEffect(() => {
    const t = window.setInterval(() => {
      if (document.visibilityState === "visible") ref.current();
    }, ms);
    return () => window.clearInterval(t);
  }, [ms]);
}
