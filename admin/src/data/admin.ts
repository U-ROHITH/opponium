import { NOW } from "./mock";

const h = (hours: number) => new Date(NOW.getTime() + hours * 3600_000).toISOString();

export type InviteStatus = "Pending" | "Accepted" | "Expired" | "Revoked";

export const invites: { id: string; email: string; role: string; company: string; by: string; sent: string; status: InviteStatus }[] = [
  { id: "i1", email: "ishita.rao@bits-pilani.ac.in", role: "Candidate", company: "", by: "Opponium team", sent: h(-5), status: "Pending" },
  { id: "i2", email: "sameer@kitelabs.in", role: "Hiring manager", company: "Kite Labs", by: "Priya Nair", sent: h(-26), status: "Accepted" },
  { id: "i3", email: "kabir.singh@nitt.edu", role: "Candidate", company: "", by: "Opponium team", sent: h(-30), status: "Accepted" },
  { id: "i4", email: "hr@fernhill.health", role: "Recruiter", company: "Fernhill", by: "Opponium team", sent: h(-50), status: "Pending" },
  { id: "i5", email: "dev.patel@nirmauni.ac.in", role: "Candidate", company: "", by: "Opponium team", sent: h(-200), status: "Expired" },
  { id: "i6", email: "talent@northwind.finance", role: "Recruiter", company: "Northwind Finance", by: "Opponium team", sent: h(-240), status: "Accepted" },
  { id: "i7", email: "temp.recruiter@gmail.com", role: "Recruiter", company: "Kite Labs", by: "Rahul Iyer", sent: h(-260), status: "Revoked" },
];

export const accessRequests = [
  { id: "r1", name: "Tanvi Shah", email: "tanvi.shah@iiitd.ac.in", as: "Candidate", org: "IIIT Delhi", at: h(-3) },
  { id: "r2", name: "Mohit Bansal", email: "mohit@ledgerly.io", as: "Recruiter", org: "Ledgerly", at: h(-9) },
  { id: "r3", name: "Farah Siddiqui", email: "farah.s@christuniversity.in", as: "Candidate", org: "Christ University", at: h(-22) },
  { id: "r4", name: "Neel Kulkarni", email: "neel@coep.ac.in", as: "Candidate", org: "COEP Pune", at: h(-31) },
];

export const users = [
  { id: "u1", name: "Aarav Mehta", email: "aarav.mehta@iitm.ac.in", role: "Candidate", org: "IIT Madras", email_ok: true, phone_ok: true, active: h(-0.2), suspended: false },
  { id: "u2", name: "Priya Nair", email: "priya@kitelabs.in", role: "Recruiter", org: "Kite Labs", email_ok: true, phone_ok: true, active: h(-0.5), suspended: false },
  { id: "u3", name: "Rahul Iyer", email: "rahul@kitelabs.in", role: "Recruiter", org: "Kite Labs", email_ok: true, phone_ok: true, active: h(-4), suspended: false },
  { id: "u4", name: "Sana Kapoor", email: "sana@fernhill.health", role: "Recruiter", org: "Fernhill", email_ok: true, phone_ok: false, active: h(-30), suspended: false },
  { id: "u5", name: "Kabir Singh", email: "kabir.singh@nitt.edu", role: "Candidate", org: "NIT Trichy", email_ok: true, phone_ok: true, active: h(-12), suspended: false },
  { id: "u6", name: "Meera Pillai", email: "meera@iiit.ac.in", role: "Candidate", org: "IIIT Hyderabad", email_ok: true, phone_ok: true, active: h(-2), suspended: false },
  { id: "u7", name: "Arjun Menon", email: "arjun.m@coep.ac.in", role: "Candidate", org: "COEP Pune", email_ok: true, phone_ok: false, active: h(-80), suspended: true },
  { id: "u8", name: "Rohith Uppunuthula", email: "rohith@opponium.com", role: "Admin", org: "Opponium", email_ok: true, phone_ok: true, active: h(0), suspended: false },
];

export const companies = [
  { id: "c1", name: "Kite Labs", domain: "kitelabs.in", recruiters: 3, jobs: 2, open: 10, compliance: 92, status: "Active" },
  { id: "c2", name: "Northwind Finance", domain: "northwind.finance", recruiters: 2, jobs: 1, open: 41, compliance: 97, status: "Active" },
  { id: "c3", name: "Fernhill", domain: "fernhill.health", recruiters: 1, jobs: 1, open: 7, compliance: 78, status: "Active" },
  { id: "c4", name: "Ledgerly", domain: "ledgerly.io", recruiters: 0, jobs: 0, open: 0, compliance: 0, status: "Onboarding" },
];

export const audit = [
  { id: "l1", at: h(-0.3), actor: "Priya Nair", action: "Set signal", target: "Aarav Mehta, Frontend Engineer", detail: "Reviewing your profile" },
  { id: "l2", at: h(-1.2), actor: "Rohith Uppunuthula", action: "Sent invite", target: "ishita.rao@bits-pilani.ac.in", detail: "Role: Candidate" },
  { id: "l3", at: h(-3.4), actor: "Priya Nair", action: "Moved stage", target: "Aarav Mehta, Frontend Engineer", detail: "Resume screen to Profile review" },
  { id: "l4", at: h(-5), actor: "System", action: "Reply overdue", target: "Ishita Rao, Frontend Engineer", detail: "40h passed with no reply" },
  { id: "l5", at: h(-6), actor: "Rahul Iyer", action: "Revoked invite", target: "temp.recruiter@gmail.com", detail: "" },
  { id: "l6", at: h(-9), actor: "Rohith Uppunuthula", action: "Suspended user", target: "Arjun Menon", detail: "Duplicate account" },
  { id: "l7", at: h(-12), actor: "Sana Kapoor", action: "Shared decision", target: "Aarav Mehta, Product Designer", detail: "Not moving forward" },
  { id: "l8", at: h(-20), actor: "Rohith Uppunuthula", action: "Changed setting", target: "Due soon threshold", detail: "6h to 8h" },
];

export const replyTrend = [31, 28, 26, 24, 22, 25, 19, 18, 21, 17, 16, 18, 15, 14];
