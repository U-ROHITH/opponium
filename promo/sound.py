"""Music and sound design for the 16.5 s promo, all synthesised here (nothing to license).
120 BPM in A minor, 1 beat = 15 frames, 1 bar = 60 frames. Cues follow the shot list in src/Film.tsx.

Sections (frames):
  0-45     "STOP GETTING GHOSTED."  kick + sub drone, a hit per word, swell into the drop
  45-255   groove: kick, clap, hats, bass, chord plucks, arpeggio (Am F C G)
  255-315  "Every step, live."  breakdown: pad, claps on the words, no kick
  315-390  ring + date: groove returns, filtered build, big hit on the date
  390-495  logo: hit, final chord, tail
"""

import sys
import wave

import numpy as np
from scipy.signal import butter, lfilter, sosfilt

SR = 48000
FPS = 30
DUR = 17.5
N = int(SR * DUR)
rng = np.random.default_rng(11)
L = np.zeros((N, 2))  # music bus
X = np.zeros((N, 2))  # sfx bus


def at(frame):
    return int(round(frame / FPS * SR))


def t_(d):
    return np.arange(int(d * SR)) / SR


def place(bus, sig, frame, gain=1.0, pan=0.0):
    if sig.ndim == 1:
        sig = np.stack([sig * min(1, 1 - pan), sig * min(1, 1 + pan)], 1)
    s = at(frame)
    if s >= N:
        return
    e = min(N, s + len(sig))
    bus[s:e] += sig[: e - s] * gain


def lowpass(x, fc, order=2):
    return sosfilt(butter(order, min(fc, SR / 2.2) / (SR / 2), "low", output="sos"), x)


def highpass(x, fc, order=2):
    return sosfilt(butter(order, fc / (SR / 2), "high", output="sos"), x)


def bandpass(x, lo, hi):
    return sosfilt(butter(2, [lo / (SR / 2), hi / (SR / 2)], "band", output="sos"), x)


def adsr(n, a=0.005, d=0.1, s=0.6, r=0.1):
    t = np.arange(n) / SR
    dur = n / SR
    y = np.where(t < a, t / a, s + (1 - s) * np.exp(-(t - a) / d))
    rel = np.clip((dur - t) / r, 0, 1)
    return y * rel


def saw(f, d, voices=3, detune=0.12):
    t = t_(d)
    y = np.zeros_like(t)
    for v in range(voices):
        fv = f * 2 ** ((v - (voices - 1) / 2) * detune / 12)
        ph = (fv * t + rng.random()) % 1.0
        y += 2 * ph - 1
    return y / voices


def kick(d=0.45, punch=1.0):
    t = t_(d)
    f = 48 + 130 * np.exp(-t * 32)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7)
    click = highpass(rng.standard_normal(len(t)), 2500) * np.exp(-t * 300) * 0.25
    return np.tanh((body + click) * 1.8 * punch)


def clap(d=0.25):
    t = t_(d)
    n = bandpass(rng.standard_normal(len(t)), 900, 5000)
    e = np.zeros_like(t)
    for k in (0, 0.011, 0.022):
        e += np.where(t >= k, np.exp(-(t - k) * 140), 0)
    e += np.exp(-t * 18) * 0.35
    return n * e * 1.4


def hat(d=0.06, open_=False):
    t = t_(d if not open_ else 0.25)
    n = highpass(rng.standard_normal(len(t)), 7500)
    return n * np.exp(-t * (60 if not open_ else 14))


def bass(f0, d):
    y = saw(f0, d, voices=2, detune=0.08) + 0.6 * np.sin(2 * np.pi * f0 * t_(d))
    y = lowpass(y, 420)
    return np.tanh(y * 1.6) * adsr(len(y), 0.004, 0.09, 0.55, 0.03)


def pluck(freqs, d, bright=2600):
    y = sum(saw(f, d) for f in freqs) / len(freqs)
    y = lowpass(y, bright)
    return y * adsr(len(y), 0.003, 0.16, 0.0, 0.05)


