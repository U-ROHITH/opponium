export type StageKey = "resume" | "profile" | "hr" | "manager" | "decision";

export type SignalKind =
  | "received"
  | "viewed"
  | "reviewing_resume"
  | "reviewing_profile"
  | "interview_scheduled"
  | "step_completed"
  | "decision"
  | "withdrawn";

export interface Signal {
  id: number | string;
  kind: SignalKind;
  text: string;
  at: string;
}

export type AppStatus = "submitted" | "in_review" | "interviewing" | "offer" | "declined" | "withdrawn";

export type SlaState = "replied" | "on_track" | "due_soon" | "overdue" | "closed";

export type Role = "candidate" | "recruiter" | "hiring_manager" | "admin";

export interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
  company: { id: number; name: string } | null;
  phone: string;
  email_verified: boolean;
  phone_verified: boolean;
  onboarded: boolean;
  college: string;
  grad_year: number | null;
  city: string;
  linkedin: string;
  title: string;
}

export interface Tokens {
  access: string;
  refresh: string;
  user: User;
}

export interface Challenge {
  challenge: string;
  channel: "email" | "phone";
  sent_to: string;
  resend_in: number;
  resends_left: number;
  onboarding_token?: string;
}

export interface Invite {
  code: string;
  email: string;
  role: Role;
  role_label: string;
  company: string | null;
  invited_by: string;
  expires_at: string;
  status: "pending" | "accepted" | "expired" | "revoked";
}

export interface Job {
  id: number;
  title: string;
  company: string;
  company_id: number;
  team: string;
  location: string;
  type: "Full-time" | "Internship" | "Contract";
  salary: string;
  summary: string;
  responsibilities: string[];
  requirements: string[];
  status: "draft" | "open" | "paused" | "closed";
  posted_at: string;
  applicants: number;
  applied_application_id: number | null;
  stage_counts?: Record<StageKey, number>;
  overdue?: number;
}

export interface Note {
  id: number;
  text: string;
  at: string;
  author: string;
}

export interface Application {
  id: number;
  job: { id: number; title: string; company: string; location: string };
  stage: StageKey;
  stage_label: string;
  status: AppStatus;
  applied_at: string;
  reply_due_at: string;
  first_reply_at: string | null;
  sla?: SlaState;
  events: Signal[];
  candidate: {
    name: string;
    email: string;
    phone: string;
    college: string;
    grad_year: number | null;
    city: string;
    linkedin: string;
    note: string;
  };
  resume: { name: string; size: number };
  owner?: { id: number; name: string } | null;
  decline_reason?: string;
  notes?: Note[];
}

export interface Member {
  id: number | string;
  name: string;
  email: string;
  role: Role;
  status: "active" | "invited";
}
