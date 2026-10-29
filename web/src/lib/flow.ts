import type { Challenge, Invite, User } from "../data/types";
import { session } from "./api";

/** Sign-up and sign-in progress lives in sessionStorage so a refresh mid-flow survives. */
export interface SignupFlow {
  code: string;
  invite: Invite;
  email?: Challenge;
  onboarding_token?: string;
  phone?: Challenge;
  phoneInput?: string;
  countryCode?: string;
  step: "email" | "phone" | "profile";
  user?: User;
}

export interface LoginFlow {
  email: string;
  challenge: Challenge;
}

const SIGNUP = "opp.signup";
const LOGIN = "opp.login";

function read<T>(key: string): T | null {
  const raw = session.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export const signupFlow = {
  get: () => read<SignupFlow>(SIGNUP),
  set: (f: SignupFlow) => session.set(SIGNUP, JSON.stringify(f)),
  clear: () => session.remove(SIGNUP),
};

export const loginFlow = {
  get: () => read<LoginFlow>(LOGIN),
  set: (f: LoginFlow) => session.set(LOGIN, JSON.stringify(f)),
  clear: () => session.remove(LOGIN),
};
