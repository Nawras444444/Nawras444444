"""Kestrel Mobile — original music bed + sound design (70 s, 44.1 kHz stereo).

90 BPM, so every scene boundary lands on a beat (6 s = 9 beats, 14 s = 21 beats, ...).
Cues follow the script: sub hit 0:00, letter ticks, hum that drops on "waiting",
synth swell resolving on the logo lock, whoosh + gauge ticks, re-route pulses,
beat drops on the card cuts, check clicks, held-note resolve and silence at the end.
The bed sits low to leave room for the voiceover. Writes music_sfx.wav.
"""
import numpy as np, wave

SR = 44100; D = 70.0; N = int(SR * D)
rng = np.random.default_rng(7)
L = np.zeros(N); R = np.zeros(N)
BEAT = 60 / 90

def add(s, x, g=1.0, pan=0.0):
    i = int(s * SR)
    if i >= N or i + len(x) <= 0: return
    if i < 0: x = x[-i:]; i = 0
    x = x[:N - i]
    L[i:i + len(x)] += x * g * np.sqrt(0.5 * (1 - pan)) * 1.414
    R[i:i + len(x)] += x * g * np.sqrt(0.5 * (1 + pan)) * 1.414

def tt(d): return np.arange(int(d * SR)) / SR
def env(d, a, r, hold=0.0):
    t = tt(d); e = np.minimum(t / max(a, 1e-4), 1)
    return e * np.where(t < a + hold, 1, np.exp(-(t - a - hold) / r))
def lp(x, k):
    k = max(1, int(k)); return np.convolve(x, np.ones(k) / k, mode='same')
def hz(n): return 440 * 2 ** ((n - 69) / 12)   # MIDI -> Hz

# ---------------- instruments ----------------
def sub_hit(d=2.2):
    t = tt(d); f = 38 + 60 * np.exp(-t * 6)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.6)
def tick(f=2400, d=0.03):
    t = tt(d); return np.sin(2 * np.pi * f * t) * np.exp(-t * 180) + lp(rng.standard_normal(len(t)), 2) * np.exp(-t * 300) * 0.4
def click(d=0.05):
    t = tt(d); return (np.sin(2 * np.pi * 1800 * t) * 0.6 + np.sin(2 * np.pi * 3100 * t) * 0.4) * np.exp(-t * 120)
def kick(g=1.0):
    t = tt(0.5); f = 42 + 120 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7) * g
def hat(d=0.07):
    t = tt(d); x = np.diff(rng.standard_normal(len(t) + 1)); return x * np.exp(-t * 80)
def rim():
    t = tt(0.08); return (np.sin(2 * np.pi * 820 * t) + 0.5 * lp(rng.standard_normal(len(t)), 3)) * np.exp(-t * 70)
def clap():
    t = tt(0.25); x = lp(rng.standard_normal(len(t)), 2)
    e = np.exp(-t * 18) + 0.6 * np.exp(-np.maximum(t - 0.012, 0) * 40) * (t > 0.012)
    return x * e
def pad(notes, d, a=0.8, r=1.2, bright=3):
    t = tt(d); y = np.zeros(len(t))
    for n in notes:
        for det in (-0.06, 0.06):
            f = hz(n + det)
            y += sum(np.sin(2 * np.pi * f * k * t + k) / k ** 1.6 for k in range(1, bright + 1))
    e = np.minimum(t / a, 1) * np.minimum((d - t) / r, 1).clip(0, 1)
    return lp(y * e / len(notes), 4)
def pluck(n, d=0.5):
    t = tt(d); f = hz(n)
    y = sum(np.sin(2 * np.pi * f * k * t) * np.exp(-t * (6 + 5 * k)) / k for k in range(1, 6))
    return y * np.minimum(t / 0.003, 1)
def bass(n, d):
    t = tt(d); f = hz(n)
    y = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t)
    return y * np.minimum(t / 0.01, 1) * np.exp(-t * 1.5) * np.minimum((d - t) / 0.05, 1).clip(0, 1)
def bell(n, d=3.0):
    t = tt(d); f = hz(n)
    return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 3) + 0.2 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 6)) * np.exp(-t * 1.1)
def whoosh(d=0.7, up=True):
    t = tt(d); x = rng.standard_normal(len(t))
    k = np.linspace(40, 6, len(t)) if up else np.linspace(6, 40, len(t))
    y = np.zeros(len(t)); step = 512
    for i in range(0, len(t), step):
        seg = x[max(0, i - 64):i + step + 64]; y[i:i + step] = lp(seg, k[i])[min(i, 64):min(i, 64) + len(y[i:i + step])]
    e = np.sin(np.pi * t / d) ** 2
    return y * e
