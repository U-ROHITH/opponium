import type { Application } from "../data/types";
import { durationHours, hoursFromNow } from "./time";

export type SlaState = "replied" | "on_track" | "due_soon" | "overdue";

export const DUE_SOON_HOURS = 8;

export function slaState(app: Application): SlaState {
  if (app.firstReplyAt) return "replied";
  const left = hoursFromNow(app.replyDueAt);
  if (left < 0) return "overdue";
  if (left < DUE_SOON_HOURS) return "due_soon";
  return "on_track";
}

export function slaText(app: Application) {
  const state = slaState(app);
  const left = hoursFromNow(app.replyDueAt);
  switch (state) {
    case "replied":
      return `Replied in ${durationHours(app.appliedAt, app.firstReplyAt!)}h`;
    case "overdue":
      return `Overdue ${Math.max(1, Math.round(-left))}h`;
    default:
      return `Due in ${Math.max(1, Math.round(left))}h`;
  }
}
