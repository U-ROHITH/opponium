import { Link } from "react-router-dom";
import { Brand } from "../components/layouts";
import { ActivityFeed, SlaLabel } from "../components/status";
import { ButtonLink, CompanyMark } from "../components/ui";
import { sampleInbox, sampleTracker } from "../data/sample";
import { stageLabel } from "../data/stages";
import { formatDateTime } from "../lib/time";

function TrackerPreview() {
  const job = sampleTracker;
  return (
    <div className="rounded-lg border border-grey-200 bg-paper">
      <div className="flex items-start gap-3 border-b border-grey-200 p-5">
        <CompanyMark name={job.company} size={36} />
        <div className="min-w-0">
          <p className="font-medium leading-tight">{job.title}</p>
          <p className="text-[13px] text-grey-600">{job.company}</p>
        </div>
      </div>
      <div className="border-b border-grey-200 bg-grey-50 px-5 py-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[13px] text-grey-600">Applied</p>
            <p className="tnum text-[15px] font-medium">{formatDateTime(job.appliedAt)}</p>
          </div>
          <div className="text-right">
            <p className="text-[13px] text-grey-600">You'll hear back by</p>
            <p className="tnum font-display text-[22px] font-semibold">{formatDateTime(job.replyDueAt)}</p>
          </div>
        </div>
        <p className="mt-2 text-[12px] text-grey-500">Example. Every reply is due 48 hours after you apply.</p>
      </div>
      <div className="p-5">
        <ActivityFeed signals={job.events} />
      </div>
    </div>
  );
}

const ticks = [
  { at: "0h", title: "You apply", body: "Resume and a few basics. Most of it is already filled in from your profile." },
  { at: "First hours", title: "Someone opens it", body: "You see “Viewed” the moment a recruiter opens your application." },
  { at: "As it moves", title: "Every step, live", body: "Reviewing your resume, step completed, interview scheduled. No guessing." },
  { at: "By 48h", title: "A real reply", body: "A next step or a clear no. If a team runs late, it is flagged to us, not hidden from you." },
];

export default function Landing() {
  const inbox = sampleInbox;
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Brand />
        <nav className="flex items-center gap-2 sm:gap-6">
          <a href="#teams" className="hidden text-[14px] text-grey-700 hover:text-ink sm:inline">
            For hiring teams
          </a>
          <Link to="/login" className="px-2 py-2.5 text-[14px] text-grey-700 hover:text-ink">
            Sign in
          </Link>
          <ButtonLink to="/invite" className="h-9 px-4">
            Use invite
          </ButtonLink>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl gap-12 px-4 pb-20 pt-12 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pt-20">
        <div className="max-w-xl">
          <h1 className="text-[40px] font-semibold sm:text-[56px]">Apply once. Hear back within 48 hours.</h1>
          <p className="mt-6 text-[18px] leading-relaxed text-grey-700">
            Opponium is an invite-only hiring network for students and early-career engineers. Every application gets a reply in 48
            hours, and you can see exactly where yours is the whole time.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink to="/invite">Join with an invite</ButtonLink>
            <ButtonLink to="/request-access" variant="secondary">
              Request access
            </ButtonLink>
          </div>
          <p className="mt-6 text-[13px] text-grey-500">Free for candidates. Hiring teams join by invitation.</p>
        </div>
        <div className="lg:pt-2">
          <TrackerPreview />
        </div>
      </section>

      <section className="border-t border-grey-200">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
          <div>
            <h2 className="text-[28px] font-semibold">What happens in those 48 hours</h2>
            <p className="mt-4 max-w-sm text-grey-700">
              Every company uses the same five stages, so “Profile review” means the same thing at a startup as it does at a bank.
            </p>
          </div>
          <table className="w-full text-left">
            <tbody className="divide-y divide-grey-200 border-y border-grey-200">
              {ticks.map((t) => (
                <tr key={t.title} className="align-top">
                  <td className="tnum w-28 py-5 pr-4 text-[14px] text-grey-500 sm:w-36">{t.at}</td>
                  <td className="py-5">
                    <p className="font-medium">{t.title}</p>
                    <p className="mt-1 text-grey-600">{t.body}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="teams" className="border-t border-grey-200">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
            <div>
              <h2 className="text-[28px] font-semibold">For hiring teams</h2>
              <p className="mt-4 max-w-md text-grey-700">
                Your inbox is sorted by who is waiting longest. Move people between stages, tell them what you're doing with one tap, and
                never let a reply slip past 48 hours.
              </p>
              <ul className="mt-6 space-y-2 text-grey-700">
                <li>Candidates arrive verified by email and phone</li>
                <li>Resume, links and answers on one screen</li>
                <li>A due time on every applicant, not a vague backlog</li>
              </ul>
              <Link to="/r/inbox" className="mt-6 inline-block py-2 text-[14px] font-medium underline underline-offset-4">
                See the recruiter inbox
              </Link>
            </div>
            <div className="overflow-hidden rounded-lg border border-grey-200">
              <table className="w-full text-left text-[14px]">
                <thead className="border-b border-grey-200 bg-grey-50 text-[12px] text-grey-600">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Candidate</th>
                    <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Stage</th>
                    <th className="px-4 py-2.5 text-right font-medium">Reply</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-grey-200">
                  {inbox.map((a) => (
                    <tr key={a.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium">{a.candidate.name}</p>
                        <p className="text-[13px] text-grey-500">{a.job.title}</p>
                      </td>
                      <td className="hidden px-4 py-3 text-grey-700 sm:table-cell">{stageLabel(a.stage)}</td>
                      <td className="px-4 py-3 text-right">
                        <SlaLabel app={a} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-grey-200">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
          <h2 className="text-[28px] font-semibold">Why invite only</h2>
          <div>
            <p className="max-w-2xl text-grey-700">
              A 48-hour promise only works if every team can keep it. We add companies when they have the people to reply, and candidates
              in groups that match the roles that are open. It's smaller, but every application is read.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink to="/invite">Join with an invite</ButtonLink>
              <ButtonLink to="/request-access" variant="secondary">
                Request access
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-grey-200">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 text-[13px] text-grey-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Brand />
          <div className="flex flex-wrap items-center gap-x-6">
            <a href="mailto:hello@opponium.com" className="py-2 hover:text-ink">
              hello@opponium.com
            </a>
            <span>© 2026 Opponium</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
