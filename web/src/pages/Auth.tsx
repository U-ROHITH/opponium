import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Clock3 } from "lucide-react";
import { AuthLayout } from "../components/layouts";
import { OtpInput } from "../components/OtpInput";
import { Button, ButtonLink, Field, Input, Select } from "../components/ui";

function useCountdown(seconds: number) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft(left - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return [left, () => setLeft(seconds)] as const;
}

export function EnterInvite() {
  const nav = useNavigate();
  const [code, setCode] = useState("");
  return (
    <AuthLayout>
      <h1 className="text-[26px] font-semibold">Join with an invite</h1>
      <p className="mt-2 text-grey-600">Opponium is invite only. Paste the code from your invite email, or open the link in it.</p>
      <form
        className="mt-8 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          nav("/invite/kl-7Q2M-9XPA");
        }}
      >
        <Field label="Invite code">
          <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="KL-7Q2M-9XPA" className="tnum tracking-wide" />
        </Field>
        <Button className="w-full" disabled={code.length < 4}>
          Continue
        </Button>
      </form>
      <div className="mt-8 space-y-2 border-t border-grey-200 pt-6 text-[14px] text-grey-600">
        <p>
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-ink underline underline-offset-2">
            Sign in
          </Link>
        </p>
        <p>
          No invite yet?{" "}
          <Link to="/request-access" className="font-medium text-ink underline underline-offset-2">
            Request access
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

export function AcceptInvite() {
  const { token } = useParams();
  if (token === "expired") return <InviteExpired />;
  return (
    <AuthLayout step="Step 1 of 3">
      <p className="text-[14px] text-grey-600">Priya Nair invited you to</p>
      <h1 className="mt-1 text-[26px] font-semibold">Join Kite Labs on Opponium</h1>
      <dl className="mt-8 divide-y divide-grey-200 rounded-md border border-grey-200">
        <div className="flex justify-between gap-4 px-4 py-3">
          <dt className="text-grey-600">Role</dt>
          <dd className="font-medium">Candidate</dd>
        </div>
        <div className="flex justify-between gap-4 px-4 py-3">
          <dt className="text-grey-600">Email</dt>
          <dd className="truncate font-medium">aarav.mehta@iitm.ac.in</dd>
        </div>
        <div className="flex justify-between gap-4 px-4 py-3">
          <dt className="text-grey-600">Invite expires</dt>
          <dd className="tnum font-medium">Wed 5 Nov</dd>
        </div>
      </dl>
      <p className="mt-6 text-[14px] text-grey-600">
        Next, we'll send a code to your email and then to your phone. It takes about a minute.
      </p>
      <ButtonLink to="/verify/email" className="mt-6 w-full">
        Continue
      </ButtonLink>
      <p className="mt-4 text-center text-[13px] text-grey-500">Invite {token}</p>
    </AuthLayout>
  );
}

export function InviteExpired() {
  return (
    <AuthLayout>
      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-grey-300">
        <Clock3 size={18} />
      </span>
      <h1 className="mt-5 text-[26px] font-semibold">This invite has expired</h1>
      <p className="mt-2 text-grey-600">
        Invites last 7 days. Ask Priya Nair at Kite Labs to send a new one, and it will arrive at the same email address.
      </p>
      <ButtonLink to="/request-access" variant="secondary" className="mt-8 w-full">
        Request access instead
      </ButtonLink>
    </AuthLayout>
  );
}

function CodeStep({ title, target, change, next, step }: { title: string; target: string; change: string; next: string; step: string }) {
  const nav = useNavigate();
  const [code, setCode] = useState("");
  const [left, reset] = useCountdown(30);
  const [resends, setResends] = useState(0);
  const wrong = code === "000000";

  useEffect(() => {
    if (code.length === 6 && !wrong) {
      const t = setTimeout(() => nav(next), 350);
      return () => clearTimeout(t);
    }
  }, [code, wrong, nav, next]);

  return (
    <AuthLayout step={step}>
      <h1 className="text-[26px] font-semibold">{title}</h1>
      <p className="mt-2 text-grey-600">
        We sent a 6-digit code to <span className="font-medium text-ink">{target}</span>. It expires in 10 minutes.
      </p>
      <div className="mt-8">
        <OtpInput value={code} onChange={setCode} error={wrong} />
        {wrong ? (
          <p className="mt-3 text-[14px] text-bad">That code isn't right. 4 attempts left.</p>
        ) : (
          <p className="mt-3 text-[13px] text-grey-500">Any 6 digits work in this preview. Try 000000 to see the error.</p>
        )}
      </div>
      <div className="mt-8 flex items-center justify-between text-[14px]">
        {resends >= 3 ? (
          <span className="text-grey-500">Resend limit reached. Try again in 15 minutes.</span>
        ) : left > 0 ? (
          <span className="tnum text-grey-500">Resend code in 0:{String(left).padStart(2, "0")}</span>
        ) : (
          <button
            className="font-medium underline underline-offset-2"
            onClick={() => {
              setResends(resends + 1);
              reset();
            }}
          >
            Resend code
          </button>
        )}
        <Link to={change} className="text-grey-600 hover:text-ink">
          {change.includes("phone") ? "Change number" : "Wrong email?"}
        </Link>
      </div>
    </AuthLayout>
  );
}

