import type { CSSProperties, ReactNode } from "react";
import { interpolate, useVideoConfig } from "remotion";
import { C, E } from "./theme";

type Ease = (t: number) => number;

/** Clamped interpolate, frame-driven. */
export const ip = (f: number, from: [number, number], to: [number, number], ease: Ease = E.inOut) =>
  interpolate(f, from, to, { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });

/** Scale interpolates in log space so big zooms feel even. */
export const ipScale = (f: number, from: [number, number], to: [number, number], ease: Ease = E.inOut) =>
  Math.exp(ip(f, from, [Math.log(to[0]), Math.log(to[1])], ease));

export function useLayout() {
  const { width, height } = useVideoConfig();
  const v = height > width;
  return { W: width, H: height, cx: width / 2, cy: height / 2, v };
}

/** Horizontal or vertical directional blur, only while something moves fast. */
export function MotionBlur({ id, amount, vertical, children, style }: { id: string; amount: number; vertical?: boolean; children: ReactNode; style?: CSSProperties }) {
  const a = Math.max(0, amount);
  return (
    <>
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <filter id={id} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={vertical ? `0 ${a}` : `${a} 0`} />
        </filter>
      </svg>
      <div style={{ ...style, filter: a > 0.3 ? `url(#${id})` : undefined }}>{children}</div>
    </>
  );
}

export const display = (size: number, weight = 600, extra: CSSProperties = {}): CSSProperties => ({
  fontFamily: "Jost",
  fontWeight: weight,
  fontSize: size,
  lineHeight: 1,
  letterSpacing: "-0.02em",
  ...extra,
});

export const ui = (size: number, weight = 500, extra: CSSProperties = {}): CSSProperties => ({
  fontFamily: "Plex",
  fontWeight: weight,
  fontSize: size,
  lineHeight: 1.25,
  ...extra,
});

/** The eye icon, drawn so its pupil is a real circle we can zoom into. */
export function EyeIcon({ size, pupil = C.ink }: { size: number; pupil?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill={C.paper} stroke={C.g300} strokeWidth="3" />
      <path d="M18 50 C30 30 70 30 82 50 C70 70 30 70 18 50 Z" fill="none" stroke={C.ink} strokeWidth="5" strokeLinejoin="round" />
      <circle cx="50" cy="50" r="9" fill={pupil} />
    </svg>
  );
}

export function Check({ size, color = C.paper, weight = 3 }: { size: number; color?: string; weight?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={weight} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

export type NodeState = "done" | "current" | "future";

/** Stage marker: green check when done, black dot in a ring when current, hollow ring when ahead. */
export function Node({ state, size, dark }: { state: NodeState; size: number; dark?: boolean }) {
  const ring = dark ? "#555" : C.g300;
  if (state === "done")
    return (
      <div style={{ width: size, height: size, borderRadius: "50%", background: C.ok, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Check size={size * 0.62} />
      </div>
    );
  if (state === "current")
    return (
      <div style={{ width: size, height: size, borderRadius: "50%", border: `${Math.max(2, size * 0.07)}px solid ${dark ? C.paper : C.ink}`, background: dark ? C.ink : C.paper, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: size * 0.42, height: size * 0.42, borderRadius: "50%", background: dark ? C.paper : C.ink }} />
      </div>
    );
  return <div style={{ width: size, height: size, borderRadius: "50%", border: `${Math.max(2, size * 0.07)}px solid ${ring}`, background: dark ? C.ink : C.paper }} />;
}

export const STAGES = ["Resume screen", "Profile review", "HR interview", "Hiring manager interview", "Decision"];
