"""Builds public/soundtrack.wav: narration lines placed on the 60 s timeline,
plus a synthesized calm electronic score and sound design."""
import wave
import numpy as np

SR = 44100
D = 60.0
N = int(SR * D)
rng = np.random.default_rng(7)
L = np.zeros(N)
R = np.zeros(N)

# ---------- narration ----------
w = wave.open("public/narration_raw.wav", "rb")
nsr = w.getframerate()
raw = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype(float) / 32768
w.close()
# resample 24k -> 44.1k (linear)
tt = np.arange(int(len(raw) * SR / nsr)) / SR
voice = np.interp(tt, np.arange(len(raw)) / nsr, raw)

# (source start, source end, timeline position) — from silence detection
LINES = [
    (0.00, 1.60, 0.60),    # Tout commence par une lumière.
    (2.30, 4.10, 5.60),    # Une lumière qui cherche une forme.
    (5.25, 6.70, 15.60),   # Victor ouvre les yeux.
    (7.30, 9.40, 18.60),   # Un monde géométrique naît autour de lui.
    (10.05, 12.30, 25.60), # Il avance, curieux et calme.
    (13.15, 17.85, 32.60), # Devant lui, un vide. Autour de lui, des formes.
    (18.27, 20.30, 42.00), # Il transforme le vide en passage.
    (20.70, 23.20, 49.40), # Au cœur de la tour, une étincelle.
    (24.10, 25.76, 55.60), # Et le monde redevient lumière.
]
V = np.zeros(N)
for a, b, at in LINES:
    seg = voice[int(a * SR):int(b * SR)].copy()
    f = int(0.02 * SR)
    seg[:f] *= np.linspace(0, 1, f)
    seg[-f:] *= np.linspace(1, 0, f)
    i = int(at * SR)
    V[i:i + len(seg)] += seg
V /= np.abs(V).max() / 0.95
vmask = np.convolve((np.abs(V) > 0.02).astype(float), np.ones(int(0.25 * SR)) / int(0.25 * SR), "same")
vmask = np.clip(vmask * 3, 0, 1)


def add(s, x, g=1.0, pan=0.0):
    i = int(s * SR)
    if i >= N or i + len(x) <= 0:
        return
    x = x[: N - i]
    L[i:i + len(x)] += x * g * (1 - pan) ** 0.5 if pan > 0 else x * g
    R[i:i + len(x)] += x * g * (1 + pan) ** 0.5 if pan < 0 else x * g


def lp(x, k):
    return np.convolve(x, np.ones(k) / k, mode="same")


def env(n, a, r):
    t = np.arange(n) / SR
    return np.minimum(t / a, 1) * np.exp(-t / r)


def heartbeat(s, g=1.0):
    for off, amp in ((0, 1.0), (0.22, 0.7)):
        n = int(0.5 * SR)
        t = np.arange(n) / SR
        f = 38 + 50 * np.exp(-t * 20)
        x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)
        add(s + off, x, g * amp)


def shimmer(s, d, g=0.15, base=1800):
    for k in range(int(d * 14)):
        t0 = s + rng.random() * d
        f = base * (1 + rng.random() * 2)
        n = int(0.5 * SR)
        t = np.arange(n) / SR
        x = np.sin(2 * np.pi * f * t) * env(n, 0.003, 0.12)
        add(t0, x, g * (0.4 + 0.6 * rng.random()), pan=rng.uniform(-0.8, 0.8))


def whoosh(s, d, g=0.3, rev=False):
    n = int(d * SR)
    t = np.arange(n) / SR
    x = lp(rng.standard_normal(n), 30) * np.sin(np.pi * t / d) ** 2
    add(s, x[::-1] if rev else x, g)


def click(s, g=0.35):
    n = int(0.18 * SR)
    t = np.arange(n) / SR
    x = (np.sin(2 * np.pi * 900 * t) * np.exp(-t * 60) + lp(rng.standard_normal(n), 3) * np.exp(-t * 90) * 0.6
         + np.sin(2 * np.pi * 140 * t) * np.exp(-t * 30) * 0.8)
    add(s, x, g, pan=rng.uniform(-0.5, 0.5))


def step(s, g=0.22):
    n = int(0.15 * SR)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * (90 + 60 * np.exp(-t * 40)) * t) * np.exp(-t * 35) + lp(rng.standard_normal(n), 6) * np.exp(-t * 80) * 0.3
    add(s, x, g)


def bell(s, f, g=0.12, r=1.5):
    n = int(r * 2 * SR)
    t = np.arange(n) / SR
    x = (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 2.01 * t)) * env(n, 0.005, r)
    add(s, x, g, pan=rng.uniform(-0.4, 0.4))


# ---------- music ----------
def pad(s, d, freqs, g):
    n = int(d * SR)
    t = np.arange(n) / SR
    x = np.zeros(n)
    for f in freqs:
        for det in (-0.25, 0.25):
            ff = f + det
            x += sum(np.sin(2 * np.pi * ff * k * t + k) / (k * k) for k in (1, 2, 3))
    a = np.minimum(t / 1.5, 1) * np.minimum((d - t) / 1.5, 1)
    add(s, lp(x, 8) * a * g / len(freqs))