def pad(freqs, d, fc=1800):
    y = sum(saw(f, d, voices=4, detune=0.18) for f in freqs) / len(freqs)
    y = lowpass(y, fc, order=4)
    t = t_(d)
    return y * np.minimum(1, t / 0.6) * np.minimum(1, (d - t) / 0.9)


def sub_hit(d=1.6, f0=44):
    t = t_(d)
    f = f0 + 110 * np.exp(-t * 24)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.6)
    noise = lowpass(rng.standard_normal(len(t)), 3000) * np.exp(-t * 30) * 0.4
    return np.tanh((body + noise) * 2.0)


def whoosh(d=0.3, lo=400, hi=5000):
    n = int(d * SR)
    k = np.arange(n) / n
    x = bandpass(rng.standard_normal(n), lo, hi)
    return x * np.sin(np.pi * k) ** 2 * 1.6


def riser(d=0.8):
    n = int(d * SR)
    k = np.arange(n) / n
    x = highpass(rng.standard_normal(n), 1200) * k**2.4 * 0.7
    f = 200 + 1400 * k**2
    return x + np.sin(2 * np.pi * np.cumsum(f) / SR) * k**2 * 0.3


def tick(f=3000, d=0.035):
    t = t_(d)
    return np.sin(2 * np.pi * f * t) * np.exp(-t * 170)


def click(bright=4000):
    t = t_(0.05)
    return highpass(rng.standard_normal(len(t)), bright) * np.exp(-t * 130) * 1.3


def reverse_swell(d=0.6):
    n = int(d * SR)
    k = np.arange(n) / n
    y = pad([220.0, 329.63, 440.0], d, 3000)
    return y * k**3


# A minor progression, one chord per bar
A2, C3, D3, E3, F2, G2 = 110.0, 130.81, 146.83, 164.81, 87.31, 98.0
CHORDS = [
    (55.0, [220.0, 261.63, 329.63]),  # Am
    (43.65, [174.61, 220.0, 261.63]),  # F
    (65.41, [196.0, 261.63, 329.63]),  # C
    (49.0, [196.0, 246.94, 293.66]),  # G
]
ARP = [0, 1, 2, 1]

# ---------------- music ----------------

# Intro (0-45): drone, kick on the beat, swell into the drop
place(L, pad([55.0, 110.0, 164.81], 1.6, 900), 0, 0.35)
for fr in (0, 15, 30):
    place(L, kick(punch=0.8), fr, 0.55)
place(L, reverse_swell(0.6), 27, 0.5)
place(L, riser(0.5), 30, 0.35)


