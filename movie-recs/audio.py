"""Music bed + sound effects, ducked under the voiceover, mixed to mix.wav (57.5 s, 44.1 kHz stereo)."""
import subprocess, wave
import numpy as np
from scipy.signal import fftconvolve

sr = 44100; D = 57.5; N = int(sr * D)
rng = np.random.default_rng(7)
L = np.zeros(N); R = np.zeros(N)

def add(s, x, g=1.0, pan=0.0):
    i = int(s * sr)
    if i >= N: return
    x = x[: N - i] * g
    L[i:i + len(x)] += x * (1 - max(pan, 0)); R[i:i + len(x)] += x * (1 + min(pan, 0))

def t_(d): return np.arange(int(d * sr)) / sr
def lp(x, k): return np.convolve(x, np.ones(k) / k, mode="same")
def adsr(n, a, r):
    t = np.arange(n) / sr; return np.minimum(t / a, 1) * np.minimum((n / sr - t) / r, 1).clip(0)

def pad(f, d):
    t = t_(d); w = sum(np.sin(2 * np.pi * f * k * t * (1 + 0.0015 * j)) / k for k in (1, 2, 3, 5) for j in (-1, 1))
    return lp(w, 9) * adsr(len(t), 1.2, 1.5)
def pluck(f, d=1.2):
    t = t_(d); return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(4 * np.pi * f * t)) * np.exp(-t * 4.5)
def thud():
    t = t_(0.35); f = 60 + 90 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / sr) * np.exp(-t * 12)
def impact(g=1):
    t = t_(2.2); f = 38 + 60 * np.exp(-t * 3)
    return (np.sin(2 * np.pi * np.cumsum(f) / sr) * np.exp(-t * 2.4) + lp(rng.standard_normal(len(t)), 20) * np.exp(-t * 7) * 0.5) * g
def whoosh(d=0.55):
    t = t_(d); x = lp(rng.standard_normal(len(t)), 28) - lp(rng.standard_normal(len(t)), 120)
    return x * np.sin(np.pi * t / d) ** 2
def riser(d):
    t = t_(d); f = 180 + 900 * (t / d) ** 2
    return (np.sin(2 * np.pi * np.cumsum(f) / sr) * 0.5 + lp(rng.standard_normal(len(t)), 10) * 0.4) * (t / d) ** 2
def chime(f):
    t = t_(1.5); return sum(np.sin(2 * np.pi * f * m * t) * np.exp(-t * (3 + m)) / m for m in (1, 2.76, 5.4))
def kick():
    t = t_(0.3); f = 45 + 120 * np.exp(-t * 35)
    return np.sin(2 * np.pi * np.cumsum(f) / sr) * np.exp(-t * 10)

# Pads: Dm Bb F C, 4.4 s each.
chords = [[146.8, 174.6, 220.0], [116.5, 146.8, 174.6], [174.6, 220.0, 261.6], [130.8, 164.8, 196.0]]
bass = [73.4, 58.3, 87.3, 65.4]
step = 4.4
for i in range(int(D / step) + 1):
    s = i * step
    for k, f in enumerate(chords[i % 4]): add(s, pad(f, step + 1.4), 0.045, pan=(k - 1) * 0.4)
    add(s, pad(bass[i % 4], step + 1.2), 0.07)
    for j, f in enumerate([chords[i % 4][0] * 2, chords[i % 4][2] * 2, chords[i % 4][1] * 4]):
        if s + j * 1.1 > 1.5: add(s + j * 1.1 + 0.55, pluck(f), 0.05, pan=0.5 - j * 0.5)

# Effects on the picture cues.
add(0.0, impact(), 0.35); add(0.05, whoosh(1.2), 0.25)
for b in (8.45, 18.8, 27.45, 32.4, 36.65, 41.0, 46.65, 50.65): add(b, whoosh(), 0.35, pan=0.3)
for i in range(5): add(11.0 + i * 0.3 + 0.42, thud(), 0.45, pan=(i - 2) * 0.3)
add(12.6, riser(1.4), 0.18); add(14.0, impact(), 0.55); add(14.05, chime(880), 0.06)
for i, f in enumerate([523.3, 587.3, 698.5, 784.0, 880.0]): add(19.8 + i * 0.8, chime(f), 0.07, pan=(i - 2) * 0.25)
for k in range(int(4.0 / 0.36)): add(46.95 + k * 0.36, kick(), 0.32)
add(50.95, impact(), 0.45)
for i in range(5): add(51.9 + i * 0.13, chime(1046.5 * 2 ** (i * 2 / 12)), 0.05)
add(56.2, impact(), 0.3)

music = np.stack([L, R], 1)
ir = rng.standard_normal(int(1.8 * sr)) * np.exp(-np.arange(int(1.8 * sr)) / sr * 3.2)
ir /= np.abs(ir).sum() ** 0.5 * 4
wet = np.stack([fftconvolve(music[:, c], ir)[:N] for c in range(2)], 1)
music = music + wet * 0.35

# Voice: resample to 44.1k, then duck the bed under it.
raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", "assets/voice.wav", "-ar", str(sr), "-ac", "1", "-f", "f32le", "-"],
                     capture_output=True, check=True).stdout
vo = np.zeros(N); v = np.frombuffer(raw, dtype=np.float32); vo[: min(N, len(v))] = v[:N]
env = np.sqrt(np.convolve(vo ** 2, np.ones(4410) / 4410, mode="same"))
env = np.convolve(np.clip(env / (np.percentile(env, 90) + 1e-9), 0, 1), np.ones(8820) / 8820, mode="same")
music *= (1 - 0.55 * env)[:, None]
fade = np.ones(N); fade[-int(1.2 * sr):] = np.linspace(1, 0, int(1.2 * sr)); music *= fade[:, None]
music /= np.abs(music).max() / 0.32

mix = music + (vo * 0.92)[:, None]
mix = np.tanh(mix * 1.05); mix /= max(1.0, np.abs(mix).max() / 0.95)
w = wave.open("mix.wav", "wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr)
w.writeframes((mix * 32767).astype("<i2").tobytes()); w.close()
print("mix.wav", D, "s")
