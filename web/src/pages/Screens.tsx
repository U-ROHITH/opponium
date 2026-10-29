import { Link } from "react-router-dom";
import { Brand } from "../components/layouts";

const groups: { title: string; items: [string, string][] }[] = [
  {
    title: "Public",
    items: [
      ["/", "Home"],
      ["/request-access", "Request access"],
      ["/login", "Sign in"],
    ],
  },
  {
    title: "Invite and verification",
    items: [
      ["/invite", "Enter invite code"],
      ["/invite/KL-7Q2M-9XPA", "Accept invite"],
      ["/invite/expired", "Expired invite"],
      ["/verify/email", "Email code"],
      ["/verify/phone", "Phone number and SMS code"],
      ["/onboarding", "Profile basics"],
    ],
  },
  {
    title: "Candidate",
    items: [
      ["/jobs", "Jobs"],
      ["/jobs/j-104", "Job detail"],
      ["/jobs/j-104/apply", "Apply"],
      ["/applications/a-5002/submitted", "Application sent"],
      ["/applications", "My applications"],
      ["/applications/a-5001", "Tracker: in review"],
      ["/applications/a-5003", "Tracker: interviewing"],
      ["/applications/a-5004", "Tracker: closed"],
    ],
  },
  {
    title: "Recruiter",
    items: [
      ["/r/inbox", "Inbox, sorted by reply due"],
      ["/r/jobs", "Jobs"],
      ["/r/jobs/j-101", "Job pipeline board"],
      ["/r/applications/p-700", "Review applicant (overdue)"],
      ["/r/jobs/new", "New job"],
      ["/r/team", "Team"],
    ],
  },
];

export default function Screens() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Brand />
      <h1 className="mt-10 text-[28px] font-semibold">All screens</h1>
      <p className="mt-2 text-grey-600">
        Design preview with sample data. Buttons work, but nothing is saved yet. The admin panel is a separate app.
      </p>
      <div className="mt-10 space-y-10">
        {groups.map((g) => (
          <section key={g.title}>
            <h2 className="font-sans text-[13px] font-medium tracking-normal text-grey-500">{g.title}</h2>
            <ul className="mt-3 divide-y divide-grey-200 border-y border-grey-200">
              {g.items.map(([to, label]) => (
                <li key={to}>
                  <Link to={to} className="flex items-center justify-between py-3 hover:bg-grey-50 sm:px-2">
                    <span>{label}</span>
                    <span className="truncate pl-4 font-mono text-[12px] text-grey-500">{to}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
