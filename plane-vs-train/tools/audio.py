"""Synthesize music + sound effects for the film (no third-party audio). Writes public/audio/score.wav."""
import numpy as np, wave
sr = 44100; D = 56.0; N = int(sr * D); rng = np.random.default_rng(7)
L = np.zeros(N); R = np.zeros(N)
def add(s, x, g=1.0, pan=0.0):
    i = int(s * sr)
    if i >= N or i < 0: return
    x = x[:N - i] * g
    L[i:i+len(x)] += x * (1 - max(pan, 0)); R[i:i+len(x)] += x * (1 + min(pan, 0))
def T(d): return np.arange(int(d * sr)) / sr
def lp(x, k): return np.convolve(x, np.ones(k) / k, mode='same')
def noise(d): return rng.standard_normal(int(d * sr))
# ---------- SFX ----------
def whoosh(d=.5, up=True):
    t = T(d); x = noise(d); y = lp(x, 30) - lp(x, 200)
    e = np.sin(np.pi * t / d) ** 2
    return y * e * 2.2
def pop():
    t = T(.12); f = 900 * np.exp(-t * 30) + 250
    return np.sin(2*np.pi*np.cumsum(f)/sr) * np.exp(-t * 35)
def ding(f=1318):
    t = T(1.2); return (np.sin(2*np.pi*f*t) + .4*np.sin(2*np.pi*f*2.01*t)) * np.exp(-t * 4) * .6
def chime():
    return np.concatenate([ding(784)[:int(.45*sr)], ding(622)])
def tick():
    t = T(.04); return noise(.04) * np.exp(-t * 160) * .8 + np.sin(2*np.pi*2500*t) * np.exp(-t*120) * .5
def boom(g=1):
    t = T(2.2); f = 70 * np.exp(-t * 1.5) + 32
    return (np.sin(2*np.pi*np.cumsum(f)/sr) * np.exp(-t * 2) + lp(noise(2.2), 14) * np.exp(-t * 7) * .6) * g
def dom():
    t = T(1.2); f = 110 * np.exp(-t * 6) + 45
    return np.sin(2*np.pi*np.cumsum(f)/sr) * np.exp(-t * 4) * 1.1 + lp(noise(1.2), 6) * np.exp(-t * 25) * .5
def beep():
    t = T(.18); return np.sign(np.sin(2*np.pi*1900*t)) * .25 * (t < .16)
def coin():
    return ding(2093) * .7 + np.concatenate([np.zeros(int(.07*sr)), ding(2637) * .5])[:int(1.2*sr)]
def engine(d=2.0):
    t = T(d); x = lp(noise(d), 8) - lp(noise(d), 80) * .5
    hum = sum(np.sin(2*np.pi*f*t*(1+t*.15)) for f in (95, 190, 285)) * .15
    e = np.minimum(t / (d * .6), 1) * np.minimum((d - t) / .4, 1)
    return (x * 1.4 + hum) * e
def trainpass(d=2.2):
    t = T(d); x = lp(noise(d), 20)
    clack = np.zeros_like(t)
    for c in np.arange(0, d, .23): clack += np.exp(-np.maximum(t - c, 0) * 60) * (t >= c) * np.sin(2*np.pi*120*t)
    e = np.sin(np.pi * t / d)
    return (x * .9 + clack * .5) * e
def horn(d=.6):
    t = T(d); w = sum(np.sign(np.sin(2*np.pi*f*t)) for f in (311, 370, 466)) * .08
    return lp(w, 6) * np.minimum(t / .03, 1) * np.minimum((d - t) / .08, 1)
def conveyor(d=1.2):
    t = T(d); return lp(noise(d), 60) * 1.5 * np.sin(np.pi*t/d) + np.sin(2*np.pi*60*t) * .1
def crowd(d):
    t = T(d); return (lp(noise(d), 25) - lp(noise(d), 120)) * .5 * np.minimum(t/.5, 1) * np.minimum((d-t)/.5, 1)
def swish(): return whoosh(.3) * 1.2
# ---------- MUSIC ----------
bpm = 120; beat = 60 / bpm
def kick():
    t = T(.35); f = 45 + 120 * np.exp(-t * 28)
    return np.sin(2*np.pi*np.cumsum(f)/sr) * np.exp(-t * 9)
def hat(): t = T(.05); return np.diff(noise(.05), prepend=0) * np.exp(-t * 80)
def clap(): t = T(.18); return noise(.18) * np.exp(-t * 22) * .8
def tone(f, d, a=.01, r=.4, saw=False):
    t = T(d); w = sum(np.sin(2*np.pi*f*k*t)/k for k in (1, 2, 3, 4, 5)) if saw else np.sin(2*np.pi*f*t)
    return w * np.minimum(t / a, 1) * np.exp(-t / r)
# Am F C G (energetic), soft section uses same chords w/ pads only
chords = [[220, 261.6, 329.6], [174.6, 220, 261.6], [261.6, 329.6, 392], [196, 246.9, 293.7]]
roots = [55, 43.65, 65.4, 49]
def section(t):
    if t < 10: return 'intro'
    if t < 18: return 'drive'
    if t < 32: return 'calm'
    if t < 38.6: return 'rise'
    if t < 52.6: return 'final'
    return 'out'
