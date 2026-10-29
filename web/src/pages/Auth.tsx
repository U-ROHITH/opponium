import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { Clock3, X } from "lucide-react";
import { AuthLayout } from "../components/layouts";
import { OtpInput } from "../components/OtpInput";
import { Button, ButtonLink, ErrorState, Field, FormError, Input, LoadingText, Select, cx } from "../components/ui";
import type { Challenge, Invite, Role, Tokens, User } from "../data/types";
import { ApiError, api, errorText } from "../lib/api";
import { ADMIN_URL, homeFor, useAuth } from "../lib/auth";
import { loginFlow, signupFlow, type LoginFlow, type SignupFlow } from "../lib/flow";
import { formatDay } from "../lib/time";

const pub = { auth: false } as const;
const isTeam = (r?: Role) => r === "recruiter" || r === "hiring_manager";

function useCountdown(seconds: number, key: string) {
  const [end, setEnd] = useState(() => Date.now() + seconds * 1000);
  const [, tick] = useState(0);
  useEffect(() => {
    setEnd(Date.now() + seconds * 1000);
  }, [seconds, key]);
  useEffect(() => {
    const t = window.setInterval(() => tick((x) => x + 1), 1000);
    return () => window.clearInterval(t);
  }, []);
  return Math.max(0, Math.ceil((end - Date.now()) / 1000));
}

/** "The Opponium team" reads better lowercased mid-sentence. */
const mid = (s: string) => (s.startsWith("The ") ? "the " + s.slice(4) : s);

export function EnterInvite() {
  const nav = useNavigate();
  const [code, setCode] = useState("");
  return (
    <AuthLayout>
      <h1 className="text-[28px] font-semibold">Join with an invite</h1>
      <p className="mt-2 text-grey-600">Opponium is invite only. Paste the code from your invite email, or open the link in it.</p>
      <form
        className="mt-8 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          nav(`/invite/${encodeURIComponent(code.trim())}`);
        }}
      >
        <Field label="Invite code">
          <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="7Q2M-9XPA" autoCapitalize="characters" className="tnum tracking-wide" />
        </Field>
        <Button className="w-full" disabled={code.trim().length < 4}>
          Continue
        </Button>
      </form>
      <div className="mt-8 space-y-2 border-t border-grey-200 pt-6 text-[14px] text-grey-600">
        <p>
          Already have an account?{" "}
          <Link to="/login" className="inline-block py-2 font-medium text-ink underline underline-offset-2">
            Sign in
          </Link>
        </p>
        <p>
          No invite yet?{" "}
          <Link to="/request-access" className="inline-block py-2 font-medium text-ink underline underline-offset-2">
            Request access
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

