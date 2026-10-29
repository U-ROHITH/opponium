import type React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { CalendarClock, FileSearch } from "lucide-react";
import { LogoMark, Wordmark } from "./Logo";
import { C, E, fontCss } from "./theme";
import { Check, EyeIcon, MotionBlur, Node, type NodeState, STAGES, display, ip, ipScale, ui, useLayout } from "./kit";

/* ---------- S1: type slam "48" / "hours." (0-29) ---------- */

/** Where the period of "hours." sits. S2 picks the dot up from here. */
export const periodPos = (W: number, H: number, v: boolean) => (v ? { x: W / 2 + 360, y: H / 2 + 92, r: 26 } : { x: W / 2 + 600, y: H / 2 + 150, r: 40 });

function S1() {
  const f = useCurrentFrame();
  const { W, H, cx, cy, v } = useLayout();
  const p = periodPos(W, H, v);
  const word = f < 15 ? "48" : "hours";
  const local = f < 15 ? f : f - 15;
  const s = ip(local, [0, 7], [1.14, 1], E.expoOut);
  const size = f < 15 ? (v ? 640 : 860) : v ? 300 : 480;
  const letters = word.split("");
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      {[0.3, 0.15].map((o, i) =>
        local < 5 && f < 15 ? (
          <div key={i} style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${s * (1 + 0.02 * (i + 1))})`, opacity: o * (1 - local / 5) }}>
            <Slam word={word} size={size} f={-1} />
          </div>
        ) : null,
      )}
      {f < 15 ? (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${s})` }}>
          <Slam word={word} size={size} f={-1} />
        </div>
      ) : (
        <>
          <div
            style={{
              position: "absolute",
              right: W - p.x + p.r * 1.6,
              top: p.y + p.r - size * 0.74,
              transform: `scale(${s})`,
              transformOrigin: "100% 74%",
              display: "flex",
              ...display(size, 700, { color: C.paper, letterSpacing: "-0.03em" }),
            }}
          >
            {letters.map((ch, i) => {
              const k = letters.length - 1 - i; // exit right to left
              const t = ip(f, [22 + k, 28 + k], [0, 1], E.expoIn);
              return (
                <span key={i} style={{ display: "inline-block", transform: `translateY(${t * 40}px)`, opacity: 1 - t }}>
                  {ch}
                </span>
              );
            })}
          </div>
          <div style={{ position: "absolute", left: p.x - p.r, top: p.y - p.r, width: p.r * 2, height: p.r * 2, borderRadius: "50%", background: C.paper, transform: `scale(${s})` }} />
        </>
      )}
      <div style={{ position: "absolute", left: cx, top: cy }} />
    </AbsoluteFill>
  );
}

function Slam({ word, size }: { word: string; size: number; f: number }) {
  return <div style={{ ...display(size, 700, { color: C.paper, letterSpacing: "-0.04em" }) }}>{word}</div>;
}

/* ---------- S2: the dot presses "Send application" (30-59) ---------- */

