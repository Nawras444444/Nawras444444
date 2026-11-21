"""Procedural cinematic synth bed (no external assets) synced to the montage hits."""
import numpy as np, wave
SR = 44100
DUR = 21.5
N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(7)
L = np.zeros(N); R = np.zeros(N)

def add(sig, start, gain=1.0, pan=0.0):
    i = int(start * SR)
    n = min(len(sig), N - i)
    if n <= 0: return
    L[i:i+n] += sig[:n] * gain * (1 - max(pan, 0))
    R[i:i+n] += sig[:n] * gain * (1 + min(pan, 0))

def lp(x, a):  # one-pole lowpass
    y = np.zeros_like(x); s = 0.0
    aa = np.broadcast_to(a, x.shape)
    for i in range(len(x)):
        s += aa[i] * (x[i] - s); y[i] = s
    return y

def env(n, a, d):
    e = np.ones(n); na = int(a*SR); e[:na] = np.linspace(0, 1, max(na,1))
    nd = int(d*SR); e[-nd:] *= np.linspace(1, 0, max(nd,1)); return e

# --- pad: Am - F - C - G, 4.8s each, detuned saws + sub
chords = [[57,60,64],[53,57,60],[48,52,55],[55,59,62]]
f = lambda m: 440 * 2 ** ((m - 69) / 12)
for ci in range(5):
    notes = chords[ci % 4]
    st = ci * 4.8; ln = 5.6
    n = int(ln * SR); tt = np.arange(n) / SR
    pad = np.zeros(n)
    for m in notes:
        for det in (-0.004, 0, 0.004):
            ph = (tt * f(m) * (1 + det)) % 1.0
            pad += (2 * ph - 1) * 0.12
    pad += np.sin(2*np.pi*f(notes[0]-12)*tt) * 0.5
    pad = lp(pad, 0.06 + 0.04 * np.sin(tt * 0.9)) * env(n, 1.2, 1.4)
    add(pad, st, 0.55, 0.0)

# --- arp (shimmer) from 3s
arp_notes = [69,72,76,81,76,72]
step = 0.25
for k in range(int((DUR-3)/step)):
    m = arp_notes[k % 6] + (0 if (k//24)%2==0 else -2)
    n = int(0.3*SR); tt = np.arange(n)/SR
    s = np.sin(2*np.pi*f(m)*tt) + 0.4*np.sin(2*np.pi*f(m)*2*tt)
    s *= np.exp(-tt*9) * 0.18
    add(s, 3 + k*step, 1.0, pan=np.sin(k)*0.6)

# --- drums @ 120bpm from 3.3s
beat = 0.5
for k in range(int((DUR-3.3)/beat)):
    st = 3.3 + k*beat
    n = int(0.35*SR); tt = np.arange(n)/SR
    kick = np.sin(2*np.pi*(45 + 110*np.exp(-tt*28))*tt) * np.exp(-tt*9)
    add(kick, st, 0.9)
    if k % 2 == 1:
        nn = int(0.2*SR); tt2 = np.arange(nn)/SR
        sn = (rng.standard_normal(nn) * np.exp(-tt2*18)) * 0.35
        add(sn - lp(sn, 0.02), st, 0.8)
    for h in (0.0, 0.25):
        nn = int(0.05*SR)
        hh = rng.standard_normal(nn) * np.exp(-np.arange(nn)/SR*90) * 0.12
        add(hh - lp(hh, 0.3), st + h, 0.8, pan=0.3)

# --- impacts + risers at transitions and banner hits (seconds)
def impact(at, big=1.0):
    n = int(2.6*SR); tt = np.arange(n)/SR
    sub = np.sin(2*np.pi*(38 + 80*np.exp(-tt*6))*tt) * np.exp(-tt*2.0)
    nz = lp(rng.standard_normal(n), 0.15) * np.exp(-tt*3.2) * 0.6
    add(sub*0.9 + nz, at, big)
def riser(at, ln=0.7):
    n = int(ln*SR); tt = np.arange(n)/SR
    nz = rng.standard_normal(n)
    s = (nz - lp(nz, 0.05)) * np.linspace(0, 1, n)**2 * 0.35
    sw = np.sin(2*np.pi*(300 + 1500*(tt/ln)**2)*tt) * np.linspace(0,1,n)**2 * 0.15
    add(s + sw, at - ln, 1.0)
for fr in (100, 230, 360, 500):
    impact(fr/30 + 0.33, 0.9); riser(fr/30 + 0.33)
for fr in (140, 258, 460):
    impact(fr/30, 0.7)
impact(504/30, 1.2); impact(0.0, 0.8)

# --- master
mx = max(np.abs(L).max(), np.abs(R).max())
fade = np.ones(N); fn = int(2.0*SR); fade[-fn:] = np.linspace(1, 0, fn)
fade[:int(0.3*SR)] = np.linspace(0, 1, int(0.3*SR))
out = np.stack([np.tanh(L/mx*1.6)*fade, np.tanh(R/mx*1.6)*fade], 1) * 0.9
pcm = (out * 32767).astype("<i2")
with wave.open("public/music.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print("ok", DUR)
