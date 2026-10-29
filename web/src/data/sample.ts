import type { Application, StageKey } from "./types";

// Illustrations for the public landing page only. Times are relative to the visit.
const h = (hours: number) => new Date(Date.now() + hours * 3600_000).toISOString();

function app(id: number, name: string, title: string, stage: StageKey, appliedHoursAgo: number, repliedAfter?: number): Application {
  return {
    id,
    job: { id, title, company: "Kite Labs", location: "Bengaluru, hybrid" },
    stage,
    stage_label: "",
    status: stage === "resume" ? "submitted" : "in_review",
    applied_at: h(-appliedHoursAgo),
    reply_due_at: h(48 - appliedHoursAgo),
    first_reply_at: repliedAfter === undefined ? null : h(-appliedHoursAgo + repliedAfter),
    events: [],
    candidate: { name, email: "", phone: "", college: "", grad_year: null, city: "", linkedin: "", note: "" },
    resume: { name: "", size: 0 },
  };
}

// A worked example that is easy to check: applied 1 Jan at 10 am, reply due 3 Jan at 10 am.
const ex = (day: number, hhmm: string) => `2027-01-0${day}T${hhmm}:00+05:30`;

export const sampleTracker = {
  title: "Frontend Engineer",
  company: "Kite Labs",
  appliedAt: ex(1, "10:00"),
  replyDueAt: ex(3, "10:00"),
  events: [
    { id: 3, kind: "reviewing_resume" as const, text: "Reviewing your resume", at: ex(1, "14:15") },
    { id: 4, kind: "step_completed" as const, text: "Step completed: Resume screen", at: ex(2, "10:40") },
    { id: 5, kind: "reviewing_profile" as const, text: "Reviewing your profile", at: ex(2, "16:05") },
  ],
};

export const sampleInbox: Application[] = [
  app(1, "Ishita Rao", "Frontend Engineer", "resume", 51),
  app(2, "Kabir Singh", "Frontend Engineer", "resume", 43),
  app(3, "Meera Pillai", "Backend Engineer, Payments", "resume", 12),
  app(4, "Rohan Das", "Frontend Engineer", "profile", 30, 6),
];