export function AcceptInvite() {
  const { token = "" } = useParams();
  const nav = useNavigate();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    let live = true;
    setLoadError(null);
    setInvite(null);
    api
      .get<Invite>(`/api/auth/invites/${encodeURIComponent(token)}`, pub)
      .then((d) => live && setInvite(d))
      .catch((e) => live && setLoadError(e));
    return () => {
      live = false;
    };
  }, [token, attempt]);

  const accept = async () => {
    if (!invite) return;
    setBusy(true);
    setError(null);
    try {
      const ch = await api.post<Challenge>(`/api/auth/invites/${encodeURIComponent(invite.code)}/accept`, {}, pub);
      signupFlow.set({ code: invite.code, invite, email: ch, onboarding_token: ch.onboarding_token, step: "email" });
      nav("/verify/email");
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError(errorText(e));
      if (err.code === "expired" || err.code === "revoked") setInvite({ ...invite, status: err.code });
      else setError(err);
      setBusy(false);
    }
  };

  if (loadError instanceof ApiError && loadError.code === "not_found")
    return (
      <AuthLayout>
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-grey-300">
          <X size={18} />
        </span>
        <h1 className="mt-5 text-[28px] font-semibold">We couldn't find that invite</h1>
        <p className="mt-2 text-grey-600">{loadError.message}</p>
        <p className="tnum mt-2 text-[14px] text-grey-500">You entered {token}</p>
        <ButtonLink to="/invite" className="mt-8 w-full">
          Enter the code again
        </ButtonLink>
        <ButtonLink to="/request-access" variant="secondary" className="mt-3 w-full">
          Request access instead
        </ButtonLink>
      </AuthLayout>
    );
  if (loadError)
    return (
      <AuthLayout>
        <ErrorState error={loadError} onRetry={() => setAttempt(attempt + 1)} />
      </AuthLayout>
    );
  if (!invite)
    return (
      <AuthLayout step="Step 1 of 4">
        <LoadingText>Checking your invite</LoadingText>
      </AuthLayout>
    );
  if (invite.status === "expired") return <InviteExpired invite={invite} />;
  if (invite.status === "revoked")
    return (
      <AuthLayout>
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-grey-300">
          <X size={18} />
        </span>
        <h1 className="mt-5 text-[28px] font-semibold">This invite was cancelled</h1>
        <p className="mt-2 text-grey-600">
          Ask {mid(invite.invited_by)}
          {invite.company ? ` at ${invite.company}` : ""} to send a new one if you still need access.
        </p>
        <ButtonLink to="/request-access" variant="secondary" className="mt-8 w-full">
          Request access instead
        </ButtonLink>
      </AuthLayout>
    );
  if (invite.status === "accepted")
    return (
      <AuthLayout>
        <h1 className="text-[28px] font-semibold">This invite has been used</h1>
        <p className="mt-2 text-grey-600">
          There's already an account for <span className="font-medium text-ink">{invite.email}</span>. Sign in with that email instead.
        </p>
        <ButtonLink to="/login" className="mt-8 w-full">
          Sign in
        </ButtonLink>
      </AuthLayout>
    );

  return (
    <AuthLayout step="Step 1 of 4">
      <h1 className="text-[28px] font-semibold">You're invited to Opponium</h1>
      <p className="mt-2 text-grey-600">
        {invite.invited_by}
        {invite.company ? ` from ${invite.company}` : ""} sent you an invite. Accept it to create your account.
      </p>
      <dl className="mt-8 divide-y divide-grey-200 rounded-md border border-grey-200">
        <div className="flex justify-between gap-4 px-4 py-3">
          <dt className="text-grey-600">Role</dt>
          <dd className="font-medium">{invite.role_label}</dd>
        </div>
        {invite.company && (
          <div className="flex justify-between gap-4 px-4 py-3">
            <dt className="text-grey-600">Company</dt>
            <dd className="truncate font-medium">{invite.company}</dd>
          </div>
        )}
        <div className="flex justify-between gap-4 px-4 py-3">
          <dt className="text-grey-600">Email</dt>
          <dd className="truncate font-medium">{invite.email}</dd>
        </div>
        <div className="flex justify-between gap-4 px-4 py-3">
          <dt className="text-grey-600">Invite expires</dt>
          <dd className="tnum font-medium">{formatDay(invite.expires_at)}</dd>
        </div>
      </dl>
      <p className="mt-6 text-[14px] text-grey-600">
        Next, we'll send a code to your email and then to your phone. It takes about a minute.
      </p>
      {error && (
        <div className="mt-4">
          <FormError>
            {error.message}
            {error.code === "exists" && (
              <>
                {" "}
                <Link to="/login" className="font-medium text-ink underline underline-offset-2">
                  Sign in
                </Link>
              </>
            )}
          </FormError>
        </div>
      )}
      <Button className="mt-6 w-full" onClick={accept} disabled={busy}>
        {busy ? "Sending code" : "Continue"}
      </Button>
      <p className="tnum mt-4 text-center text-[13px] text-grey-500">Invite code {invite.code}</p>
    </AuthLayout>
  );
}

export function InviteExpired({ invite }: { invite?: Invite }) {
  const who = invite ? `${mid(invite.invited_by)}${invite.company ? ` at ${invite.company}` : ""}` : "the person who invited you";
  return (
    <AuthLayout>
      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-grey-300">
        <Clock3 size={18} />
      </span>
      <h1 className="mt-5 text-[28px] font-semibold">This invite has expired</h1>
      <p className="mt-2 text-grey-600">Invites last 7 days. Ask {who} to send a new one, and it will arrive at the same email address.</p>
      <ButtonLink to="/request-access" variant="secondary" className="mt-8 w-full">
        Request access instead
      </ButtonLink>
    </AuthLayout>
  );
}