function S2() {
  const f = useCurrentFrame(); // 0..29
  const { W, H, cx, cy, v } = useLayout();
  const p = periodPos(W, H, v);
  const cam = ip(f, [0, 29], [1.25, 1], E.inOut);
  const bw = v ? 820 : 980;
  const bh = v ? 160 : 176;
  const target = { x: cx + bw / 2 - bh / 2, y: cy };
  // dot arcs from the period onto the button
  const t = ip(f, [0, 14], [0, 1], E.inOut);
  const ctrl = { x: (p.x + target.x) / 2 + 80, y: Math.min(p.y, target.y) - (v ? 320 : 260) };
  const dx = (1 - t) ** 2 * p.x + 2 * (1 - t) * t * ctrl.x + t * t * target.x;
  const dy = (1 - t) ** 2 * p.y + 2 * (1 - t) * t * ctrl.y + t * t * target.y;
  const dr = ip(f, [0, 14], [p.r, v ? 30 : 34], E.inOut);
  const press = f >= 15 && f < 18 ? 0.97 : ip(f, [18, 20], [0.97, 1], E.expoOut);
  const roll = ip(f, [18, 24], [0, 1], E.expoOut);
  const whip = ip(f, [25, 29], [0, 1], E.expoIn);
  const x = whip * (v ? 0 : -2400);
  const y = whip * (v ? -2600 : 0);
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <MotionBlur id="mb2" amount={whip * 40} vertical={v} style={{ position: "absolute", inset: 0, transform: `translate(${x}px, ${y}px)` }}>
        <AbsoluteFill style={{ transform: `scale(${cam})`, transformOrigin: `${cx}px ${cy}px` }}>
          <div
            style={{
              position: "absolute",
              left: cx - bw / 2,
              top: cy - bh / 2,
              width: bw,
              height: bh,
              borderRadius: bh,
              background: C.ink,
              transform: `scale(${press})`,
              overflow: "hidden",
            }}
          >
            {["Send application", "Application sent"].map((label, i) => (
              <div
                key={label}
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 18,
                  paddingRight: bh * 0.7,
                  color: C.paper,
                  transform: `translateY(${(i - roll) * bh}px)`,
                  ...ui(v ? 54 : 62, 600),
                }}
              >
                {i === 1 && <Check size={v ? 50 : 56} weight={3} />}
                {label}
              </div>
            ))}
          </div>
          <div
            style={{
              position: "absolute",
              left: dx - dr,
              top: dy - dr,
              width: dr * 2,
              height: dr * 2,
              borderRadius: "50%",
              background: t >= 1 ? C.paper : C.ink,
              boxShadow: t >= 1 ? "none" : `0 0 0 ${v ? 5 : 6}px ${C.paper}`,
              transform: `scale(${f >= 15 && f < 18 ? 0.9 : 1})`,
            }}
          />
        </AbsoluteFill>
      </MotionBlur>
    </AbsoluteFill>
  );
}

/* ---------- S3: macro push into the "viewed" pupil (60-89) ---------- */

function S3() {
  const f = useCurrentFrame(); // 0..29
  const { cx, cy, v } = useLayout();
  const land = ip(f, [0, 5], [1, 0], E.backOut);
  const icon = v ? 140 : 170;
  const cardW = v ? 960 : 1460;
  const cardH = v ? 250 : 280;
  // the pupil is the zoom origin and sits at frame centre after landing
  const cardLeft = cx - cardW / 2;
  const pupil = { x: cardLeft + 48 + icon / 2, y: cy };
  const zoom = ipScale(f, [8, 29], [1, 90], E.expoIn);
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <MotionBlur
        id="mb3"
        amount={land * 40}
        vertical={v}
        style={{ position: "absolute", inset: 0, transform: `translate(${v ? 0 : land * 2400}px, ${v ? land * 2600 : 0}px)` }}
      >
        <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: `${pupil.x}px ${pupil.y}px` }}>
          <div
            style={{
              position: "absolute",
              left: cardLeft,
              top: pupil.y - cardH / 2,
              width: cardW,
              height: cardH,
              borderRadius: 28,
              border: `2px solid ${C.g200}`,
              background: C.paper,
              display: "flex",
              alignItems: "center",
              gap: 36,
              padding: "0 48px",
            }}
          >
            <EyeIcon size={icon} />
            <div>
              <div style={ui(v ? 46 : 66, 500, { color: C.ink })}>Your application was viewed</div>
              <div style={ui(v ? 30 : 38, 400, { color: C.g500, marginTop: 10 })}>Thu 29 Oct, 20:30</div>
            </div>
          </div>
        </AbsoluteFill>
      </MotionBlur>
    </AbsoluteFill>
  );
}

/* ---------- S4: 3D pull-out of the tracker (90-149) ---------- */

type Sig = { at: number; icon: "eye" | "file" | "done" | "cal"; text: string; time: string };

function SignalRow({ s, f, size }: { s: Sig; f: number; size: number }) {
  const t = ip(f, [s.at, s.at + 12], [0, 1], E.expoOut);
  if (f < s.at) return null;
  const iconBox = size * 1.9;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.8, opacity: t, transform: `translateY(${(1 - t) * -16}px)`, filter: `blur(${(1 - t) * 8}px)` }}>
      <div
        style={{
          width: iconBox,
          height: iconBox,
          borderRadius: "50%",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: s.icon === "done" ? C.ok : C.paper,
          border: s.icon === "done" ? "none" : `2px solid ${C.g300}`,
          color: C.ink,
        }}
      >
        {s.icon === "eye" && <EyeIcon size={iconBox} />}
        {s.icon === "file" && <FileSearch size={size * 0.95} strokeWidth={2} />}
        {s.icon === "cal" && <CalendarClock size={size * 0.95} strokeWidth={2} />}
        {s.icon === "done" && <Check size={size * 1.05} />}
      </div>
      <div>
        <div style={ui(size, 500, { color: C.ink })}>{s.text}</div>
        <div style={ui(size * 0.66, 400, { color: C.g500, marginTop: 4 })}>{s.time}</div>
      </div>
    </div>
  );
}

