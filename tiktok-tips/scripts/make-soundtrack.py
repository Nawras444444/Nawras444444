"""Synthesize public/soundtrack.wav: a 120 BPM beat + paper/sticker SFX, timed to src/script.ts.

The music ducks while each scene's voiceover plays. Run from the project root:
    python3 scripts/make-soundtrack.py
"""
import re
import wave

import numpy as np

SR = 44100
FPS = 30
src = open('src/script.ts').read()
TOTAL = int(re.search(r'TOTAL_FRAMES = (\d+)', src).group(1)) / FPS
VO_DELAY = int(re.search(r'VO_DELAY = (\d+)', src).group(1))
SCENES = [
    dict(id=m[0], start=int(m[1]) / FPS, dur=int(m[2]) / FPS, vo=int(m[3]) / FPS,
         label="label:" in m[4], visual=m[5])
    for m in re.findall(r"id: '(\w+)', from: (\d+), dur: (\d+), voFrames: (\d+),(.*?)visual: '(\w+)'", src, re.S)
]

N = int(TOTAL * SR)
rng = np.random.default_rng(7)
music = np.zeros((N, 2))
sfx = np.zeros((N, 2))


def t_(n):
    return np.arange(n) / SR


def place(buf, at, x, gain=1.0, pan=0.0):
    i = int(at * SR)
    if i >= N or i < 0:
        return
    x = x[: N - i] * gain
    buf[i:i + len(x), 0] += x * (1 - pan) ** 0.5
    buf[i:i + len(x), 1] += x * (1 + pan) ** 0.5


def lowpass(x, k):
    return np.convolve(x, np.ones(k) / k, mode='same')


def highpass(x, k):
    return x - lowpass(x, k)


# ---------- instruments ----------
def kick():
    t = t_(int(0.32 * SR)); f = 48 + 120 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)


def snare():
    t = t_(int(0.22 * SR))
    return highpass(rng.standard_normal(len(t)), 6) * np.exp(-t * 20) * 0.6 + np.sin(2 * np.pi * 200 * t) * np.exp(-t * 28) * 0.5


def hat(open_=False):
    t = t_(int((0.18 if open_ else 0.05) * SR))
    return highpass(rng.standard_normal(len(t)), 3) * np.exp(-t * (18 if open_ else 80)) * 0.35


def pluck(f, d=0.35):
    t = t_(int(d * SR))
    w = sum(np.sign(np.sin(2 * np.pi * f * k * t)) / k ** 1.5 for k in (1, 2))
    return lowpass(w, 4) * np.exp(-t * 9) * np.minimum(t / 0.004, 1)


def bass(f, d):
    t = t_(int(d * SR))
    return (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t)) * np.minimum(t / 0.01, 1) * np.exp(-t * 2.5)


# ---------- SFX ----------
def tape_rip(d=0.22):
    t = t_(int(d * SR)); n = rng.standard_normal(len(t))
    crackle = (rng.random(len(t)) < 0.03) * rng.standard_normal(len(t)) * 3
    return highpass(n * 0.5 + crackle, 4) * np.sin(np.pi * t / d) ** 0.5 * np.exp(-t * 4)


def slap():
    t = t_(int(0.25 * SR)); f = 90 * np.exp(-t * 18) + 50
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 16) + lowpass(rng.standard_normal(len(t)), 3) * np.exp(-t * 45) * 0.8


def pop():
    t = t_(int(0.12 * SR)); f = 500 + 900 * np.exp(-t * 40)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 30)


def rustle(d=0.45):
    t = t_(int(d * SR)); n = highpass(rng.standard_normal(len(t)), 8)
    grains = lowpass((rng.random(len(t)) < 0.01).astype(float), 200) * 40
    return n * np.minimum(grains, 1) * np.sin(np.pi * t / d) * 0.6


def whoosh(d=0.35, up=False):
    t = t_(int(d * SR)); n = rng.standard_normal(len(t))
    shape = (t / d) ** 2 if up else np.sin(np.pi * t / d) ** 2
    return (lowpass(n, 30) * 3 + highpass(n, 4) * 0.25) * shape