def groove(start, end, energy=1.0, kick_on=True, filt=None):
    beat = 15
    for b in range(int((end - start) / beat)):
        fr = start + b * beat
        bar = int((fr - 45) // 60) % 4
        root, chord = CHORDS[bar]
        if kick_on:
            place(L, kick(), fr, 0.62 * energy)
        if b % 2 == 1:
            place(L, clap(), fr, 0.32 * energy, pan=0.05)
        for h in range(2):
            place(L, hat(open_=(h == 1 and b % 4 == 3)), fr + h * 7.5, (0.12 if h else 0.07) * energy, pan=0.3)
        for h in range(2):
            place(L, bass(root * (2 if (b % 4 == 3 and h == 1) else 1), 0.24), fr + h * 7.5, 0.42 * energy)
        if b % 4 == 0:
            p = pluck(chord, 1.2, filt or 2400)
            place(L, p, fr, 0.22 * energy, pan=-0.15)
        for s in range(4):
            note = chord[ARP[s]] * 2
            place(L, pluck([note], 0.14, filt or 3800), fr + s * 3.75, 0.07 * energy, pan=0.35 if s % 2 else -0.35)


groove(45, 255, 1.0)
# Breakdown (255-315): pad + claps on the words, light hats
place(L, pad([220.0, 261.63, 329.63, 440.0], 2.1, 1500), 255, 0.30)
for fr in (255, 270, 285, 300):
    place(L, hat(), fr + 7.5, 0.07, pan=0.3)
place(L, riser(0.55), 298, 0.35)
# Return (315-390): groove with filter opening, then the date hit
groove(315, 345, 0.85, filt=1400)
groove(345, 390, 1.05, filt=3200)
# Logo (390-495): final chord and tail
# The answer (390-420): bright "yes" on green, low thud on red, kick on both beats
place(L, kick(), 390, 0.6)
place(L, pluck([220.0, 277.18, 329.63, 440.0, 554.37], 0.7, 4200), 390, 0.42)
place(L, bass(55.0, 0.45), 390, 0.45)
place(L, kick(punch=1.2), 405, 0.65)
place(L, bass(41.2, 0.5), 405, 0.5)
place(L, pluck([110.0, 116.54], 0.5, 900), 405, 0.35)
place(L, pad([220.0, 261.63, 329.63, 440.0, 523.25], 3.4, 2400), 435, 0.34)
place(L, pluck([110.0, 220.0, 329.63], 2.0, 2000), 435, 0.25)
place(L, bass(55.0, 1.2), 435, 0.4)

# ---------------- sound design ----------------
for fr in (0, 9, 18):
    place(X, sub_hit(0.6, 60), fr, 0.45)
    place(X, click(3500), fr, 0.3)
place(X, sub_hit(1.4, 46), 45, 0.85)  # "48"
place(X, sub_hit(0.9, 58), 60, 0.55)  # "hours."
place(X, whoosh(0.3, 400, 3000), 81, 0.3, pan=0.3)
place(X, click(4000), 90, 0.45)  # press
place(X, whoosh(0.22, 600, 6000), 99, 0.4, pan=-0.4)
place(X, tick(), 105, 0.35)
place(X, riser(0.72), 113, 0.4)
place(X, sub_hit(1.2, 48), 135, 0.75)  # match cut
place(X, tick(2800), 150, 0.3)
place(X, tick(3400), 165, 0.35)
for k, fr in enumerate((191, 206, 221, 236)):
    place(X, whoosh(0.18, 500 * 1.12**k, 5500 * 1.12**k), fr, 0.42, pan=-0.3 + 0.2 * k)
place(X, tick(3000), 215, 0.3)
for fr in (255, 270, 285):
    place(X, clap(), fr, 0.35)
    place(X, sub_hit(0.5, 70), fr, 0.25)
for k in range(13):
    place(X, tick(2400 + 60 * k, 0.03), 317 + k * 2, 0.18)
place(X, sub_hit(1.6, 46), 345, 0.9)  # date lands
place(X, riser(0.5), 375, 0.35)
place(X, sub_hit(0.9, 62), 390, 0.6)  # green
place(X, tick(4200, 0.25), 392, 0.25)
place(X, sub_hit(1.0, 38), 405, 0.75)  # red
place(X, whoosh(0.35, 300, 3000), 418, 0.35)
place(X, sub_hit(1.9, 44), 435, 1.0)  # logo lands
place(X, click(3000), 467, 0.25)
place(X, sub_hit(2.0, 42), 495, 0.5)

# ---------------- mix ----------------
# Duck the music under the big hits (simple sidechain from the sfx bus)
env = np.abs(lowpass(np.abs(X[:, 0]), 12, order=1))
duck = 1 - 0.45 * np.clip(env / (env.max() + 1e-9) * 2.2, 0, 1)
mix = L * duck[:, None] + X
# Short room for glue
ir_t = t_(0.9)
ir = rng.standard_normal(len(ir_t)) * np.exp(-ir_t * 6)
ir = lowpass(ir, 4000)
ir /= np.sqrt((ir**2).sum())
wet = np.stack([np.convolve(mix[:, c], ir)[:N] for c in range(2)], 1)
mix = mix * 0.86 + wet * 0.18
# Fade the tail and limit to -1 dBFS
fl = int(0.8 * SR)
mix[-fl:] *= (np.linspace(1, 0, fl) ** 2)[:, None]
mix = highpass(mix.T, 28).T
peak = np.abs(mix).max()
mix = np.tanh(mix / peak * 1.4) / np.tanh(1.4) * 10 ** (-1 / 20)

with wave.open(sys.argv[1], "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype("<i2").tobytes())
print("wrote", sys.argv[1], f"{DUR}s")