function Stepper({ states, size, vertical, labels = true, dark, gapPx }: { states: NodeState[]; size: number; vertical?: boolean; labels?: boolean; dark?: boolean; gapPx?: number }) {
  const gap = gapPx ?? size * 5.2;
  return (
    <div style={{ position: "relative", display: "flex", flexDirection: vertical ? "column" : "row", gap: vertical ? size * 1.3 : 0 }}>
      {STAGES.map((label, i) => (
        <div key={label} style={{ display: "flex", flexDirection: vertical ? "row" : "column", alignItems: vertical ? "center" : "flex-start", gap: size * 0.55, width: vertical ? undefined : gap, position: "relative" }}>
          {i < STAGES.length - 1 && (
            <div
              style={{
                position: "absolute",
                background: states[i] === "done" ? C.ok : dark ? "#444" : C.g200,
                ...(vertical ? { left: size / 2 - 1.5, top: size, width: 3, height: size * 1.3 } : { top: size / 2 - 1.5, left: size, width: gap - size, height: 3 }),
              }}
            />
          )}
          <Node state={states[i]} size={size} dark={dark} />
          {labels && (
            <div style={ui(size * 0.5, states[i] === "current" ? 600 : 500, { color: states[i] === "future" ? C.g500 : dark ? C.paper : C.ink, maxWidth: vertical ? undefined : gap - 16 })}>{label}</div>
          )}
        </div>
      ))}
    </div>
  );
}

function S4() {
  const f = useCurrentFrame(); // 0..59
  const { W, H, cx, cy, v } = useLayout();
  const pull = ipScale(f, [0, 28], [90, 1.08], E.expoOut);
  const rx = f <= 28 ? ip(f, [0, 28], [0, 24], E.expoOut) : ip(f, [28, 59], [24, 20], E.inOut);
  const rz = (f <= 28 ? ip(f, [0, 28], [0, -12], E.expoOut) : ip(f, [28, 59], [-12, -9], E.inOut)) * (v ? 0.5 : 1);
  const tz = ip(f, [0, 28], [0, -120], E.expoOut);
  const swing = ip(f, [55, 59], [0, 35], E.expoIn);
  const exit = ip(f, [55, 59], [0, 1], E.expoIn);
  const node = v ? 52 : 56;
  const states: NodeState[] = [f >= 30 ? "done" : "current", f >= 40 ? "current" : "future", "future", "future", "future"];
  const sigs: Sig[] = [
    { at: 30, icon: "done", text: "Step completed: Resume screen", time: "Fri 30 Oct, 10:36" },
    { at: 15, icon: "file", text: "Reviewing your resume", time: "Thu 29 Oct, 20:48" },
    { at: -20, icon: "eye", text: "Your application was viewed", time: "Thu 29 Oct, 20:30" },
  ];
  const cardW = v ? 920 : 1500;
  const cardH = v ? 1420 : 860;
  const left = cx - cardW / 2;
  const top = cy - cardH / 2;
  const pad = v ? 64 : 72;
  // node 1 centre, used as the zoom origin so the black frame resolves into it
  const n1 = v ? { x: left + pad + node / 2, y: top + pad + 250 + node / 2 } : { x: left + pad + node / 2, y: top + pad + 210 + node / 2 };
  // the travelling dot moves from node 1 to node 2 over f34-44
  return (
    <AbsoluteFill style={{ background: C.paper, perspective: 1600, perspectiveOrigin: `${cx}px ${cy}px` }}>
      <MotionBlur id="mb4" amount={exit * 40} vertical={v} style={{ position: "absolute", inset: 0, transform: `translate(${v ? 0 : exit * -2600}px, ${v ? exit * -2800 : 0}px)` }}>
        <AbsoluteFill style={{ transformStyle: "preserve-3d", transform: `translateZ(${tz}px) rotateX(${rx}deg) rotateZ(${rz}deg) rotateY(${swing}deg)`, transformOrigin: `${cx}px ${cy}px` }}>
        <AbsoluteFill style={{ transform: `scale(${pull})`, transformOrigin: `${n1.x}px ${n1.y}px` }}>
          <div style={{ position: "absolute", left, top, width: cardW, height: cardH, borderRadius: 36, border: `2px solid ${C.g200}`, background: C.paper, padding: pad }}>
            <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
              <div style={{ width: 88, height: 88, borderRadius: 16, background: C.ink, color: C.paper, display: "flex", alignItems: "center", justifyContent: "center", ...display(42, 600) }}>K</div>
              <div>
                <div style={display(v ? 52 : 56, 600, { color: C.ink })}>Frontend Engineer</div>
                <div style={ui(v ? 30 : 32, 400, { color: C.g600, marginTop: 6 })}>Kite Labs, applied Thu 29 Oct, 20:26</div>
              </div>
            </div>
            <div style={{ marginTop: v ? 76 : 66 }}>
              <Stepper states={states} size={node} vertical={v} gapPx={v ? undefined : (cardW - pad * 2) / 5} />
            </div>
            <div style={{ position: "absolute", left: pad, right: pad, top: v ? 840 : 500, display: "flex", flexDirection: "column", gap: v ? 40 : 34 }}>
              {sigs.map((s) => (
                <SignalRow key={s.text} s={s} f={f} size={v ? 34 : 34} />
              ))}
            </div>
          </div>
        </AbsoluteFill>
        </AbsoluteFill>
      </MotionBlur>
      <div style={{ position: "absolute", width: W, height: H }} />
    </AbsoluteFill>
  );
}

