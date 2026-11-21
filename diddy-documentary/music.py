"""Original procedural score + sound design for the documentary (no samples, no copyrighted music).
Writes assets/audio/score.wav (48 kHz stereo, 98 s). Hit times match the cuts in index.html."""
import numpy as np, wave

SR, DUR = 48000, 98.0
N = int(SR * DUR)
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(7)
t_all = np.arange(N) / SR

def add(sig, t0, gain=1.0, pan=0.0):
    i = int(t0 * SR); j = min(N, i + len(sig))
    if j <= i: return
    s = sig[: j - i] * gain
    L[i:j] += s * np.sqrt((1 - pan) / 2) * 1.414 / 1.414
    R[i:j] += s * np.sqrt((1 + pan) / 2)

def env_adsr(n, a=.005, d=.0, rel=None, decay=3.0):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-t * decay)
    return e

def lp(x, cutoff):  # one-pole low-pass
    a = np.exp(-2 * np.pi * cutoff / SR); y = np.empty_like(x); acc = 0.0
    for i in range(len(x)): acc = (1 - a) * x[i] + a * acc; y[i] = acc
    return y

def lp_fast(x, cutoff, passes=2):
    # cheap FFT low-pass for long buffers
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / (1 + (f / cutoff) ** (2 * passes)); return np.fft.irfft(X, len(x))

def hp_fast(x, cutoff):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 - 1 / (1 + (f / cutoff) ** 4); return np.fft.irfft(X, len(x))

def bp_fast(x, lo, hi): return hp_fast(lp_fast(x, hi), lo)

mtof = lambda m: 440 * 2 ** ((m - 69) / 12)

# ---------------- PIANO ----------------
def piano(m, dur=3.5, vel=1.0):
    n = int(dur * SR); t = np.arange(n) / SR; f = mtof(m)
    s = sum((1 / k ** 1.4) * np.sin(2 * np.pi * f * k * t * (1 + 0.0004 * k * k)) * np.exp(-t * (1.2 + k * .9)) for k in range(1, 8))
    s += 0.3 * np.sin(2 * np.pi * f * t) * np.exp(-t * .5)
    s *= np.minimum(1, t / .004) * vel
    return s

# D minor world, darker (Bb/Eb tension) in the second half
prog_warm = [(50, [62, 65, 69, 74]), (46, [62, 65, 70, 74]), (53, [60, 65, 69, 72]), (48, [60, 64, 67, 72])]   # Dm Bb F C
prog_dark = [(50, [62, 65, 68, 74]), (51, [63, 67, 70, 75]), (50, [62, 65, 68, 74]), (49, [61, 64, 68, 73])]   # Dm(b5-ish) Eb Dm Db-ish
bar = 60 / 84 * 4  # 84 BPM, 4/4
def play_section(t0, t1, prog, density=4, vel=.5, octave=0):
    t = t0; k = 0
    while t < t1 - .5:
        root, chord = prog[k % len(prog)]
        add(piano(root - 12 + octave, 5, vel * 1.1), t, .55)
        for i in range(density):
            m = chord[(i * 2 + k) % len(chord)] + octave
            add(piano(m, 3, vel * (0.75 + 0.25 * rng.random())), t + i * bar / density, .35, pan=(i / density - .5) * .6)
        t += bar; k += 1

play_section(0.3, 11.3, prog_warm, density=2, vel=.45)
play_section(11.3, 24.4, prog_warm, density=4, vel=.42)
play_section(28.9, 52.0, prog_warm, density=4, vel=.38, octave=12)
play_section(52.6, 74.6, prog_dark, density=2, vel=.42)
play_section(74.6, 86.8, prog_dark, density=4, vel=.4)
# final single notes after the shatter
for m, tt in [(62, 88.1), (65, 88.7), (68, 89.4), (50, 89.4), (38, 89.4)]:
    add(piano(m, 6, .6), tt, .6)

# ---------------- DRONES ----------------
def drone(f, t0, t1, gain, bright=600, wob=.15):
    n = int((t1 - t0) * SR); t = np.arange(n) / SR
    s = sum(np.sin(2 * np.pi * f * h * t + np.sin(2 * np.pi * wob * t * h) * .5) / h for h in (1, 2, 3, 4, 5))
    s = lp_fast(s, bright)
    fade = np.minimum(1, np.minimum(t / 2.0, (t[-1] - t) / 1.5 + 1e-9))
    add(s * fade, t0, gain)
drone(mtof(38), 0, 52.6, .16, 500)
drone(mtof(45), 11, 52.6, .07, 700)
drone(mtof(37), 52.2, 87.0, .18, 380, .3)   # darker, semitone lower
drone(mtof(44), 57.0, 87.0, .07, 500, .4)   # tritone tension

# ---------------- DRUMS (19.5–52.1, restrained boom-bap) ----------------
def kick(gain=1.0):
    n = int(.45 * SR); t = np.arange(n) / SR
    f = 45 + 110 * np.exp(-t * 35); ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 7) * gain
def snare():
    n = int(.3 * SR); t = np.arange(n) / SR
    nz = bp_fast(rng.standard_normal(n), 1200, 7000) * np.exp(-t * 18)
    return nz * .8 + np.sin(2 * np.pi * 190 * t) * np.exp(-t * 25) * .5
