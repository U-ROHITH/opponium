import type { Application } from "./api";
import { durationHours, hoursFromNow } from "./time";

export function repliedLate(app: Application) {
  return !!app.first_reply_at && new Date(app.first_reply_at).getTime() > new Date(app.reply_due_at).getTime();
}

/** Text for the reply clock. The state itself comes from the API `sla` field. */
export function slaText(app: Application) {
  const left = hoursFromNow(app.reply_due_at);
  switch (app.sla) {
    case "replied": {
      const took = Math.max(0, durationHours(app.applied_at, app.first_reply_at!));
      return repliedLate(app) ? `Replied late, ${took}h` : `Replied in ${took}h`;
    }
    case "closed":
      return "Closed";
    case "overdue":
      return `Overdue ${Math.max(1, Math.round(-left))}h`;
    default:
      return `Due in ${Math.max(1, Math.round(left))}h`;
  }
}
