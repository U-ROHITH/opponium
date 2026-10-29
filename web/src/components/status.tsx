import { X, Check, CircleAlert, Clock, Eye, FileSearch, Inbox, CalendarClock, UserSearch, Flag, Minus } from "lucide-react";
import type { Application, AppStatus, Signal, SignalKind, StageKey } from "../data/types";
import { STAGES } from "../data/stages";
import { slaState, slaText } from "../lib/sla";
import { formatDateTime } from "../lib/time";
import { cx } from "./ui";

const statusLabel: Record<AppStatus, string> = {
  submitted: "Submitted",
  in_review: "In review",
  interviewing: "Interviewing",
  offer: "Offer",
  declined: "Not moving forward",
  withdrawn: "Withdrawn",
};

export function StatusChip({ status }: { status: AppStatus }) {
  const tone =
    status === "offer"
      ? "border-ok/30 text-ok"
      : status === "declined" || status === "withdrawn"
        ? "border-grey-300 text-grey-600"
        : "border-grey-300 text-ink";
  return (
    <span className={cx("inline-flex h-6 w-fit shrink-0 items-center self-start rounded-full border px-2.5 text-[12px] font-medium", tone)}>
      {statusLabel[status]}
    </span>
  );
}

export function SlaLabel({ app, className }: { app: Application; className?: string }) {
  const state = slaState(app);
  const text = slaText(app);
  const late = state === "replied" && !!app.first_reply_at && new Date(app.first_reply_at).getTime() > new Date(app.reply_due_at).getTime();
  const map = {
    replied: { cls: late ? "text-warn" : "text-grey-500", icon: <Check size={14} strokeWidth={2} /> },
    on_track: { cls: "text-grey-700", icon: <Clock size={14} strokeWidth={1.75} /> },
    due_soon: { cls: "text-warn", icon: <Clock size={14} strokeWidth={2.25} /> },
    overdue: { cls: "text-bad", icon: <CircleAlert size={14} strokeWidth={2.25} /> },
    closed: { cls: "text-grey-500", icon: <Minus size={14} strokeWidth={2} /> },
  }[state];
  return (
    <span className={cx("tnum inline-flex items-center gap-1.5 text-[13px] font-medium", map.cls, className)}>
      {map.icon}
      {text}
    </span>
  );
}

export function stageIndex(key: StageKey) {
  return STAGES.findIndex((s) => s.key === key);
}

const ended = (status?: AppStatus) => status === "declined" || status === "withdrawn";

/** Five small segments showing how far an application has moved. */
export function MiniProgress({ stage, status }: { stage: StageKey; status?: AppStatus }) {
  const idx = stageIndex(stage);
  return (
    <span className="inline-flex items-center gap-1" aria-label={`Stage ${idx + 1} of ${STAGES.length}`}>
      {STAGES.map((s, i) => (
        <span
          key={s.key}
          className={cx(
            "h-1.5 w-5 rounded-full",
            i < idx || (status === "offer" && i === idx) ? "bg-ink" : i === idx ? (ended(status) ? "bg-grey-300" : "bg-grey-500") : "bg-grey-200",
          )}
        />
      ))}
    </span>
  );
}

/** Ordered list of stages. Horizontal on wide screens, vertical on phones. */
export function Stepper({ stage, status }: { stage: StageKey; status?: AppStatus }) {
  const idx = stageIndex(stage);
  const stopped = ended(status);
  return (
    <ol className="grid gap-0 sm:grid-cols-5">
      {STAGES.map((s, i) => {
        const done = i < idx || (status === "offer" && i === idx);
        const current = i === idx && !done && !stopped;
        const endedHere = i === idx && stopped;
        const sub = done
          ? "Completed"
          : current
            ? "In progress"
            : endedHere
              ? status === "withdrawn"
                ? "Withdrawn"
                : "Not moving forward"
              : stopped
                ? "Not reached"
                : `Step ${i + 1}`;
        return (
          <li key={s.key} className="relative flex gap-3 pb-5 last:pb-0 sm:block sm:pb-0 sm:pr-3">
            {i < STAGES.length - 1 && (
              <span
                aria-hidden
                className={cx(
                  "absolute left-[11px] top-6 h-[calc(100%-24px)] w-px sm:left-6 sm:top-[11px] sm:h-px sm:w-[calc(100%-24px)]",
                  done ? "bg-ink" : "bg-grey-200",
                )}
              />
            )}
            <span
              className={cx(
                "relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                done && "border-ink bg-ink text-paper",
                current && "border-ink bg-paper",
                endedHere && "border-grey-400 bg-grey-100 text-grey-600",
                !done && !current && !endedHere && "border-grey-300 bg-paper",
              )}
            >
              {done ? <Check size={13} strokeWidth={3} /> : current ? <span className="h-2.5 w-2.5 rounded-full bg-ink" /> : endedHere ? <X size={12} strokeWidth={2.5} /> : null}
            </span>
            <span className="block sm:mt-3">
              <span className={cx("block text-[14px] leading-snug", current || endedHere ? "font-semibold" : done ? "text-ink" : "text-grey-500")}>
                {s.label}
              </span>
              <span className="mt-0.5 block text-[12px] text-grey-500">{sub}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

const signalIcon: Record<SignalKind, typeof Eye> = {
  received: Inbox,
  viewed: Eye,
  reviewing_resume: FileSearch,
  reviewing_profile: UserSearch,
  interview_scheduled: CalendarClock,
  step_completed: Check,
  decision: Flag,
  withdrawn: X,
};

export function SignalGlyph({ kind }: { kind: SignalKind }) {
  const Icon = signalIcon[kind] ?? Flag;
  return <Icon size={15} strokeWidth={1.75} className="shrink-0" />;
}

export function SignalIcon({ kind, active }: { kind: SignalKind; active?: boolean }) {
  const Icon = signalIcon[kind] ?? Flag;
  return (
    <span
      className={cx(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border",
        active ? "border-ink bg-ink text-paper" : "border-grey-300 bg-paper text-grey-700",
      )}
    >
      <Icon size={14} strokeWidth={2} />
    </span>
  );
}

export function ActivityFeed({ signals }: { signals: Signal[] }) {
  const items = [...signals].reverse();
  return (
    <ol className="relative">
      {items.map((s, i) => (
        <li key={s.id} className="relative flex gap-3 pb-5 last:pb-0">
          {i < items.length - 1 && <span aria-hidden className="absolute left-[13.5px] top-7 h-[calc(100%-28px)] w-px bg-grey-200" />}
          <SignalIcon kind={s.kind} active={i === 0} />
          <div className="pt-1">
            <p className={cx("text-[14px] leading-snug", i === 0 ? "font-medium" : "text-grey-700")}>{s.text}</p>
            <p className="tnum mt-0.5 text-[12px] text-grey-500">{formatDateTime(s.at)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
