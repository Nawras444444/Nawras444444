"""Synthesize a sparse, varied SFX track aligned to the visual hits -> out/sfx.wav"""
import numpy as np, wave
SR = 44100; END = 67.0
rng = np.random.default_rng(7)
track = np.zeros(int(SR * END))
t_ = lambda d: np.arange(int(SR * d)) / SR
env = lambda n, a, d: np.minimum(np.arange(n) / max(1, int(a * SR)), 1) * np.exp(-np.arange(n) / (d * SR))
def lp(x, k):  # cheap low-pass (moving average)
    return np.convolve(x, np.ones(k) / k, 'same')
def noise(d): return rng.standard_normal(int(SR * d))

def boom(d=1.6, f0=60):
    t = t_(d); f = f0 * (1 + 1.5 * np.exp(-t * 18))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), .004, .45) + lp(noise(d), 40) * env(len(t), .001, .08) * .8
def whoosh(d=.55, k1=60, k2=6):
    n = noise(d); x = np.linspace(0, 1, len(n)); w = np.sin(np.pi * x) ** 2
    ks = (k1 + (k2 - k1) * x).astype(int); out = np.zeros_like(n); c = np.cumsum(np.r_[0, n])
    i = np.arange(len(n)); lo = np.clip(i - ks, 0, len(n)); out = (c[i + 1] - c[lo]) / (i + 1 - lo)
    return out * w * 3
def stamp(heavy=False):
    d = .9 if heavy else .45; t = t_(d)
    body = np.sin(2 * np.pi * (110 if heavy else 180) * t) * env(len(t), .002, .09 if heavy else .05)
    return body + lp(noise(d), 6) * env(len(t), .001, .03) * 1.2 + (boom(.9, 45) * .6 if heavy else 0)
def ping(f=1180):
    t = t_(2.2); return (np.sin(2 * np.pi * f * t) + .3 * np.sin(2 * np.pi * f * 2.01 * t)) * env(len(t), .005, .5) * .5
def tick(f=3200, d=.04):
    t = t_(d); return np.sin(2 * np.pi * f * t) * env(len(t), .0005, .006) + noise(d) * env(len(t), 0, .003) * .3
def chime():
    t = t_(1.6); return sum(np.sin(2 * np.pi * f * t) * a for f, a in [(1318, .5), (1976, .35), (2637, .2)]) * env(len(t), .002, .35)
def clink(f):
    t = t_(.5); return (np.sin(2 * np.pi * f * t) + .6 * np.sin(2 * np.pi * f * 2.76 * t)) * env(len(t), .0005, .08) * .5
def punch():
    t = t_(.5); return np.sin(2 * np.pi * 85 * t * (1 + np.exp(-t * 30))) * env(len(t), .002, .12) + lp(noise(.5), 12) * env(len(t), .001, .02)
def hiss(d=2.4):
    n = noise(d) - lp(noise(d), 3); x = np.linspace(0, 1, len(n)); return n * np.sin(np.pi * x) ** 1.5 * .25
def snap():
    t = t_(.25); return (noise(.25) - lp(noise(.25), 4)) * env(len(t), 0, .015) * 1.5 + np.sin(2 * np.pi * 900 * t) * env(len(t), 0, .02) * .4
def knock():  # gavel: wooden hit + short ring
    t = t_(.6); return (np.sin(2 * np.pi * 420 * t) + .5 * np.sin(2 * np.pi * 1130 * t)) * env(len(t), .0005, .05) + lp(noise(.6), 5) * env(len(t), 0, .01)
def shutter():
    a = lp(noise(.05), 3) * env(int(SR * .05), 0, .008); return np.r_[a, np.zeros(int(SR * .07)), a * .8]
def zap():
    t = t_(.35); return np.sign(np.sin(2 * np.pi * (220 - 400 * t) * t)) * env(len(t), .001, .08) * .25 + (noise(.35) - lp(noise(.35), 3)) * env(len(t), 0, .05) * .3
def swell(d=1.2):
    t = t_(d); f = 50 + 200 * (t / d) ** 2
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * .5 + lp(noise(d), 20) * .8) * (t / d) ** 3
def drone(d=3.0):
    t = t_(d); return (np.sin(2 * np.pi * 55 * t) + .5 * np.sin(2 * np.pi * 82.5 * t)) * env(len(t), .01, 1.2) * .7

def add(t, x, g=1.0):
    i = int(t * SR); x = x[: len(track) - i]; track[i:i + len(x)] += x * g

S = [0, 9.0, 16.9, 25.6, 35.2, 45.0, 54.8]
# transitions (each different)
add(S[1] - .35, whoosh(.55, 50, 5), .5); add(S[2] - .05, shutter(), .7); add(S[3] - .5, whoosh(.7, 8, 70), .45)
add(S[4] - .3, whoosh(.6, 90, 20), .5); add(S[5] - .05, zap(), .6); add(S[6] - .35, whoosh(.5, 30, 4), .5)
# scene 1
add(0.78, boom(), .9); add(5.6, ping(), .5); add(7.0, ping(990), .35)
# scene 2: stamp "ADRIFT / ABANDONED"
add(S[1] + 3.5, stamp(), .9)
# scene 3: counter ticks + "100% intact" chime
for k in range(14): add(S[2] + 2.3 + k * .11 * (1 + k / 14), tick(2600 + 60 * k), .35)
add(S[2] + 4.9, chime(), .55)
# scene 4: watch ticks, coin clinks, two punches
for k in range(5): add(S[3] + .4 + k * .5, tick(1800 if k % 2 else 2300, .05), .4)
for k, (dt, f) in enumerate([(.55, 2900), (.72, 3400), (.84, 2600), (.92, 3100)]): add(S[3] + 3.2 + dt, clink(f), .6)
add(S[3] + 6.7, punch(), .9); add(S[3] + 7.7, punch(), 1.0)
# scene 5: 10 SOULS boom, heavy stamp
add(S[4] + 1.9, boom(1.8, 48), .9); add(S[4] + 5.6, stamp(True), .8)
# scene 6: lifeboat slam, rope snaps, gas hiss
add(S[5] + 2.0, punch(), .8); add(S[5] + 2.8, snap(), .6); add(S[5] + 3.0, snap(), .5); add(S[5] + 3.4, hiss(2.6), .6)
# scene 7: wax seal, gavel, UNSOLVED, end drone
add(S[6] + 1.6, stamp(), .5); add(S[6] + 4.0 - 1.2, swell(1.2), .5); add(S[6] + 3.98, knock(), .9); add(S[6] + 4.3, boom(2.0, 42), 1.0)
add(END - 2.6, drone(), .6)

track = np.tanh(track * 0.9) * 0.8
with wave.open('out/sfx.wav', 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((track * 32767).astype(np.int16).tobytes())
print('sfx ok')