# D minor-ish progression: Dm9, Bbmaj7, Fmaj7, C
CH = [[146.8, 174.6, 220.0, 329.6], [116.5, 146.8, 174.6, 220.0], [174.6, 220.0, 261.6, 329.6], [130.8, 196.0, 261.6, 293.7]]
BASS = [73.4, 58.3, 87.3, 65.4]
BAR = 4.0
for b in range(int(D / BAR)):
    s = b * BAR
    lvl = 0.0 if s < 5 else 0.05 if s < 18 else 0.09
    if 52 <= s < 55:
        lvl = 0.02
    if s >= 56:
        lvl = 0.12
    if lvl:
        pad(s, BAR + 1.5, CH[b % 4], lvl)
    if 18 <= s < 52 or s >= 56:
        n = int(BAR * SR)
        t = np.arange(n) / SR
        add(s, np.sin(2 * np.pi * BASS[b % 4] * t) * np.minimum(t / 0.05, 1) * np.exp(-t / 3) * 0.18)

# soft arpeggio from 18 s, pulse
ARP = [0, 7, 12, 15, 12, 7]
beat = 0.5
for k in range(int(D / (beat / 2))):
    t0 = k * beat / 2
    if not (19 <= t0 < 51.5 or 56 <= t0 < 59):
        continue
    ci = int(t0 // BAR) % 4
    f = CH[ci][0] * 2 * 2 ** (ARP[k % 6] / 12)
    n = int(0.4 * SR)
    t = np.arange(n) / SR
    x = (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)) * env(n, 0.004, 0.15)
    g = 0.035 if t0 < 32 else 0.05
    add(t0, x, g, pan=0.4 if k % 2 else -0.4)
# soft kick + hat in the walking part, building to 48
for k in range(int(D / beat)):
    t0 = k * beat
    if 25 <= t0 < 32 or 40 <= t0 < 52:
        n = int(0.3 * SR)
        t = np.arange(n) / SR
        x = np.sin(2 * np.pi * np.cumsum(45 + 80 * np.exp(-t * 30)) / SR) * np.exp(-t * 10)
        if k % 2 == 0:
            add(t0, x, 0.28)
        h = lp(np.diff(rng.standard_normal(int(0.05 * SR)), prepend=0), 1) * np.exp(-np.arange(int(0.05 * SR)) / SR * 80)
        add(t0 + 0.25, h, 0.05)

# ---------- sound design ----------
for s in (0.1, 1.1, 2.1, 3.1, 4.1):
    heartbeat(s, 0.55)
add(0.0, lp(rng.standard_normal(int(5 * SR)), 200) * np.linspace(0, 1, int(5 * SR)) * 0.25)  # room tone
whoosh(4.6, 1.0, 0.35)
shimmer(5.0, 5.0, 0.07)
whoosh(5.0, 4.5, 0.12)
for i, t0 in enumerate(np.linspace(10.6, 15.2, 18)):
    click(t0 + rng.uniform(-0.05, 0.05), 0.22)
bell(15.8, 880, 0.12)  # eyes open
bell(15.85, 1318.5, 0.07)
whoosh(17.6, 1.2, 0.25)
for k in range(int((25 - 18.5) / 0.45)):
    t0 = 18.5 + k * 0.45
    click(t0, 0.06)  # buildings rising
for t0 in np.arange(25.3, 32.5, 0.5):
    step(t0)
step(32.6, 0.18)
# chasm wind
n = int(8 * SR)
t = np.arange(n) / SR
add(32, lp(rng.standard_normal(n), 120) * np.sin(np.pi * t / 8) * 0.5)
shimmer(35.5, 3.5, 0.06, 1200)
for t0 in np.linspace(40.5, 47.0, 14):
    whoosh(t0, 0.7, 0.10)
    bell(t0 + 0.6, [587, 698, 880, 1046][int(t0 * 3) % 4], 0.05, 0.6)
shimmer(40.5, 7, 0.04, 2400)
for t0 in np.arange(48.2, 52.3, 0.5):
    step(t0, 0.2)
# brief silence ~52.3 - 53.2, then placement
bell(53.2, 440, 0.15, 2.0)
bell(53.25, 659, 0.1, 2.0)
# rising light 55 -> 58
n = int(3.5 * SR)
t = np.arange(n) / SR
f = 220 + 1600 * (t / 3.5) ** 2
add(54.8, np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.06 * (t / 3.5), 1.0)
add(54.8, lp(rng.standard_normal(n), 10) * (t / 3.5) ** 2 * 0.12)
shimmer(55.5, 3.0, 0.08, 2000)
heartbeat(58.6, 0.8)

# ---------- mix ----------
music = np.stack([L, R], 1)
music *= (1 - 0.45 * vmask)[:, None]  # duck under voice
mix = music + V[:, None] * 0.95
fade = np.ones(N)
fade[-int(1.0 * SR):] = np.linspace(1, 0, int(1.0 * SR)) ** 0.5
mix *= fade[:, None]
mix = np.tanh(mix * 1.05)
mix /= np.abs(mix).max() / 0.9
out = wave.open("public/soundtrack.wav", "wb")
out.setnchannels(2)
out.setsampwidth(2)
out.setframerate(SR)
out.writeframes((mix * 32767).astype("<i2").tobytes())
out.close()
print("ok")