function CodeStep({
  title,
  challenge,
  onChallenge,
  verify,
  change,
  step,
}: {
  title: string;
  challenge: Challenge;
  onChallenge: (c: Challenge) => void;
  verify: (code: string) => Promise<void>;
  change: { label: string; to?: string; onClick?: () => void };
  step?: string;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendNote, setResendNote] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [left_, setLeft] = useState(challenge.resends_left);
  const left = useCountdown(challenge.resend_in, challenge.challenge);

  const submit = async (v: string) => {
    setBusy(true);
    setError(null);
    try {
      await verify(v);
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  };

  const resend = async () => {
    setResending(true);
    setResendNote(null);
    setError(null);
    try {
      const ch = await api.post<Challenge>("/api/auth/otp/resend", { challenge: challenge.challenge }, pub);
      onChallenge({ ...challenge, ...ch });
      setLeft(ch.resends_left);
      setCode("");
      setResendNote("We sent a new code.");
    } catch (e) {
      if (e instanceof ApiError && e.code === "rate_limited") setLeft(0);
      setResendNote(errorText(e));
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout step={step}>
      <h1 className="text-[28px] font-semibold">{title}</h1>
      <p className="mt-2 text-grey-600">
        We sent a 6-digit code to <span className="tnum font-medium text-ink">{challenge.sent_to}</span>. It expires in 10 minutes.
      </p>
      <div className="mt-8">
        <OtpInput
          value={code}
          error={!!error}
          onChange={(v) => {
            if (busy) return;
            setCode(v);
            setError(null);
            if (v.length === 6) void submit(v);
          }}
        />
        {error ? (
          <p className="mt-3 text-[14px] text-bad" role="alert">
            {error}
          </p>
        ) : busy ? (
          <p className="mt-3 text-[13px] text-grey-500">Checking the code</p>
        ) : resendNote ? (
          <p className="mt-3 text-[13px] text-grey-600" role="status">
            {resendNote}
          </p>
        ) : null}
      </div>
      <div className="mt-8 flex items-center justify-between gap-4 text-[14px]">
        {left_ <= 0 ? (
          <span className="text-grey-500">Resend limit reached. Try again in 15 minutes.</span>
        ) : left > 0 ? (
          <span className="tnum text-grey-500">Resend code in 0:{String(left).padStart(2, "0")}</span>
        ) : (
          <button className="py-2 font-medium underline underline-offset-2 disabled:opacity-40" onClick={resend} disabled={resending}>
            {resending ? "Sending" : "Resend code"}
          </button>
        )}
        {change.to ? (
          <Link to={change.to} className="shrink-0 py-2 text-grey-600 hover:text-ink">
            {change.label}
          </Link>
        ) : (
          <button onClick={change.onClick} className="shrink-0 py-2 text-grey-600 hover:text-ink">
            {change.label}
          </button>
        )}
      </div>
    </AuthLayout>
  );
}

function useSignupFlow() {
  const [flow, setFlowState] = useState<SignupFlow | null>(() => signupFlow.get());
  const setFlow = (f: SignupFlow) => {
    signupFlow.set(f);
    setFlowState(f);
  };
  return [flow, setFlow] as const;
}

const stepPath = (f: SignupFlow | null) => (!f ? "/invite" : f.step === "email" ? "/verify/email" : f.step === "phone" ? "/verify/phone" : "/onboarding");

export function VerifyEmail() {
  const nav = useNavigate();
  const [flow, setFlow] = useSignupFlow();
  if (!flow?.email || flow.step !== "email") return <Navigate to={stepPath(flow)} replace />;
  const f = flow;
  return (
    <CodeStep
      title="Check your email"
      step="Step 2 of 4"
      challenge={f.email!}
      onChallenge={(c) => setFlow({ ...f, email: c })}
      change={{ label: "Wrong email?", to: "/invite" }}
      verify={async (code) => {
        const r = await api.post<{ next: string; onboarding_token: string }>("/api/auth/otp/verify", { challenge: f.email!.challenge, code }, pub);
        setFlow({ ...f, onboarding_token: r.onboarding_token, step: "phone" });
        nav("/verify/phone");
      }}
    />
  );
}

export function VerifyPhone() {
  const nav = useNavigate();
  const [flow, setFlow] = useSignupFlow();
  const [cc, setCc] = useState(flow?.countryCode ?? "+91");
  const [num, setNum] = useState(flow?.phoneInput ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!flow?.onboarding_token || flow.step !== "phone") return <Navigate to={stepPath(flow)} replace />;
  const f = flow;

  if (f.phone)
    return (
      <CodeStep
        key={f.phone.challenge}
        title="Check your phone"
        step="Step 3 of 4"
        challenge={f.phone}
        onChallenge={(c) => setFlow({ ...f, phone: c })}
        change={{ label: "Change number", onClick: () => setFlow({ ...f, phone: undefined }) }}
        verify={async (code) => {
          const r = await api.post<{ next: string; onboarding_token: string; user: User }>("/api/auth/otp/verify", { challenge: f.phone!.challenge, code }, pub);
          setFlow({ ...f, onboarding_token: r.onboarding_token, user: r.user, step: "profile" });
          nav("/onboarding");
        }}
      />
    );

  return (
    <AuthLayout step="Step 3 of 4">
      <h1 className="text-[28px] font-semibold">Add your phone number</h1>
      <p className="mt-2 text-grey-600">
        {isTeam(f.invite.role)
          ? "We use it only to confirm it's you. Candidates never see it. We'll text you a code to confirm it."
          : "Recruiters use it only to reach you about interviews. We'll text you a code to confirm it."}
      </p>
      <form
        className="mt-8 space-y-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          const digits = num.replace(/\D/g, "");
          try {
            const ch = await api.post<Challenge>("/api/auth/phone", { onboarding_token: f.onboarding_token, phone: `${cc}${digits}` }, pub);
            setFlow({ ...f, phone: ch, phoneInput: num, countryCode: cc });
          } catch (err) {
            setError(errorText(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Mobile number">
          <div className="flex gap-2">
            <Select className="w-24 shrink-0" value={cc} onChange={(e) => setCc(e.target.value)} aria-label="Country code">
              <option>+91</option>
              <option>+1</option>
              <option>+44</option>
              <option>+971</option>
            </Select>
            <Input
              value={num}
              onChange={(e) => setNum(e.target.value)}
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="98480 22314"
              className={cx("tnum min-w-0 flex-1", error && "border-bad")}
              required
            />
          </div>
        </Field>
        <FormError>{error}</FormError>
        <Button className="w-full" disabled={busy || num.replace(/\D/g, "").length < 6}>
          {busy ? "Sending code" : "Send code"}
        </Button>
      </form>
    </AuthLayout>
  );
}

const YEARS = [2023, 2024, 2025, 2026, 2027, 2028];

export function Onboarding() {
  const nav = useNavigate();
  const { signIn } = useAuth();
  const [flow] = useSignupFlow();
  const u = flow?.user;
  const [form, setForm] = useState({
    name: u?.name ?? "",
    college: u?.college ?? "",
    grad_year: String(u?.grad_year ?? 2026),
    city: u?.city ?? "",
    title: u?.title ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!flow?.onboarding_token || flow.step !== "profile") return <Navigate to={stepPath(flow)} replace />;
  const team = isTeam(flow.invite.role);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <AuthLayout step="Step 4 of 4">
      <h1 className="text-[28px] font-semibold">A few basics</h1>
      <p className="mt-2 text-grey-600">
        {team ? "Candidates see your name and title when you update them. You can change it later." : "This fills in every application for you. You can change it later."}
      </p>
      <form
        className="mt-8 space-y-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          const body = team
            ? { onboarding_token: flow.onboarding_token, name: form.name, title: form.title }
            : { onboarding_token: flow.onboarding_token, name: form.name, college: form.college, grad_year: Number(form.grad_year), city: form.city };
          try {
            const t = await api.post<Tokens>("/api/auth/onboarding", body, pub);
            signIn(t);
            nav(homeFor(t.user.role), { replace: true });
          } catch (err) {
            setError(errorText(err));
            setBusy(false);
          }
        }}
      >
        <Field label="Full name">
          <Input value={form.name} onChange={set("name")} autoComplete="name" required />
        </Field>
        {team ? (
          <Field label="Job title">
            <Input value={form.title} onChange={set("title")} placeholder="Recruiter, Talent team" autoComplete="organization-title" required />
          </Field>
        ) : (
          <>
            <Field label="College or current company">
              <Input value={form.college} onChange={set("college")} required />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Graduation year">
                <Select value={form.grad_year} onChange={set("grad_year")}>
                  {YEARS.map((y) => (
                    <option key={y}>{y}</option>
                  ))}
                </Select>
              </Field>
              <Field label="City">
                <Input value={form.city} onChange={set("city")} autoComplete="address-level2" required />
              </Field>
            </div>
          </>
        )}
        <FormError>{error}</FormError>
        <Button className="w-full" disabled={busy}>
          {busy ? "Saving" : "Finish setup"}
        </Button>
      </form>
    </AuthLayout>
  );
}

export function Login() {
  const nav = useNavigate();
  const loc = useLocation();
  const { user, ready, signIn } = useAuth();
  const [flow, setFlowState] = useState<LoginFlow | null>(() => loginFlow.get());
  const [email, setEmail] = useState(flow?.email ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setFlow = (f: LoginFlow | null) => {
    if (f) loginFlow.set(f);
    else loginFlow.clear();
    setFlowState(f);
  };

  if (ready && user && !flow) return <Navigate to={homeFor(user.role)} replace />;

  if (flow)
    return (
      <CodeStep
        title="Check your email"
        challenge={flow.challenge}
        onChallenge={(c) => setFlow({ ...flow, challenge: c })}
        change={{ label: "Wrong email?", onClick: () => setFlow(null) }}
        verify={async (code) => {
          const r = await api.post<Tokens & { next: string }>("/api/auth/otp/verify", { challenge: flow.challenge.challenge, code }, pub);
          loginFlow.clear();
          if (r.user.role === "admin") {
            nav("/admin", { replace: true });
            return;
          }
          signIn(r);
          const from = (loc.state as { from?: string } | null)?.from;
          const home = homeFor(r.user.role);
          const fits = from && (from.startsWith("/r/") === home.startsWith("/r/"));
          nav(fits ? from : home, { replace: true });
        }}
      />
    );

  return (
    <AuthLayout>
      <h1 className="text-[28px] font-semibold">Sign in</h1>
      <p className="mt-2 text-grey-600">We'll email you a code. No password needed.</p>
      <form
        className="mt-8 space-y-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            const ch = await api.post<Challenge>("/api/auth/login", { email: email.trim() }, pub);
            setFlow({ email: email.trim(), challenge: ch });
          } catch (err) {
            setError(errorText(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Email">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@college.edu"
            autoComplete="email"
            required
            className={cx(error && "border-bad")}
          />
        </Field>
        <FormError>{error}</FormError>
        <Button className="w-full" disabled={busy}>
          {busy ? "Sending code" : "Email me a code"}
        </Button>
      </form>
      <p className="mt-8 border-t border-grey-200 pt-6 text-[14px] text-grey-600">
        New here?{" "}
        <Link to="/invite" className="inline-block py-2 font-medium text-ink underline underline-offset-2">
          Use an invite
        </Link>
      </p>
    </AuthLayout>
  );
}

export function AdminNotice() {
  const { user, signOut } = useAuth();
  return (
    <AuthLayout>
      <h1 className="text-[28px] font-semibold">Use the admin panel</h1>
      <p className="mt-2 text-grey-600">
        This app is for candidates and hiring teams. Admin accounts sign in on the admin panel to manage invites, companies and settings.
      </p>
      <a
        href={ADMIN_URL}
        className="mt-8 inline-flex h-10 w-full items-center justify-center rounded-full bg-ink px-5 text-[14px] font-medium text-paper hover:bg-grey-800"
      >
        Open the admin panel
      </a>
      {user && (
        <Button variant="secondary" className="mt-3 w-full" onClick={signOut}>
          Sign out here
        </Button>
      )}
    </AuthLayout>
  );
}

export function RequestAccess() {
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({ joining_as: "candidate", name: "", email: "", organisation: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });
  if (done)
    return (
      <AuthLayout>
        <h1 className="text-[28px] font-semibold">Request received</h1>
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
      <h1 className="text-[28px] font-semibold">Request access</h1>
      <p className="mt-2 text-grey-600">Tell us who you are. We add candidates and hiring teams in small groups.</p>
      <form
        className="mt-8 space-y-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            await api.post("/api/auth/access-requests", form, pub);
            setDone(true);
          } catch (err) {
            setError(errorText(err));
            setBusy(false);
          }
        }}
      >
        <Field label="I'm joining as">
          <Select value={form.joining_as} onChange={set("joining_as")}>
            <option value="candidate">A candidate</option>
            <option value="recruiter">A recruiter or hiring manager</option>
          </Select>
        </Field>
        <Field label="Full name">
          <Input required autoComplete="name" value={form.name} onChange={set("name")} />
        </Field>
        <Field label="Email">
          <Input type="email" required autoComplete="email" value={form.email} onChange={set("email")} />
        </Field>
        <Field label="College or company">
          <Input required value={form.organisation} onChange={set("organisation")} />
        </Field>
        <FormError>{error}</FormError>
        <Button className="w-full" disabled={busy}>
          {busy ? "Sending" : "Send request"}
        </Button>
      </form>
    </AuthLayout>
  );
}
