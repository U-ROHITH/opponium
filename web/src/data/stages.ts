import type { StageKey } from "./types";

export const STAGES: { key: StageKey; label: string; next: string }[] = [
  { key: "resume", label: "Resume screen", next: "A recruiter reads your resume against the role." },
  { key: "profile", label: "Profile review", next: "The team looks at your projects, links and answers." },
  { key: "hr", label: "HR interview", next: "A 20 to 30 minute call. You'll get a scheduling link here and by email." },
  { key: "manager", label: "Hiring manager interview", next: "A 45 minute conversation with the person you'd work with." },
  { key: "decision", label: "Decision", next: "You'll get a clear yes or no, with next steps either way." },
];

export const stageLabel = (k: StageKey) => STAGES.find((s) => s.key === k)?.label ?? k;