export function VerifyEmail() {
  return <CodeStep title="Check your email" target="aa***@iitm.ac.in" change="/invite" next="/verify/phone" step="Step 1 of 3" />;
}

export function VerifyPhone() {
  const [sent, setSent] = useState(false);
  const [num, setNum] = useState("98480 22314");
  if (sent) return <CodeStep title="Check your phone" target={`+91 ${num.slice(0, 2)}*** ***${num.slice(-2)}`} change="/verify/phone" next="/onboarding" step="Step 2 of 3" />;
  return (
    <AuthLayout step="Step 2 of 3">
      <h1 className="text-[26px] font-semibold">Add your phone number</h1>
      <p className="mt-2 text-grey-600">Recruiters use it only to reach you about interviews. We'll text you a code to confirm it.</p>
      <form
        className="mt-8 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          setSent(true);
        }}
      >
        <Field label="Mobile number">
          <div className="flex gap-2">
            <Select className="w-24 shrink-0" defaultValue="+91">
              <option>+91</option>
              <option>+1</option>
              <option>+44</option>
              <option>+971</option>
            </Select>
            <Input value={num} onChange={(e) => setNum(e.target.value)} inputMode="tel" autoComplete="tel-national" className="tnum" />
          </div>
        </Field>
        <Button className="w-full">Send code</Button>
      </form>
    </AuthLayout>
  );
}

export function Onboarding() {
  const nav = useNavigate();
  return (
    <AuthLayout step="Step 3 of 3">
      <h1 className="text-[26px] font-semibold">A few basics</h1>
      <p className="mt-2 text-grey-600">This fills in every application for you. You can change it later.</p>
      <form
        className="mt-8 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          nav("/jobs");
        }}
      >
        <Field label="Full name">
          <Input defaultValue="Aarav Mehta" autoComplete="name" />
        </Field>
        <Field label="College or current company">
          <Input defaultValue="IIT Madras" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Graduation year">
            <Select defaultValue="2026">
              {[2023, 2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y}>{y}</option>
              ))}
            </Select>
          </Field>
          <Field label="City">
            <Input defaultValue="Chennai" autoComplete="address-level2" />
          </Field>
        </div>
        <Button className="w-full">Finish setup</Button>
      </form>
    </AuthLayout>
  );
}

export function Login() {
  const nav = useNavigate();
  return (
    <AuthLayout>
      <h1 className="text-[26px] font-semibold">Sign in</h1>
      <p className="mt-2 text-grey-600">We'll email you a code. No password needed.</p>
      <form
        className="mt-8 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          nav("/verify/email");
        }}
      >
        <Field label="Email">
          <Input type="email" placeholder="you@college.edu" autoComplete="email" required />
        </Field>
        <Button className="w-full">Email me a code</Button>
      </form>
      <p className="mt-8 border-t border-grey-200 pt-6 text-[14px] text-grey-600">
        New here?{" "}
        <Link to="/invite" className="font-medium text-ink underline underline-offset-2">
          Use an invite
        </Link>
      </p>
    </AuthLayout>
  );
}

export function RequestAccess() {
  const [done, setDone] = useState(false);
  if (done)
    return (
      <AuthLayout>
        <h1 className="text-[26px] font-semibold">Request received</h1>
        <p className="mt-2 text-grey-600">
          We review requests every weekday. If there's a fit, your invite will arrive by email within 3 working days.
        </p>
        <ButtonLink to="/" variant="secondary" className="mt-8 w-full">
          Back to home
        </ButtonLink>
      </AuthLayout>
    );
  return (
    <AuthLayout>
      <h1 className="text-[26px] font-semibold">Request access</h1>
      <p className="mt-2 text-grey-600">Tell us who you are. We add candidates and hiring teams in small groups.</p>
      <form
        className="mt-8 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          setDone(true);
        }}
      >
        <Field label="I'm joining as">
          <Select defaultValue="candidate">
            <option value="candidate">A candidate</option>
            <option value="recruiter">A recruiter or hiring manager</option>
          </Select>
        </Field>
        <Field label="Full name">
          <Input required autoComplete="name" />
        </Field>
        <Field label="Email">
          <Input type="email" required autoComplete="email" />
        </Field>
        <Field label="College or company">
          <Input required />
        </Field>
        <Button className="w-full">Send request</Button>
      </form>
    </AuthLayout>
  );
}
