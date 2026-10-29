export type StageKey = "resume" | "profile" | "hr" | "senior" | "decision";

export type StageState = "done" | "current" | "upcoming" | "skipped";

export type SignalKind =
  | "submitted"
  | "viewed"
  | "reviewing_resume"
  | "reviewing_profile"
  | "step_completed"
  | "interview_scheduled"
  | "message"
  | "decision";

export interface Stage {
  key: StageKey;
  label: string;
  state: StageState;
  completedAt?: string;
  owner?: string;
}

export interface Signal {
  id: string;
  kind: SignalKind;
  text: string;
  at: string;
  by?: string;
}

export type AppStatus = "active" | "offer" | "rejected" | "withdrawn";

export interface Job {
  id: string;
  title: string;
  company: string;
  companyInitial: string;
  location: string;
  type: "Full-time" | "Internship" | "Contract";
  salary?: string;
  postedAt: string;
  applicants: number;
  description: string;
  requirements: string[];
}

export interface Application {
  id: string;
  jobId: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  college: string;
  gradYear: number;
  appliedAt: string;
  replyDueAt: string;
  status: AppStatus;
  stages: Stage[];
  signals: Signal[];
  resumeFile: string;
  links: { label: string; url: string }[];
}