/* ---------- S5: beat-locked whips across the stages (150-209) ---------- */

function S5() {
  const f = useCurrentFrame(); // 0..59
  const { W, H, v } = useLayout();
  const span = v ? H : W;
  // four whips, each 5 frames, centred on frames 0,15,30,45 of this shot
  let offset = 0;
  let blur = 0;
  for (let i = 0; i < 4; i++) {
    const c = i * 15;
    const p = ip(f, [c - 2, c + 2], [0, 1], E.inOut);
    offset += p;
    if (f >= c - 2 && f <= c + 2) blur = 40 * Math.sin(Math.PI * ((f - (c - 2)) / 4));
  }
  const shift = (offset - 1) * span + f * 0.4; // card 0 = Profile review
  const cards: { name: string; state: NodeState; sub: string }[] = [
    { name: "Profile review", state: "done", sub: "Completed" },
    { name: "HR interview", state: "current", sub: "In progress" },
    { name: "Hiring manager interview", state: "future", sub: "Step 4" },
    { name: "Decision", state: "future", sub: "Step 5" },
  ];
  const idx = Math.max(0, Math.min(3, Math.round(offset - 1)));
  const markerX = v ? 140 : 300;
  const markerY = v ? 760 : H / 2;
  const nameSize = v ? 120 : 150;
  const sched = ip(f, [20, 32], [0, 1], E.expoOut);
  return (
    <AbsoluteFill style={{ background: C.paper, overflow: "hidden" }}>
      <MotionBlur id="mb5" amount={blur} vertical={v} style={{ position: "absolute", inset: 0 }}>
        {cards.map((c, i) => {
          const pos = i * span - shift;
          return (
            <div
              key={c.name}
              style={{
                position: "absolute",
                left: v ? 0 : pos,
                top: v ? pos : 0,
                width: W,
                height: H,
              }}
            >
              <div style={{ position: "absolute", left: markerX + (v ? 110 : 150), top: markerY - nameSize * (v ? 0.55 : 0.6), right: v ? 90 : 120 }}>
                <div style={display(nameSize, 600, { color: c.state === "future" ? C.g500 : C.ink, letterSpacing: "-0.03em" })}>{c.name}</div>
                <div style={ui(v ? 40 : 44, 500, { color: C.g500, marginTop: v ? 28 : 32 })}>{c.sub}</div>
                {i === 1 && (
                  <div
                    style={{
                      marginTop: v ? 48 : 44,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 18,
                      padding: "18px 30px",
                      borderRadius: 999,
                      border: `2px solid ${C.g300}`,
                      opacity: sched,
                      transform: `translateY(${(1 - sched) * 16}px)`,
                      filter: `blur(${(1 - sched) * 8}px)`,
                      ...ui(v ? 36 : 40, 500, { color: C.ink }),
                    }}
                  >
                    <CalendarClock size={v ? 36 : 40} strokeWidth={2} />
                    Interview scheduled
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </MotionBlur>
      <div style={{ position: "absolute", left: markerX - 45, top: markerY - 45 }}>
        <Node state={cards[idx].state} size={90} />
      </div>
    </AbsoluteFill>
  );
}

/* ---------- S6: "Every step, live." (210-269) ---------- */

function S6() {
  const f = useCurrentFrame(); // 0..59
  const { cx, cy, v } = useLayout();
  const words = ["Every", "step,", "live."];
  const size = v ? 220 : 200;
  const line = ip(f, [2, 40], [0, 1], E.inOut);
  const drift = ip(f, [0, 59], [1, 1.02], E.inOut);
  const states: NodeState[] = ["done", "done", "current", "future", "future"];
  const sw = v ? 820 : 1200;
  const node = v ? 52 : 56;
  return (
    <AbsoluteFill style={{ background: C.ink, transform: `scale(${drift})` }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: v ? cy - 620 : cy - 200,
          display: "flex",
          flexDirection: v ? "column" : "row",
          alignItems: "center",
          justifyContent: "center",
          gap: v ? 10 : 48,
        }}
      >
        {words.map((w, i) => {
          const at = i * 15;
          const s = ip(f, [at, at + 6], [1.06, 1], E.expoOut);
          return (
            <div key={w} style={{ ...display(size, 600, { color: C.paper, letterSpacing: "-0.03em" }), opacity: f >= at ? 1 : 0, transform: `scale(${s})` }}>
              {w}
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: cx - sw / 2, top: v ? cy + 360 : cy + 140, width: sw, height: node }}>
        <div style={{ position: "absolute", top: node / 2 - 2, left: node / 2, height: 4, width: (sw - node) * line, background: "#3a3a3a" }} />
        <div style={{ position: "absolute", top: node / 2 - 2, left: node / 2, height: 4, width: (sw - node) * 0.5 * Math.min(1, line * 2), background: C.ok }} />
        {states.map((st, i) => {
          const at = 4 + i * 4 + 10;
          const s = ip(f, [at, at + 10], [0.93, 1], E.backOut);
          const o = ip(f, [at, at + 6], [0, 1], E.expoOut);
          return (
            <div key={i} style={{ position: "absolute", left: ((sw - node) / 4) * i, top: 0, transform: `scale(${s})`, opacity: o }}>
              <Node state={st} size={node} dark />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

/* ---------- S7: the 48 hour ring and the split-flap date (270-344) ---------- */

export const ringGeom = (W: number, H: number, v: boolean) => (v ? { x: W / 2, y: 700, r: 280 } : { x: W / 2 - 520, y: H / 2, r: 230 });

function Odometer({ text, f, start, size }: { text: string; f: number; start: number; size: number }) {
  return (
    <div style={{ display: "flex", ...display(size, 600, { color: C.ink, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }) }}>
      {text.split("").map((ch, i) => {
        const at = start + i * 1.5;
        const t = ip(f, [at, at + 8], [0, 1], E.expoOut);
        const out = ip(f, [75 + i * 0.6, 83 + i * 0.6], [0, 1], E.expoIn);
        return (
          <span key={i} style={{ display: "inline-block", overflow: "hidden", height: size * 1.12, whiteSpace: "pre" }}>
            <span style={{ display: "inline-block", transform: `translateY(${(1 - t) * 100 - out * 24}%)`, opacity: t * (1 - out) }}>{ch}</span>
          </span>
        );
      })}
    </div>
  );
}

function S7() {
  const f = useCurrentFrame(); // 0..74
  const { W, H, cx, cy, v } = useLayout();
  const g = ringGeom(W, H, v);
  const draw = ip(f, [0, 30], [0, 1], E.inOut);
  const cam = ip(f, [0, 74], [1, 1.05], E.inOut);
  const ry = ip(f, [0, 74], [-8, 0], E.inOut);
  const a = -Math.PI / 2 + draw * Math.PI * 2;
  const head = { x: g.x + g.r * Math.cos(a), y: g.y + g.r * Math.sin(a) };
  const circ = 2 * Math.PI * g.r;
  const label = ip(f, [2, 14], [0, 1], E.expoOut);
  const textLeft = v ? 90 : cx - 200;
  const textTop = v ? 1140 : cy - 120;
  return (
    <AbsoluteFill style={{ background: C.paper, perspective: 1800 }}>
      <AbsoluteFill style={{ transform: `scale(${cam}) rotateY(${ry}deg)`, transformOrigin: `${cx}px ${cy}px` }}>
        <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
          <circle cx={g.x} cy={g.y} r={g.r} fill="none" stroke="#E4E4E4" strokeWidth={14} />
          <circle
            cx={g.x}
            cy={g.y}
            r={g.r}
            fill="none"
            stroke={C.ink}
            strokeWidth={14}
            strokeLinecap="round"
            strokeDasharray={`${circ * draw} ${circ}`}
            transform={`rotate(-90 ${g.x} ${g.y})`}
          />
          <circle cx={head.x} cy={head.y} r={22} fill={C.ink} stroke={C.paper} strokeWidth={6} />
        </svg>
        <div style={{ position: "absolute", left: g.x - 200, width: 400, top: g.y - 50, textAlign: "center" }}>
          <div style={display(v ? 96 : 84, 600, { color: C.ink })}>48h</div>
        </div>
        <div style={{ position: "absolute", left: textLeft, top: textTop, opacity: label * ip(f, [75, 83], [1, 0], E.expoIn) }}>
          <div style={ui(v ? 42 : 46, 500, { color: C.g500 })}>You'll hear back by</div>
        </div>
        <div style={{ position: "absolute", left: textLeft - 4, top: textTop + (v ? 70 : 78) }}>
          {v ? (
            <>
              <Odometer text="Sat 31 Oct," f={f} start={2} size={128} />
              <Odometer text="20:26" f={f} start={18} size={128} />
            </>
          ) : (
            <Odometer text="Sat 31 Oct, 20:26" f={f} start={2} size={120} />
          )}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

/* ---------- S8 + S9: the ring becomes the logo, end card (345-449) ---------- */

// Logo geometry in its 633x594 viewBox: ring centre, mid radius, weight, gap and dot.
const LOGO = { w: 633, h: 594, cx: 317, cy: 317, r: 267, weight: 85, gapStart: 57.6, gapEnd: 130.6, dot: { x: 389, y: 515, r: 71 } };

const lockup = (W: number, H: number, v: boolean) => {
  if (v) {
    const markH = 300;
    const s = markH / LOGO.h;
    const markW = LOGO.w * s;
    return { s, markX: W / 2 - markW / 2, markY: 560, markW, markH, wordX: W / 2 - 330, wordY: 560 + markH + 70, wordH: 92, wordW: 660 };
  }
  const markH = 250;
  const s = markH / LOGO.h;
  const markW = LOGO.w * s;
  const wordH = 74;
  const wordW = (wordH * 1228) / 174;
  const total = markW + 54 + wordW;
  const x0 = W / 2 - total / 2;
  return { s, markX: x0, markY: H / 2 - markH / 2, markW, markH, wordX: x0 + markW + 54, wordY: H / 2 - wordH / 2, wordH, wordW };
};

function S8S9({ url = "opponium.com" }: { url?: string }) {
  const f = useCurrentFrame(); // 0..104 (345-449)
  const { W, H, cx, v } = useLayout();
  const g = ringGeom(W, H, v);
  const L = lockup(W, H, v);
  const m = ip(f, [0, 15], [0, 1], E.inOut);
  const target = { x: L.markX + LOGO.cx * L.s, y: L.markY + LOGO.cy * L.s, r: LOGO.r * L.s, w: LOGO.weight * L.s };
  const rx = g.x + (target.x - g.x) * m;
  const ry = g.y + (target.y - g.y) * m;
  const rr = g.r + (target.r - g.r) * m;
  const rw = 14 + (target.w - 14) * m;
  const circ = 2 * Math.PI * rr;
  const arcFrac = 1 - m * ((LOGO.gapEnd - LOGO.gapStart) / 360);
  const arrow = ip(f, [9, 15], [0, 1], E.expoOut);
  const swapped = f >= 15;
  const dotLand = ip(f, [9, 15], [0, 1], E.backOut);
  const word = ip(f, [17, 29], [0, 1], E.expoOut);
  // end card
  const rise = ip(f, [45, 57], [0, 1], E.expoOut);
  const lift = rise * (v ? 160 : 120);
  const drift = ip(f, [45, 104], [1, 1.015], E.inOut);
  const lineWords = ["Apply", "once.", "Hear", "back", "within", "48", "hours."];
  const tail = ip(f, [67, 79], [0, 1], E.expoOut);
  const dot = { x: L.markX + LOGO.dot.x * L.s, y: L.markY + LOGO.dot.y * L.s, r: LOGO.dot.r * L.s };
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <AbsoluteFill style={{ transform: `translateY(${-lift}px) scale(${drift})`, transformOrigin: `${cx}px ${H / 2}px` }}>
        {!swapped ? (
          <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
            <circle
              cx={rx}
              cy={ry}
              r={rr}
              fill="none"
              stroke={C.paper}
              strokeWidth={rw}
              strokeDasharray={`${circ * arcFrac} ${circ}`}
              transform={`rotate(${-90 + m * (LOGO.gapEnd + 90)} ${rx} ${ry})`}
            />
            {/* arrow stand-in: from the ring's lower left toward the tip */}
            <line
              x1={L.markX + 150 * L.s}
              y1={L.markY + 520 * L.s}
              x2={L.markX + (150 + (451 - 150) * arrow) * L.s}
              y2={L.markY + (520 + (200 - 520) * arrow) * L.s}
              stroke={C.paper}
              strokeWidth={70 * L.s}
              strokeLinecap="round"
              opacity={arrow > 0 ? 1 : 0}
            />
            <circle cx={dot.x} cy={dot.y} r={dot.r * dotLand} fill={C.paper} />
          </svg>
        ) : (
          <div style={{ position: "absolute", left: L.markX, top: L.markY, width: L.markW, height: L.markH, color: C.paper, transform: `scale(${ip(f, [15, 19], [1.02, 1], E.expoOut)})` }}>
            <LogoMark className="" />
          </div>
        )}
        <div style={{ position: "absolute", left: L.wordX, top: L.wordY, width: L.wordW, height: L.wordH, color: C.paper, clipPath: `inset(0 ${(1 - word) * 100}% 0 0)` }}>
          <Wordmark className="" />
        </div>
        <div
          style={{
            position: "absolute",
            left: v ? 90 : 0,
            right: v ? 90 : 0,
            top: v ? L.wordY + L.wordH + 130 : H / 2 + 170,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            columnGap: v ? 22 : 24,
            rowGap: 6,
          }}
        >
          {lineWords.map((w, i) => {
            const t = ip(f, [47 + i * 3, 59 + i * 3], [0, 1], E.expoOut);
            return (
              <span key={i} style={{ ...display(84, 600, { color: C.paper }), opacity: t, transform: `translateY(${(1 - t) * 16}px)`, filter: `blur(${(1 - t) * 8}px)` }}>
                {w}
              </span>
            );
          })}
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: v ? L.wordY + L.wordH + 440 : H / 2 + 300, display: "flex", justifyContent: "center", gap: 28, opacity: tail, transform: `translateY(${(1 - tail) * 12}px)` }}>
          <span style={ui(40, 500, { color: C.paper })}>{url}</span>
          <span style={ui(40, 500, { color: "#A1A1A1" })}>Invite only.</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

/* ---------- Timeline ---------- */

export const SHOTS: [number, number, (p: { url?: string }) => React.ReactElement][] = [
  [0, 30, S1],
  [30, 30, S2],
  [60, 30, S3],
  [90, 60, S4],
  [150, 60, S5],
  [210, 60, S6],
  [270, 75, S7],
  [345, 105, S8S9],
];

export function Film({ url }: { url?: string }) {
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <style>{fontCss}</style>
      {SHOTS.map(([from, dur, Shot]) => (
        <Sequence key={from} from={from} durationInFrames={dur} layout="none">
          <AbsoluteFill>
            <Shot url={url} />
          </AbsoluteFill>
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}