def riser(t0, t1, f0, f1, g):
    d = t1 - t0; t = tt(d); f = f0 * (f1 / f0) ** (t / d)
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = (np.sin(ph) + 0.5 * np.sin(ph * 2.005) + 0.3 * np.sin(ph * 0.5)) * (t / d) ** 2
    y += lp(rng.standard_normal(len(t)), 10) * (t / d) ** 3 * 0.5
    add(t0, y, g)

# ================= SCENE 1 · Hook 0–6 =================
add(0.0, sub_hit(), 0.9)
add(0.0, lp(rng.standard_normal(int(0.5 * SR)), 30) * env(0.5, 0.002, 0.08), 0.25)
for i in range(4): add(1.9 + i * 0.1, tick(2600 - i * 120), 0.35, pan=-0.2 + i * 0.13)  # letter ticks
for s in (0.35, 0.95): add(s, np.sin(2 * np.pi * 220 * tt(0.2)) * env(0.2, 0.005, 0.05), 0.12)  # dot pulses
add(1.2, whoosh(0.5), 0.12)                               # dot stretches into line
add(4.55, whoosh(0.6, up=False), 0.10)                    # word shrinks
add(5.42, tick(1400, 0.05), 0.5); add(5.5, sub_hit(0.6), 0.35)  # line snaps back

# ================= SCENE 2 · Problem 6–14 =================
t = tt(2.3)  # hum 6.0 -> drops out on "waiting" (~8.3)
hum = (np.sin(2 * np.pi * 55 * t) * 0.6 + np.sin(2 * np.pi * 110.4 * t) * 0.35 + np.sin(2 * np.pi * 165 * t) * 0.12)
hum *= (0.8 + 0.2 * np.sin(2 * np.pi * 0.7 * t)) * np.minimum(t / 0.4, 1)
hum[-int(0.03 * SR):] *= np.linspace(1, 0, int(0.03 * SR))  # hard drop
add(6.0, hum + lp(rng.standard_normal(len(t)), 60) * 0.25, 0.35)
for s in np.arange(6.5, 8.3, 0.37):  # stuttering counter ticks
    add(s + (0.06 if int(s * 10) % 3 == 0 else 0), tick(1900, 0.02), 0.18, pan=0.5)
for i, s in enumerate((6.35, 6.63, 6.91)): add(s, click(), 0.12, pan=-0.3 + 0.3 * i)  # bars appear
add(8.3, tick(900, 0.06), 0.25)
t = tt(5.7); add(8.3, lp(rng.standard_normal(len(t)), 80) * 0.05 * np.minimum(t / 2, 1), 1.0)  # room tone after drop
add(13.5, whoosh(0.5, up=False), 0.18)  # bars slide out

# ================= SCENE 3 · Reveal 14–22 =================
riser(13.6, 15.75, 110, 440, 0.10)
CH = {  # D major colour: Dmaj9, Bm9, Gmaj9, Asus
    'D': [50, 57, 61, 64, 66], 'Bm': [47, 54, 57, 61, 62], 'G': [43, 50, 54, 57, 62], 'A': [45, 52, 57, 59, 64]}
BASS = {'D': 38, 'Bm': 35, 'G': 31, 'A': 33}
PROG = ['D', 'Bm', 'G', 'A']
add(14.0, pad(CH['A'], 1.9, a=1.6, r=0.3, bright=4), 0.16)   # swell
for i, s in enumerate((14.05, 14.21, 14.37)): add(s, whoosh(0.9), 0.14, pan=(-0.7, 0, 0.7)[i])  # arcs spin in
add(15.75, bell(74, 3.5), 0.16); add(15.75, sub_hit(1.4), 0.4)   # logo lock: resolve
for i in range(7): add(16.0 + i * 0.07, tick(3000, 0.02), 0.12, pan=-0.6 + i * 0.2)  # letter tiles
for i in range(6): add(16.55 + i * 0.06, tick(3600, 0.015), 0.08, pan=-0.4 + i * 0.16)

# ================= music bed 15.75 -> 62 =================
bar = 4 * BEAT
start = 15.75
k = 0; s = start
while s < 62.0:
    c = PROG[k % 4]; d = min(bar, 62.0 - s) + 0.6
    lift = 52.0 <= s
    add(s, pad(CH[c], d, a=0.5, r=0.6, bright=4 if lift else 3), 0.10 if not lift else 0.12)
    if s >= 22.0:
        for b in range(4):
            bs = s + b * BEAT
            if bs < 62: add(bs, bass(BASS[c], BEAT * 0.9), 0.20 if not lift else 0.24)
    if lift:  # music lifts: up an octave voicing
        add(s, pad([n + 12 for n in CH[c][2:]], d, a=0.3, r=0.6, bright=2), 0.05)
    k += 1; s += bar