def hat(open_=False):
    n = int((.25 if open_ else .06) * SR); t = np.arange(n) / SR
    return hp_fast(rng.standard_normal(n), 7000) * np.exp(-t * (12 if open_ else 70))
K, S, Hc, Ho = kick(), snare(), hat(), hat(True)
beat = 60 / 84
t = 19.5; step = 0
while t < 52.0:
    pos = step % 16
    g = .55 if t < 24.4 else .8
    if 24.4 <= t < 28.85: g = 0       # drop-out for the 1993 moment
    if pos in (0, 7, 10): add(K, t, .9 * g)
    if pos in (4, 12): add(S, t, .32 * g)
    if pos % 2 == 0: add(Hc, t, .09 * g, pan=.3)
    if pos == 14: add(Ho, t, .07 * g, pan=.3)
    t += beat / 4; step += 1

# ---------------- HITS & FX ----------------
def boom(dur=3.0, f0=55):
    n = int(dur * SR); t = np.arange(n) / SR
    f = f0 * (1 + 1.5 * np.exp(-t * 12)); ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t * 1.6)
    s += lp_fast(rng.standard_normal(n), 900) * np.exp(-t * 6) * .6
    return s
def riser(dur=2.5):
    n = int(dur * SR); t = np.arange(n) / SR
    nz = rng.standard_normal(n); out = np.zeros(n); seg = n // 40
    for i in range(40):
        c = 300 + 6000 * (i / 40) ** 2; out[i * seg:(i + 1) * seg] = bp_fast(nz[i * seg:(i + 1) * seg + 0], c * .7, c * 1.3)[:seg] if (i + 1) * seg <= n else 0
    return out * (t / dur) ** 2
def shutter():
    n = int(.12 * SR); t = np.arange(n) / SR
    s = hp_fast(rng.standard_normal(n), 2500) * (np.exp(-t * 90) + .6 * np.exp(-np.maximum(0, t - .05) * 120) * (t > .05))
    return s
def glitch(dur=.35):
    n = int(dur * SR); s = np.zeros(n)
    for i in range(0, n, 900):
        if rng.random() > .4: s[i:i + 900] = np.sign(np.sin(np.arange(min(900, n - i)) * rng.uniform(.05, .6))) * rng.uniform(.2, .8)
    return hp_fast(s, 300)
def gavel():
    n = int(.6 * SR); t = np.arange(n) / SR
    s = (np.sin(2 * np.pi * 180 * t) + .6 * np.sin(2 * np.pi * 410 * t) + .3 * np.sin(2 * np.pi * 920 * t)) * np.exp(-t * 28)
    s += bp_fast(rng.standard_normal(n), 400, 3000) * np.exp(-t * 60) * .8
    return s
def heartbeat():
    return np.concatenate([kick(.9), np.zeros(int(.02 * SR))])[: int(.3 * SR)]
def shatter():
    n = int(2.2 * SR); t = np.arange(n) / SR; s = np.zeros(n)
    for k in range(140):
        i = int(rng.uniform(0, 1.4) ** 2 * SR * .9); m = int(.04 * SR)
        if i + m < n:
            tt = np.arange(m) / SR; s[i:i + m] += np.sin(2 * np.pi * rng.uniform(2500, 9000) * tt) * np.exp(-tt * 120) * rng.uniform(.2, 1)
    s += hp_fast(rng.standard_normal(n), 3000) * np.exp(-t * 5) * .5
    return s

for tt, g in [(0.0, .9), (11.2, .4), (25.1, 1.0), (28.85, .7), (52.1, .9), (57.0, .6), (62.8, .6), (74.5, .6), (81.4, .7), (86.9, 1.0), (88.1, .5), (89.4, .9)]:
    add(boom(), tt, g)
add(riser(2.4), 22.7, .25); add(riser(1.6), 50.5, .25); add(riser(3.0), 83.9, .3)
for tt in [35.75, 36.4, 37.1, 37.55, 38.2, 38.7, 39.4]: add(shutter(), tt, .35, pan=rng.uniform(-.6, .6))
for tt in [52.1, 52.6, 57.0, 61.9]: add(glitch(), tt, .18)
for tt in [66.14, 71.94]: add(gavel(), tt, .7)
for k, tt in enumerate(np.arange(53.0, 62.6, 60 / 66)):   # heartbeat under "the shadow"
    add(heartbeat(), tt, .5); add(heartbeat() * .6, tt + .22, .5)
add(shatter(), 86.9, .7)
# vinyl crackle in the studio scene
n = int(9.4 * SR); cr = np.zeros(n); idx = rng.integers(0, n, 2600); cr[idx] = rng.uniform(-1, 1, len(idx))
add(hp_fast(cr, 1500) * .9, 19.4, .25)
# city ambience in Harlem
n = int(8.8 * SR); amb = lp_fast(rng.standard_normal(n), 500) * .5
amb *= np.minimum(1, np.minimum(np.arange(n) / SR / 1.5, (n - np.arange(n)) / SR / 1.5))
add(amb, 11.0, .3)

# ---------------- MASTER ----------------
mix = np.stack([L, R], 1)
fade_out = np.ones(N); fo = int(4.0 * SR); fade_out[-fo:] = np.linspace(1, 0, fo) ** 2
mix *= fade_out[:, None]
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
mix /= np.max(np.abs(mix)) + 1e-9; mix *= .89
with wave.open('assets/audio/score.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
print('score written', mix.shape[0] / SR, 's')
