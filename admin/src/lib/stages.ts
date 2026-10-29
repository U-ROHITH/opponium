import type { StageKey } from "./api";

/** The five stages are fixed on the server (hiring.models.STAGES). */
export const STAGES: { key: StageKey; label: string }[] = [
  { key: "resume", label: "Resume screen" },
  { key: "profile", label: "Profile review" },
  { key: "hr", label: "HR interview" },
  { key: "manager", label: "Hiring manager interview" },
  { key: "decision", label: "Decision" },
];
