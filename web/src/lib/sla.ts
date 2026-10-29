import type { Application, SlaState } from "../data/types";
import { durationHours, hoursFromNow } from "./time";

export type { SlaState };

export const DUE_SOON_HOURS = 8;

type SlaApp = Pick<Application, "sla" | "first_reply_at" | "reply_due_at" | "applied_at" | "status">;

/** The API's `sla` field wins. The local fallback uses the same rule with the real clock. */
export function slaState(app: SlaApp): SlaState {
  if (app.sla) return app.sla;
  if (app.first_reply_at) return "replied";
  if (app.status === "withdrawn") return "closed";
  const left = hoursFromNow(app.reply_due_at);
  if (left < 0) return "overdue";
  if (left < DUE_SOON_HOURS) return "due_soon";
  return "on_track";
}

export function slaText(app: SlaApp) {
  const state = slaState(app);
  const left = hoursFromNow(app.reply_due_at);
  switch (state) {
    case "replied": {
      if (!app.first_reply_at) return "Replied";
      const took = durationHours(app.applied_at, app.first_reply_at);
      return took > 48 ? `Replied late, ${took}h` : took < 1 ? "Replied in under 1h" : `Replied in ${took}h`;
    }
    case "closed":
      return "Closed";
    case "overdue":
      return `Overdue ${Math.max(1, Math.round(-left))}h`;
    default:
      return `Due in ${Math.max(1, Math.round(left))}h`;
  }
}
