import type { ReactNode } from "react";
import { useServerWaking, type ApiError } from "../lib/api";
import { cx } from "./ui";

/** Quiet grey bars while a list loads. */
export function Placeholder({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cx("divide-y divide-grey-200 border-y border-grey-200", className)} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-4">
          <span className="h-8 w-8 shrink-0 rounded-full bg-grey-100" />
          <div className="min-w-0 flex-1 space-y-2">
            <span className="block h-3 rounded bg-grey-100" style={{ width: `${55 - (i % 3) * 12}%` }} />
            <span className="block h-2.5 rounded bg-grey-100" style={{ width: `${35 - (i % 2) * 10}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ title, children, className }: { title: string; children?: ReactNode; className?: string }) {
  return (
    <div className={cx("border-y border-grey-200 py-10 text-center", className)}>
      <p className="font-medium">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-sm text-[14px] text-grey-500">{children}</p>}
    </div>
  );
}

export function ErrorState({ error, onRetry, className }: { error: ApiError | null; onRetry: () => void; className?: string }) {
  return (
    <div className={cx("rounded-lg border border-grey-200 px-5 py-6", className)} role="alert">
      <p className="font-medium">This didn't load.</p>
      <p className="mt-1 text-[14px] text-grey-600">{error?.message ?? "Something went wrong. Try again."}</p>
      <button onClick={onRetry} className="mt-4 h-9 rounded-full border border-grey-300 px-4 text-[13px] font-medium hover:border-ink">
        Try again
      </button>
    </div>
  );
}

/** Loading, error and data in one place. Keeps showing old data during a reload. */
export function Loadable<T>({
  q,
  children,
  rows,
}: {
  q: { data: T | undefined; error: ApiError | null; loading: boolean; reload: () => void };
  children: (data: T) => ReactNode;
  rows?: number;
}) {
  if (q.data !== undefined) return <>{children(q.data)}</>;
  if (q.error) return <ErrorState error={q.error} onRetry={q.reload} />;
  return <Placeholder rows={rows} />;
}

/** Shows only while a request has been pending more than 4 seconds. */
export function WakeNotice({ className }: { className?: string }) {
  const waking = useServerWaking();
  if (!waking) return null;
  return (
    <p role="status" className={cx("rounded-md border border-grey-200 bg-grey-50 px-3 py-2 text-[13px] text-grey-700", className)}>
      Waking up the server. This can take up to a minute on first load.
    </p>
  );
}

export function InlineError({ children, className }: { children: ReactNode; className?: string }) {
  if (!children) return null;
  return (
    <p role="alert" className={cx("text-[13px] text-bad", className)}>
      {children}
    </p>
  );
}