# light percussion: from 22 soft pulse, 42-52 sparse groove, 52-62 fuller
b = 0
while True:
    bt = 22.0 + b * BEAT
    if bt >= 62.0: break
    sec = 'proof' if bt < 42 else ('cards' if bt < 52 else 'offer')
    if sec == 'proof':
        if b % 2 == 0: add(bt, kick(0.5), 0.35)
        add(bt + BEAT / 2, hat(), 0.04, pan=0.3)
    elif sec == 'cards':
        add(bt + BEAT / 2, hat(), 0.06, pan=0.3)
        if b % 4 == 2: add(bt, rim(), 0.10, pan=-0.2)
    else:
        add(bt, kick(0.7), 0.4)
        add(bt + BEAT / 2, hat(), 0.07, pan=0.3); add(bt + BEAT * 0.75, hat(0.04), 0.04, pan=-0.3)
        if b % 2 == 1: add(bt, clap(), 0.10)
    b += 1
# arpeggio sparkle over 32-42 and 52-62
for a0, a1, g in ((32.0, 42.0, 0.05), (52.0, 61.5, 0.07)):
    i = 0; s = a0
    while s < a1:
        c = PROG[int((s - start) // bar) % 4]; n = CH[c][[2, 3, 4, 3][i % 4]] + 12
        add(s, pluck(n, 0.45), g, pan=(-0.35, 0.35)[i % 2]); i += 1; s += BEAT / 2

# ================= SCENE 4 · Speed 22–32 =================
add(21.8, whoosh(0.8), 0.32)                       # phone rise
for i in range(26):                                 # gauge ticks, accelerating
    s = 24.0 + 2.5 * (i / 26) ** 0.7
    add(s, tick(2200 + i * 40, 0.02), 0.10 + 0.004 * i, pan=0.15)
add(26.6, bell(81, 1.6), 0.08); add(26.6, click(), 0.15)
add(31.5, whoosh(0.5, up=False), 0.15)

# ================= SCENE 5 · Adapts 32–42 =================
for i in range(10): add(32.0 + i * 0.07, tick(1500 + i * 90, 0.015), 0.06, pan=-0.5 + i * 0.1)  # dots pop
add(32.4, sub_hit(0.8), 0.25)
for f in (34.6, 36.6, 38.6):                        # node fails: small down-blip
    t = tt(0.25); fr = 600 * np.exp(-t * 6)
    add(f, np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 10), 0.10)
for h in (35.75, 37.75, 39.75):                     # soft pulse on each re-route
    add(h, bell(69, 1.5), 0.10); add(h, kick(0.4), 0.25)
add(41.5, whoosh(0.5, up=False), 0.15)

# ================= SCENE 6 · Use cases 42–52 =================
for c in (42.0, 42 + 10 / 3, 42 + 20 / 3):          # beat drops on each cut
    add(c, kick(1.0), 0.75); add(c, sub_hit(1.2), 0.45); add(c, clap(), 0.18)
    add(c - 0.25, whoosh(0.3), 0.15)

# ================= SCENE 7 · Offer 52–62 =================
for i in range(11): add(52.6 + i * 0.1, tick(2500, 0.015), 0.08, pan=0.1)  # price counter
add(53.7, bell(78, 1.2), 0.07)
for i, s in enumerate((53.85, 54.05, 54.25)): add(s, click(), 0.30, pan=-0.2 + 0.2 * i)  # check items
add(61.55, whoosh(0.5, up=False), 0.14)

# ================= SCENE 8 · End card 62–70 =================
for i, s in enumerate((62.0, 62.16, 62.32)): add(s, whoosh(0.9), 0.12, pan=(0.7, 0, -0.7)[i])  # reverse spin
t = tt(5.85)  # resolves to a single held note (D), gone before the final beat
held = (np.sin(2 * np.pi * hz(62) * t) + 0.25 * np.sin(2 * np.pi * hz(74) * t) + 0.1 * np.sin(2 * np.pi * hz(50) * t))
held *= np.minimum(t / 0.6, 1) * np.clip((5.85 - t) / 2.2, 0, 1) ** 1.5
add(63.4, held, 0.16)
add(63.4, pad(CH['D'], 3.0, a=0.05, r=2.5), 0.10); add(63.4, sub_hit(1.6), 0.4)
add(66.35, tick(1200, 0.04), 0.3); add(66.35, sub_hit(0.5), 0.2)   # dot lands

# ---------------- master ----------------
y = np.stack([L, R], 1)
y[int(69.3 * SR):] = 0                                  # silence on the final beat
fade = np.ones(N); fade[:int(0.005 * SR)] = np.linspace(0, 1, int(0.005 * SR))
y *= fade[:, None]
y = np.tanh(y * 1.2) / np.tanh(1.2)
y /= np.abs(y).max() / 0.85
w = wave.open('music_sfx.wav', 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
w.writeframes((y * 32767).astype('<i2').tobytes()); w.close()
print('wrote music_sfx.wav', y.shape)
