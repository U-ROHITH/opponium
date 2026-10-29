import type { Application, Job, StageKey } from "./types";

// Fixed "now" so the sample data reads the same on every visit.
export const NOW = new Date("2026-10-29T14:00:00+05:30");

const h = (hours: number) => new Date(NOW.getTime() + hours * 3600_000).toISOString();

export const STAGES: { key: StageKey; label: string; next: string }[] = [
  { key: "resume", label: "Resume screen", next: "A recruiter reads your resume against the role." },
  { key: "profile", label: "Profile review", next: "The team looks at your projects, links and answers." },
  { key: "hr", label: "HR interview", next: "A 20 to 30 minute call. You'll get a scheduling link here and by email." },
  { key: "manager", label: "Hiring manager interview", next: "A 45 minute conversation with the person you'd work with." },
  { key: "decision", label: "Decision", next: "You'll get a clear yes or no, with next steps either way." },
];

export const jobs: Job[] = [
  {
    id: "j-101",
    title: "Frontend Engineer",
    company: "Kite Labs",
    team: "Product Engineering",
    location: "Bengaluru, hybrid",
    type: "Full-time",
    salary: "₹18L to ₹26L",
    postedAt: h(-72),
    applicants: 48,
    summary:
      "Build the dashboard thousands of small merchants use to run their stores. You'll own features end to end, from the API contract to the last pixel.",
    responsibilities: [
      "Ship features in React and TypeScript every week",
      "Work with design on interaction details",
      "Keep the app fast on low-end Android phones",
    ],
    requirements: ["1+ years with React", "Comfortable reading backend code", "A project you can show us"],
  },
  {
    id: "j-102",
    title: "Data Analyst Intern",
    company: "Northwind Finance",
    team: "Risk",
    location: "Mumbai, on-site",
    type: "Internship",
    salary: "₹45,000 / month",
    postedAt: h(-30),
    applicants: 112,
    summary: "Six months on the risk team, turning loan data into decisions. Real problems, a mentor, and a return offer for strong interns.",
    responsibilities: ["Write SQL against production replicas", "Build weekly risk reports", "Present findings to the credit team"],
    requirements: ["Final-year student or recent graduate", "SQL and one of Python or R", "Clear written English"],
  },
  {
    id: "j-103",
    title: "Backend Engineer, Payments",
    company: "Kite Labs",
    team: "Payments",
    location: "Remote, India",
    type: "Full-time",
    salary: "₹24L to ₹34L",
    postedAt: h(-120),
    applicants: 31,
    summary: "Design the ledger and payout services that move money for our merchants. Correctness first, then speed.",
    responsibilities: ["Own payout and reconciliation services", "Write design docs and review others'", "Be on call one week in six"],
    requirements: ["2+ years building backend services", "Python or Go", "You care about idempotency"],
  },
  {
    id: "j-104",
    title: "Product Designer",
    company: "Fernhill",
    team: "Design",
    location: "Hyderabad, hybrid",
    type: "Full-time",
    postedAt: h(-10),
    applicants: 19,
    summary: "Fernhill makes software for clinics. Design flows that doctors use between patients, with ten seconds to spare.",
    responsibilities: ["Run research with clinic staff", "Ship designs with engineers", "Maintain our component library"],
    requirements: ["A portfolio with shipped work", "Figma", "Comfort with dense, data-heavy screens"],
  },
];

const base = {
  email: "aarav.mehta@iitm.ac.in",
  phone: "+91 98480 22314",
};

