"""Music bed + motion-graphics SFX, synced to render.py timing. Mixes voiceover.wav if present -> mix.m4a"""
import os, sys, subprocess, wave
import numpy as np
BASE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE)
from render import starts, S, VOICE

SR = 48000
st = starts(); total = st[-1]
N = int(total * SR) + SR
rng = np.random.default_rng(3)
mix = np.zeros(N)
t_all = np.arange(N) / SR

def add(sig, t, g):
    i = int(t * SR)
    if 0 <= i < N:
        j = min(N, i + len(sig)); mix[i:j] += sig[:j - i] * g

def norm(x): return x / (np.abs(x).max() + 1e-9)

def whoosh(d=0.5):
    n = int(d * SR); x = rng.standard_normal(n)
    X = np.fft.rfft(x); f = np.fft.rfftfreq(n, 1 / SR)
    X *= np.exp(-((np.log(f + 1) - np.log(1800)) ** 2) / 1.2)
    y = np.fft.irfft(X, n)
    return norm(y * np.sin(np.pi * np.linspace(0, 1, n)) ** 3)

def impact(d=1.0):
    n = int(d * SR); t = np.arange(n) / SR
    f = 75 * np.exp(-t * 4) + 36
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 4.5)
    return norm(body + rng.standard_normal(n) * np.exp(-t * 50) * 0.6)

def pop(f0=900, d=0.09):
    n = int(d * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * (f0 + 1200 * np.exp(-t * 60)) * t) * np.exp(-t * 45)

def zap(d=0.3):
    n = int(d * SR); t = np.arange(n) / SR
    sq = np.sign(np.sin(2 * np.pi * (300 + 2500 * (np.sin(t * 90) > 0)) * t))
    return norm(sq * (rng.random(n) > 0.3) * np.exp(-t * 9))

def tick(): n = int(0.02 * SR); return rng.standard_normal(n) * np.exp(-np.arange(n) / SR * 300)

def riser(d=1.4):
    n = int(d * SR); t = np.arange(n) / SR
    s = np.sin(2 * np.pi * np.cumsum(200 + 900 * (t / d) ** 2) / SR) * (t / d) ** 2
    return norm(s + rng.standard_normal(n) * (t / d) ** 3 * 0.4)

# --- music bed: 96 bpm, minor, kick + hat + bass + pad
bpm = 96; beat = 60 / bpm
kick_n = int(0.35 * SR); kt = np.arange(kick_n) / SR
kick = np.sin(2 * np.pi * np.cumsum(50 + 110 * np.exp(-kt * 30)) / SR) * np.exp(-kt * 9)
hat = rng.standard_normal(int(0.05 * SR)); hat = np.diff(hat, prepend=0) * np.exp(-np.arange(len(hat)) / SR * 90)
roots = [55.0, 55.0, 43.65, 49.0]   # A A F G
music = np.zeros(N)
def madd(sig, t, g):
    i = int(t * SR)
    if i < N: j = min(N, i + len(sig)); music[i:j] += sig[:j - i] * g
b = 0; t = 0.0
while t < total:
    bar = int(b // 4)
    madd(kick, t, 0.9 if b % 2 == 0 else 0.5)
    madd(hat, t + beat / 2, 0.25)
    r = roots[bar % 4]; n = int(beat * SR); bt = np.arange(n) / SR
    bass = (np.sin(2 * np.pi * r * bt) + 0.3 * np.sin(4 * np.pi * r * bt)) * np.exp(-bt * 3)
    madd(bass, t, 0.5)
    b += 1; t += beat
pad = np.zeros(N)
for k, r in enumerate(roots):
    pass
seg = int(4 * beat * SR)
for s0 in range(0, N, seg):
    r = roots[(s0 // seg) % 4] * 4
    n = min(seg, N - s0); tt = np.arange(n) / SR
    chord = sum(np.sin(2 * np.pi * r * m * tt + m) for m in (1, 1.189, 1.498)) / 3
    pad[s0:s0 + n] = chord * np.minimum(1, np.minimum(tt / 0.4, (n / SR - tt) / 0.4))
music += pad * 0.18
fade = np.clip(t_all / 1.5, 0, 1) * np.clip((total - t_all) / 1.5, 0, 1)
music = norm(music) * fade

# --- SFX at the renderer's events
LEAD = 0.25
add(impact(), 0.05, 0.6)
for k in range(15): add(pop(700 + 40 * k), 0.15 + k * 0.06 + 0.2, 0.18)      # intro face pops
for i in range(1, len(S)):
    b0 = st[i]
    add(whoosh(), b0 - 0.3, 0.45)
    if (i - 1) % 6 == 5: add(zap(), b0 - 0.15, 0.25)
    s = S[i]
    if s["kind"] == "story":
        D = st[i + 1] - b0
        o = b0 - LEAD
        add(pop(600), o + 0.6, 0.25); add(pop(1000), o + 0.85, 0.2)
        for k in range(10): add(tick(), o + 1.4 + k * 0.07, 0.12)       # amount counter
        add(impact(), o + 0.55 * D, 0.65); add(zap(), o + 0.55 * D, 0.22)
add(riser(), st[-2] - 1.4, 0.3)

sfx = mix
voice = None
if os.path.exists(VOICE):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", VOICE, "-ac", "1", "-ar", str(SR), BASE + "/vo.wav"], check=True)
    with wave.open(BASE + "/vo.wav") as w: voice = np.frombuffer(w.readframes(w.getnframes()), np.int16) / 32768
    voice = np.pad(voice, (0, max(0, N - len(voice))))[:N]
music_gain = 0.16 if voice is not None else 0.32
out = music * music_gain + sfx * 0.55 + (voice * 1.6 if voice is not None else 0)
out = np.clip(out[: int(total * SR)], -1, 1)
pcm = (np.stack([out, out], 1) * 32767 * 0.92).astype(np.int16)
with wave.open(BASE + "/mix.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", BASE + "/mix.wav", "-af", "alimiter=limit=0.95",
                "-c:a", "aac", "-b:a", "192k", BASE + "/mix.m4a"], check=True)
print("audio ok", round(total, 2), "voice" if voice is not None else "no voice")
