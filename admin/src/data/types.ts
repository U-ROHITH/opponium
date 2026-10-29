export type StageKey = "resume" | "profile" | "hr" | "manager" | "decision";

export type SignalKind =
  | "received"
  | "viewed"
  | "reviewing_resume"
  | "reviewing_profile"
  | "interview_scheduled"
  | "step_completed"
  | "moved"
  | "decision";

export interface Signal {
  id: string;
  kind: SignalKind;
  text: string;
  at: string;
}

export type AppStatus = "submitted" | "in_review" | "interviewing" | "offer" | "declined" | "withdrawn";

export interface Job {
  id: string;
  title: string;
  company: string;
  team: string;
  location: string;
  type: "Full-time" | "Internship" | "Contract";
  salary?: string;
  postedAt: string;
  applicants: number;
  summary: string;
  responsibilities: string[];
  requirements: string[];
}

export interface Application {
  id: string;
  jobId: string;
  candidate: {
    name: string;
    email: string;
    phone: string;
    college: string;
    gradYear: number;
    city: string;
    linkedin?: string;
    note?: string;
  };
  appliedAt: string;
  replyDueAt: string;
  firstReplyAt?: string;
  status: AppStatus;
  stage: StageKey;
  signals: Signal[];
  resumeFile: string;
  owner: string;
}