def tick():
    t = t_(int(0.03 * SR))
    return np.sin(2 * np.pi * 1800 * t) * np.exp(-t * 150)


def fail():  # descending "bwomp" when the counter drops to 0
    t = t_(int(0.7 * SR)); f = 260 * np.exp(-t * 2.2)
    w = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR))
    return lowpass(w, 10) * np.exp(-t * 3) * 0.5


def ding():
    t = t_(int(1.2 * SR))
    return sum(np.sin(2 * np.pi * f * t) * a for f, a in ((1318.5, 1), (2637, 0.3), (1975.5, 0.4))) * np.exp(-t * 4) * 0.5


# ---------- music bed: 120 BPM, A minor pop (Am F C G) ----------
BEAT = 0.5
chords = [(220.0, 261.6, 329.6), (174.6, 220.0, 261.6), (261.6, 329.6, 392.0), (196.0, 246.9, 293.7)]
roots = [55.0, 43.65, 65.4, 49.0]
MUSIC_IN = 1.5  # beat drops after the counter crash
bar = 0
at = MUSIC_IN
while at < TOTAL:
    c = bar % 4
    for b in range(4):
        s = at + b * BEAT
        place(music, s, kick(), 0.9) if b in (0, 2) else place(music, s, snare(), 0.55)
        for h in (0, 0.5):
            place(music, s + h * BEAT, hat(open_=(b == 3 and h)), 0.5, pan=0.3)
        place(music, s, bass(roots[c], BEAT * 0.9), 0.45)
        place(music, s + BEAT / 2, bass(roots[c] * (2 if b % 2 else 1), BEAT * 0.45), 0.3)
    for k, step in enumerate((0, 0.75, 1.5, 2.5, 3, 3.5)):
        place(music, at + step * BEAT, pluck(chords[c][k % 3] * 2), 0.16, pan=-0.4 + 0.16 * k)
    at += 4 * BEAT
    bar += 1

# duck music under each voiceover
gain = np.ones(N)
for sc in SCENES:
    a, b = sc['start'] + VO_DELAY / FPS, sc['start'] + VO_DELAY / FPS + sc['vo']
    gain[int(a * SR):int(b * SR)] = 0.35
gain = lowpass(gain, int(0.15 * SR))
music *= gain[:, None]
# fade out the last second
music[-SR:] *= np.linspace(1, 0, SR)[:, None]

# ---------- SFX timed to the animation (frames from TikTokTips.tsx) ----------
f = lambda sc, fr: sc['start'] + fr / FPS
for i, sc in enumerate(SCENES):
    side = 1 if i % 2 else -1
    if sc['label']:
        place(sfx, f(sc, 3), tape_rip(), 0.35, pan=0.5 * side)
    place(sfx, f(sc, 6), slap(), 0.7)
    if sc['id'].startswith('tip'):
        place(sfx, f(sc, 15), pop(), 0.35, pan=0.4 * side)
    place(sfx, f(sc, 10), rustle(), 0.4)
    if i < len(SCENES) - 1:
        place(sfx, f(sc, sc['dur'] * FPS - 9), whoosh(), 0.25)
    if sc['visual'] == 'counter':
        for fr in range(0, 42, 2):
            place(sfx, f(sc, fr), tick(), 0.18)
        place(sfx, f(sc, 45), fail(), 0.4)
    if sc['visual'] == 'swipe':
        place(sfx, f(sc, 40), whoosh(0.45), 0.4, pan=-0.6)
    if sc['visual'] == 'button':
        place(sfx, f(sc, 24), pop(), 0.4)
        place(sfx, f(sc, 30), ding(), 0.35)

mix = music * 0.55 + sfx * 0.8
mix /= max(1.0, np.abs(mix).max() / 0.89)
pcm = (mix * 32767).astype('<i2')
with wave.open('public/soundtrack.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print(f'public/soundtrack.wav  {TOTAL:.1f}s, {len(SCENES)} scenes')
