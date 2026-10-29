"""Synthesised soundtrack for the 15 s promo. 120 BPM, cues on the shot list's frames.
Everything is generated here, so there is nothing to license. Swap in licensed music later if wanted."""

import sys
import wave

import numpy as np

SR = 48000
FPS = 30
DUR = 15.0
N = int(SR * DUR)
rng = np.random.default_rng(3)
mix = np.zeros((N, 2))


def t_(d):
    return np.arange(int(d * SR)) / SR


def at(frame):
    return int(frame / FPS * SR)


def add(sig, frame, gain=1.0, pan=0.0):
    if sig.ndim == 1:
        sig = np.stack([sig * (1 - max(0, pan)), sig * (1 + min(0, pan))], 1)
    s = at(frame)
    e = min(N, s + len(sig))
    if s < N:
        mix[s:e] += sig[: e - s] * gain


def lp(x, fc):
    a = np.exp(-2 * np.pi * fc / SR)
    y = np.empty_like(x)
    s = 0.0
    for i, v in enumerate(x):
        s = (1 - a) * v + a * s
        y[i] = s
    return y


def hp(x, fc):
    return x - lp(x, fc)


def env(n, a, d):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)


def sub_hit(d=1.2, f0=58):
    t = t_(d)
    f = f0 + 90 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t * 3.2)
    click = rng.standard_normal(len(t)) * np.exp(-t * 180) * 0.35
    return np.tanh((body + click) * 1.6)


def click(d=0.06, bright=6000):
    t = t_(d)
    n = rng.standard_normal(len(t)) * np.exp(-t * 120)
    return hp(n, bright) * 1.4 + np.sin(2 * np.pi * 2200 * t) * np.exp(-t * 90) * 0.4


def tick(d=0.04, f=3200):
    t = t_(d)
    return np.sin(2 * np.pi * f * t) * np.exp(-t * 160)


def whoosh(d=0.35, f_lo=300, f_hi=4000, rev=False):
    n = int(d * SR)
    x = rng.standard_normal(n)
    t = np.arange(n) / n
    shape = np.sin(np.pi * t) ** 2
    if rev:
        shape = t**2.2 * (1 - t) ** 0.2
    # sweep a simple resonant-ish band by mixing two low-passes
    lo = lp(x, f_lo)
    hi = lp(x, f_hi) - lp(x, f_lo * 0.8)
    return (lo * 0.5 + hi * (0.4 + 0.6 * t)) * shape


def riser(d=0.75):
    n = int(d * SR)
    t = np.arange(n) / SR
    k = t / d
    noise = hp(rng.standard_normal(n), 1500) * k**2.5 * 0.6
    f = 180 + 900 * k**2
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * k**2 * 0.35
    return noise + tone


def bass_note(f0, d):
    t = t_(d)
    y = np.sin(2 * np.pi * f0 * t) + 0.35 * np.sin(2 * np.pi * f0 * 2 * t)
    return np.tanh(y * 1.3) * env(len(t), 0.004, d * 0.45)


def hat(d=0.05):
    t = t_(d)
    return hp(rng.standard_normal(len(t)), 7000) * np.exp(-t * 90)


def pad(freqs, d):
    t = t_(d)
    y = sum(np.sin(2 * np.pi * f * t + i) for i, f in enumerate(freqs)) / len(freqs)
    a = np.minimum(1, t / 0.9) * np.minimum(1, (d - t) / 1.2)
    return lp(y, 2200) * a


# --- music bed: 8th-note bass pulse in A, hats on offbeats, pad for the payoff ---
beat = 15  # frames
notes = [55.0, 55.0, 65.41, 55.0, 73.42, 55.0, 65.41, 49.0]  # A1 A1 C2 A1 D2 A1 C2 G1
for i in range(int((420 - 30) / (beat / 2))):
    fr = 30 + i * beat / 2
    if 210 <= fr < 270:  # black "Every step, live." section: thinner
        g = 0.22
    elif fr >= 345:
        g = 0.0
    else:
        g = 0.32 + 0.08 * min(1, fr / 300)
    if g:
        add(bass_note(notes[i % len(notes)], 0.22), fr, g)
        if i % 2 == 1:
            add(hat(), fr, 0.10 * (1 if fr < 300 else 1.3), pan=0.25)
add(pad([220.0, 261.63, 329.63, 392.0], 5.6), 270, 0.20)
add(pad([174.61, 220.0, 261.63, 329.63], 3.0), 360, 0.22)

# --- SFX on the shot list ---
add(sub_hit(), 0, 0.9)
add(sub_hit(f0=62), 15, 0.75)
add(click(), 15, 0.35)
add(whoosh(0.3, 400, 3000), 36, 0.35, pan=0.3)
add(click(bright=4000), 45, 0.5)
add(whoosh(0.22, 600, 5000), 54, 0.45, pan=-0.4)
add(tick(), 60, 0.4)
add(riser(0.72), 68, 0.55)
add(sub_hit(f0=50), 90, 0.85)
add(whoosh(0.4, 300, 3500, rev=True), 84, 0.3)
add(tick(f=2800), 105, 0.35)
add(tick(f=3400), 120, 0.4)
for k, fr in enumerate([146, 161, 176, 191]):
    add(whoosh(0.18, 500 * 1.12**k, 5000 * 1.12**k), fr, 0.45, pan=-0.3 + 0.2 * k)
add(tick(f=3000), 170, 0.35)
for fr in (210, 225, 240):
    add(click(bright=3500), fr, 0.5)
    add(sub_hit(0.5, 70), fr, 0.25)
for k in range(13):
    add(tick(0.03, 2400 + 60 * k), 272 + k * 2, 0.22)
add(sub_hit(1.6, 48), 300, 0.95)
add(riser(0.5), 330, 0.4)
add(whoosh(0.35, 300, 3000), 343, 0.4)
add(sub_hit(1.8, 46), 360, 1.0)
add(click(bright=3000), 392, 0.3)
add(sub_hit(2.0, 44), 420, 0.6)

# --- master: gentle limiter to -1 dBFS, fade the last 0.6 s ---
fade = np.ones(N)
fl = int(0.6 * SR)
fade[-fl:] = np.linspace(1, 0, fl) ** 2
mix *= fade[:, None]
peak = np.abs(mix).max()
mix = np.tanh(mix / peak * 1.2) / np.tanh(1.2) * 10 ** (-1 / 20)

with wave.open(sys.argv[1], "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype("<i2").tobytes())
print("wrote", sys.argv[1], f"{DUR}s")