M_L = np.zeros(N); M_R = np.zeros(N)
def madd(s, x, g=1, pan=0):
    i = int(s * sr)
    if i >= N: return
    x = x[:N - i] * g; M_L[i:i+len(x)] += x * (1 - max(pan, 0)); M_R[i:i+len(x)] += x * (1 + min(pan, 0))
bar = 4 * beat
for bi in range(int(D / bar) + 1):
    s = bi * bar; sec = section(s)
    if sec == 'out': break
    ch = chords[bi % 4]
    pad_g = .05 if sec != 'calm' else .07
    for f in ch:
        madd(s, lp(tone(f, bar + .2, .4 if sec == 'calm' else .05, 2.5, True), 8), pad_g)
    madd(s, tone(roots[bi % 4], bar, .02, 1.5), .3 if sec != 'calm' else .18)
for b in range(int(D / (beat / 2))):
    t = b * beat / 2; sec = section(t); on = b % 2 == 0; qb = b // 2
    if sec == 'out': break
    if on and sec in ('intro', 'drive', 'rise', 'final'): madd(t, kick(), .75)
    if sec in ('drive', 'final') and not on: madd(t, kick(), .25)
    if on and qb % 2 == 1 and sec in ('drive', 'rise', 'final'): madd(t, clap(), .3)
    if sec in ('intro', 'drive', 'rise', 'final'): madd(t, hat(), .1 if on else .06, .3)
    if sec == 'drive': madd(t + beat / 4, hat(), .05, -.3)
    if sec == 'calm' and on and qb % 2 == 0: madd(t, kick(), .25)
    # pluck arp
    ch = chords[int(t // bar) % 4]; arp = [ch[0]*2, ch[1]*2, ch[2]*2, ch[1]*2]
    if sec in ('drive', 'final', 'rise') or (sec == 'calm' and on):
        madd(t, tone(arp[b % 4], .3, .005, .12), .07 if sec != 'calm' else .05, .4 if b % 2 else -.4)
# riser before final and before map
for s0, d in ((36.6, 2.0), (16.4, 1.4)):
    t = T(d); x = (lp(noise(d), 4) * (t/d)**2) * .5; madd(s0, x)
# music fade out at end, duck under VO handled by level
fade = np.ones(N); i0 = int(52.6 * sr); fade[i0:] = np.linspace(1, 0, N - i0)
M_L *= fade; M_R *= fade
# ---------- CUES ----------
add(0.0, engine(2.0), .55, .2)
add(0.35, trainpass(2.2), .45, -.3); add(1.6, horn(.6), .35, -.3)
add(1.3, whoosh(.45), .5); add(2.4, pop(), .45); add(3.82, coin(), .4)
add(5.45, whoosh(.4), .55)
add(5.92, chime(), .35); add(5.92, crowd(4.2), .25)
add(6.36, swish(), .35); add(8.7, ding(1568), .45); add(8.7, pop(), .4)
add(9.28, pop(), .4)
for k in range(9): add(9.28 + k * .1, tick(), .4)
add(10.05, whoosh(.35), .55)
add(10.38, pop(), .5); add(10.38, whoosh(.25), .3)
add(11.52, pop(), .5); add(11.6, beep(), .3); add(11.85, beep(), .3)
add(12.22, pop(), .5); [add(12.3 + k*.25, tick(), .35) for k in range(4)]
add(13.24, pop(), .5); add(13.3, conveyor(1.4), .35)
for k, s in enumerate((15.02, 15.5, 16.04, 16.66)): add(s, pop(), .35)
add(17.55, tick(), 1.0); add(17.55, dom(), .35); add(17.6, whoosh(.45), .6)
add(18.2, trainpass(3.5), .22, -.2); add(18.4, swish(), .25)
add(21.4, swish(), .5); add(21.4, ding(1046), .25)
for s in (22.92, 25.5, 27.96, 29.68, 30.26, 31.08): add(s, pop(), .4)
add(22.92, trainpass(9), .1)
add(31.85, whoosh(.5), .6); add(32.2, boom(.6), .7)
add(32.4, engine(3.0), .35, .1); add(32.78, swish(), .3)
add(35.26, dom(), .7); add(36.4, whoosh(.6), .6)
add(38.35, dom(), .9); add(38.35, whoosh(.3), .4)
add(38.88, swish(), .35); add(41.08, pop(), .45); add(41.08, ding(1318), .25)
add(43.3, swish(), .35); add(45.66, ding(1760), .35); add(45.66, pop(), .4)
for k in range(8): add(45.9 + k * .12, tick(), .3)
add(47.0, pop(), .55); add(47.0, whoosh(.3), .3)
for s in (47.6, 48.4, 49.2, 50.0): add(s, tick(), .4)
add(48.14, pop(), .4); add(49.28, pop(), .3); add(49.9, pop(), .3)
add(50.66, pop(), .45); add(51.3, ding(1318), .25)
add(52.6, boom(.8), .8)
# ---------- MIX ----------
outL = M_L * .8 + L; outR = M_R * .8 + R
pk = max(np.abs(outL).max(), np.abs(outR).max()); outL /= pk / .89; outR /= pk / .89
st = np.stack([outL, outR], 1); st = (np.tanh(st * 1.2) / np.tanh(1.2) * 32767 * .9).astype(np.int16)
with wave.open('public/audio/score.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr); w.writeframes(st.tobytes())
print('ok')
