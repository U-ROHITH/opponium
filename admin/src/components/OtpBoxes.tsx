import { useEffect, useRef } from "react";
import { cx } from "./ui";

/** One real input (so autofill and paste work) drawn as six boxes. */
export function OtpBoxes({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <div className="relative" onClick={() => ref.current?.focus()}>
      <input
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-label="6-digit code"
        className="absolute inset-0 h-full w-full opacity-0"
        maxLength={6}
      />
      <div className="grid grid-cols-6 gap-2" aria-hidden>
        {Array.from({ length: 6 }).map((_, i) => {
          const active = i === Math.min(value.length, 5);
          return (
            <div
              key={i}
              className={cx(
                "tnum flex h-12 items-center justify-center rounded-md border text-[20px] font-medium",
                error ? "border-bad" : active ? "border-ink" : "border-grey-300",
              )}
            >
              {value[i] ?? ""}
            </div>
          );
        })}
      </div>
    </div>
  );
}