export const applications: Application[] = [
  {
    id: "a-5001",
    jobId: "j-101",
    candidate: { name: "Aarav Mehta", ...base, college: "IIT Madras", gradYear: 2026, city: "Chennai", linkedin: "linkedin.com/in/aaravmehta" },
    appliedAt: h(-19),
    replyDueAt: h(21),
    firstReplyAt: h(-17.2),
    status: "in_review",
    stage: "profile",
    owner: "Priya Nair",
    resumeFile: "Aarav_Mehta_Resume.pdf",
    signals: [
      { id: "s1", kind: "received", text: "Application received", at: h(-19) },
      { id: "s2", kind: "viewed", text: "Your application was viewed", at: h(-17.5) },
      { id: "s3", kind: "reviewing_resume", text: "Reviewing your resume", at: h(-17.2) },
      { id: "s4", kind: "step_completed", text: "Step completed: Resume screen", at: h(-3.4) },
      { id: "s5", kind: "reviewing_profile", text: "Reviewing your profile", at: h(-1.1) },
    ],
  },
  {
    id: "a-5002",
    jobId: "j-102",
    candidate: { name: "Aarav Mehta", ...base, college: "IIT Madras", gradYear: 2026, city: "Chennai" },
    appliedAt: h(-4),
    replyDueAt: h(36),
    status: "submitted",
    stage: "resume",
    owner: "Rahul Iyer",
    resumeFile: "Aarav_Mehta_Resume.pdf",
    signals: [
      { id: "s1", kind: "received", text: "Application received", at: h(-4) },
      { id: "s2", kind: "viewed", text: "Your application was viewed", at: h(-0.6) },
    ],
  },
  {
    id: "a-5003",
    jobId: "j-103",
    candidate: { name: "Aarav Mehta", ...base, college: "IIT Madras", gradYear: 2026, city: "Chennai" },
    appliedAt: h(-110),
    replyDueAt: h(-70),
    firstReplyAt: h(-96),
    status: "interviewing",
    stage: "manager",
    owner: "Priya Nair",
    resumeFile: "Aarav_Mehta_Resume.pdf",
    signals: [
      { id: "s1", kind: "received", text: "Application received", at: h(-110) },
      { id: "s2", kind: "viewed", text: "Your application was viewed", at: h(-97) },
      { id: "s3", kind: "step_completed", text: "Step completed: Resume screen", at: h(-96) },
      { id: "s4", kind: "step_completed", text: "Step completed: Profile review", at: h(-70) },
      { id: "s5", kind: "step_completed", text: "Step completed: HR interview", at: h(-26) },
      { id: "s6", kind: "interview_scheduled", text: "Interview scheduled: Fri 31 Oct, 11:00", at: h(-2) },
    ],
  },
  {
    id: "a-5004",
    jobId: "j-104",
    candidate: { name: "Aarav Mehta", ...base, college: "IIT Madras", gradYear: 2026, city: "Chennai" },
    appliedAt: h(-200),
    replyDueAt: h(-160),
    firstReplyAt: h(-180),
    status: "declined",
    stage: "decision",
    owner: "Sana Kapoor",
    resumeFile: "Aarav_Mehta_Resume.pdf",
    signals: [
      { id: "s1", kind: "received", text: "Application received", at: h(-200) },
      { id: "s2", kind: "viewed", text: "Your application was viewed", at: h(-181) },
      { id: "s3", kind: "decision", text: "Decision shared", at: h(-180) },
    ],
  },
];

// Recruiter side: applicants across Kite Labs jobs.
const people: [string, string, number, string][] = [
  ["Ishita Rao", "BITS Pilani", 2026, "Hyderabad"],
  ["Kabir Singh", "NIT Trichy", 2025, "Pune"],
  ["Meera Pillai", "IIIT Hyderabad", 2026, "Hyderabad"],
  ["Rohan Das", "Jadavpur University", 2024, "Kolkata"],
  ["Ananya Gupta", "DTU", 2026, "Delhi"],
  ["Vikram Reddy", "VIT Vellore", 2025, "Bengaluru"],
  ["Zoya Khan", "Manipal Institute of Technology", 2026, "Bengaluru"],
  ["Arjun Menon", "College of Engineering Pune", 2025, "Pune"],
  ["Nisha Verma", "IIT Bombay", 2026, "Mumbai"],
  ["Dev Patel", "Nirma University", 2024, "Ahmedabad"],
];

const pipelinePlan: { stage: StageKey; appliedHoursAgo: number; replied: boolean; job: string }[] = [
  { stage: "resume", appliedHoursAgo: 43, replied: false, job: "j-101" },
  { stage: "resume", appliedHoursAgo: 35, replied: false, job: "j-101" },
  { stage: "resume", appliedHoursAgo: 12, replied: false, job: "j-103" },
  { stage: "resume", appliedHoursAgo: 2, replied: false, job: "j-101" },
  { stage: "profile", appliedHoursAgo: 30, replied: true, job: "j-101" },
  { stage: "profile", appliedHoursAgo: 50, replied: true, job: "j-103" },
  { stage: "hr", appliedHoursAgo: 90, replied: true, job: "j-101" },
  { stage: "hr", appliedHoursAgo: 75, replied: true, job: "j-103" },
  { stage: "manager", appliedHoursAgo: 140, replied: true, job: "j-101" },
  { stage: "decision", appliedHoursAgo: 220, replied: true, job: "j-103" },
];

export const pipeline: Application[] = pipelinePlan.map((p, i) => {
  const [name, college, gradYear, city] = people[i];
  const first = name.split(" ")[0].toLowerCase();
  return {
    id: `p-${700 + i}`,
    jobId: p.job,
    candidate: {
      name,
      email: `${first}@example.com`,
      phone: `+91 9${String(800000000 + i * 7311).slice(0, 4)} ${String(10000 + i * 913).slice(0, 5)}`,
      college,
      gradYear,
      city,
      linkedin: `linkedin.com/in/${first}`,
      note: i === 0 ? "Available to join from January." : undefined,
    },
    appliedAt: h(-p.appliedHoursAgo),
    replyDueAt: h(40 - p.appliedHoursAgo),
    firstReplyAt: p.replied ? h(-p.appliedHoursAgo + [6, 14, 3, 21, 9, 17, 11, 27, 5, 19][i]) : undefined,
    status: p.stage === "resume" ? "submitted" : p.stage === "decision" ? "offer" : p.stage === "profile" ? "in_review" : "interviewing",
    stage: p.stage,
    owner: i % 3 === 0 ? "Rahul Iyer" : "Priya Nair",
    resumeFile: `${name.replace(" ", "_")}_Resume.pdf`,
    signals: [{ id: "s1", kind: "received", text: "Application received", at: h(-p.appliedHoursAgo) }],
  };
});

export const jobById = (id: string) => [...jobs].find((j) => j.id === id)!;
