# Builds this project's sound kit from scratch (no downloads, no licences): rain, a sub drone, a dark pad, a slow piano
# phrase, a metallic coin ring and wobble, a 120 BPM pulse, a muted drum hit and a low impact.
# Usage: python3 synth_jw.py <folder>   (then pass the folder to mix.py with --lib, alongside synth_sfx.py's kit)
import numpy as np, sys, os, wave
from scipy.signal import butter, sosfilt, fftconvolve

SR = 48000
RNG = np.random.default_rng(7)

def save(name, x, folder, width=14):
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1:
        x = np.stack([x, np.roll(x, width)], 1)
    x = x / (np.abs(x).max() + 1e-9) * 0.9
    w = wave.open(os.path.join(folder, name + '.wav'), 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((x * 32767).astype(np.int16).tobytes()); w.close()

def t_(d): return np.arange(int(d * SR)) / SR
def lp(x, f, o=2): return sosfilt(butter(o, f / (SR / 2), 'low', output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f / (SR / 2), 'high', output='sos'), x)
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo / (SR / 2), hi / (SR / 2)], 'band', output='sos'), x)
def midi(m): return 440.0 * 2 ** ((m - 69) / 12)
def fades(x, a=0.01, b=0.05):
    n = len(x); x = x.copy(); na, nb = int(a * SR), int(b * SR)
    if na: x[:na] *= np.linspace(0, 1, na)
    if nb: x[-nb:] *= np.linspace(1, 0, nb)
    return x
def reverb(x, secs=1.8, wet=0.25, seed=1):
    r = np.random.default_rng(seed); n = int(secs * SR); ir = r.standard_normal(n) * np.exp(-np.arange(n) / SR * 6.5 / secs)
    ir = lp(ir, 6000); ir /= np.abs(ir).sum() ** 0.5 * 40
    dry = np.concatenate([x, np.zeros(n)]); y = fftconvolve(x, ir); y = np.pad(y, (0, max(0, len(dry) - len(y))))[:len(dry)]
    return dry * (1 - wet) + y / (np.abs(y).max() + 1e-9) * np.abs(x).max() * wet * 2

def rain(d=12):
    n = int(d * SR); x = bp(RNG.standard_normal(n), 700, 9000) * 0.5
    drops = np.zeros(n)
    for _ in range(int(d * 140)):
        i = RNG.integers(0, n - 2000); L = RNG.integers(200, 1200); drops[i:i + L] += RNG.standard_normal(L) * np.exp(-np.arange(L) / (L / 5)) * RNG.uniform(0.2, 1)
    x = x + hp(drops, 2000) * 0.5
    return fades(x, 0.5, 0.5)

def sub_drone(d=12):
    t = t_(d); lfo = 0.75 + 0.25 * np.sin(2 * np.pi * 0.15 * t)
    x = (np.sin(2 * np.pi * 41.2 * t) + 0.35 * np.sin(2 * np.pi * 82.4 * t) + 0.12 * np.sin(2 * np.pi * 123.6 * t)) * lfo
    x += lp(RNG.standard_normal(len(t)), 120) * 0.6
    return fades(x, 1.0, 1.0)

def dark_pad(d=16):
    t = t_(d); x = np.zeros(len(t))
    for m in [33, 40, 45, 48]:   # A1 E2 A2 C3: A minor, low and dark
        for det in (-0.12, 0.0, 0.11):
            f = midi(m) * 2 ** (det / 12); x += 2 * (t * f - np.floor(0.5 + t * f))
    cut = 380 + 220 * np.sin(2 * np.pi * 0.07 * t)
    y = np.zeros_like(x); seg = 4800
    for i in range(0, len(x), seg): y[i:i + seg] = lp(x[max(0, i - 2000):i + seg], cut[i])[-len(x[i:i + seg]):]
    return fades(y, 2.0, 2.0)

def piano_note(f, d=3.2, vel=1.0):
    t = t_(d); x = np.zeros(len(t))
    for k in range(1, 9):
        x += (1 / k ** 1.3) * np.exp(-t * (1.1 + 0.55 * k)) * np.sin(2 * np.pi * f * k * (1 + 0.0004 * k * k) * t)
    x += lp(RNG.standard_normal(len(t)), 3000) * np.exp(-t * 60) * 0.05   # hammer
    return fades(x * vel, 0.004, 0.2)

def piano_phrase():
    # slow, calm A minor -> F -> C -> G, arpeggiated, with a quiet bass note under each chord (about 72 BPM)
    chords = [([45, 57, 60, 64], 76), ([41, 53, 57, 60], 72), ([36, 48, 52, 55], 67), ([43, 55, 59, 62], 71)]
    d = 2.4 * len(chords) + 3; out = np.zeros(int(d * SR))
    for ci, (notes, top) in enumerate(chords):
        t0 = ci * 2.4
        for j, (m, dt, v) in enumerate([(notes[0], 0, 0.55), (notes[1], 0.3, 0.45), (notes[2], 0.6, 0.45), (notes[3], 0.9, 0.42), (top, 1.4, 0.5)]):
            s = piano_note(midi(m), 3.0, v); i = int((t0 + dt) * SR); out[i:i + len(s)] += s[:len(out) - i]
    return reverb(lp(out, 5000), 2.2, 0.3)

def coin_ring():
    t = t_(2.8); x = np.zeros(len(t))
    for ratio, dec, a in [(1.0, 1.8, 1.0), (2.76, 1.2, 0.6), (5.40, 0.8, 0.4), (8.93, 0.5, 0.25), (13.3, 0.3, 0.15)]:
        x += a * np.exp(-t / dec * 3) * np.sin(2 * np.pi * 1850 * ratio * t)
    x += hp(RNG.standard_normal(len(t)), 3000) * np.exp(-t * 90) * 0.8   # the hit
    return reverb(x, 1.6, 0.22, 3)

def coin_tick(a=1.0):
    t = t_(0.06); x = np.zeros(len(t))
    for ratio, amp in [(1.0, 1.0), (2.76, 0.5), (5.4, 0.3)]: x += amp * np.sin(2 * np.pi * 1850 * ratio * t)
    return x * np.exp(-t * 70) * a

def coin_wobble():
    # a coin settling on a hard floor: taps that speed up, then stop
    d = 1.9; out = np.zeros(int(d * SR)); tt = 0.0; gap = 0.17
    while tt < 1.62:
        s = coin_tick(0.5 + 0.4 * tt / 1.62); i = int(tt * SR); out[i:i + len(s)] += s; tt += gap; gap = max(0.012, gap * 0.86)
    s = coin_tick(0.9); i = int(1.66 * SR); out[i:i + len(s)] += s
    return reverb(out, 1.0, 0.18, 4)

def kick(vel=1.0):
    t = t_(0.45); f = 45 + 75 * np.exp(-t * 28); ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) * np.exp(-t * 7) + lp(RNG.standard_normal(len(t)), 900) * np.exp(-t * 80) * 0.3) * vel

def hat(vel=1.0):
    t = t_(0.06); return hp(RNG.standard_normal(len(t)), 7000) * np.exp(-t * 90) * vel

def pulse(d=14.0, bpm=120):
    # electronic pulse that builds: a kick on every beat, hats join, a bass blip opens up
    out = np.zeros(int((d + 1) * SR)); beat = 60 / bpm; nb = int(d / beat)
    for b in range(nb):
        k = b / nb; v = 0.5 + 0.5 * k; s = kick(v); i = int(b * beat * SR); out[i:i + len(s)] += s
        if b >= 6: h = hat(0.25 + 0.35 * k); j = int((b + 0.5) * beat * SR); out[j:j + len(h)] += h
        for e in (0, 0.5):
            tb = t_(0.11); bl = 2 * (tb * 55 - np.floor(0.5 + tb * 55)) * np.exp(-tb * 18) * (0.15 + 0.35 * k)
            bl = lp(bl, 200 + 1400 * k); j = int((b + e) * beat * SR); out[j:j + len(bl)] += bl
    return out[:int(d * SR)]

def drum_hit():
    # a muted low tom / kick: short and heavy
    t = t_(0.9); f = 58 + 40 * np.exp(-t * 18); ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-t * 6) + lp(RNG.standard_normal(len(t)), 400) * np.exp(-t * 25) * 0.6
    return reverb(x, 1.2, 0.2, 5)

def impact():
    t = t_(3.5); f = 28 + 55 * np.exp(-t * 6); ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-t * 1.3) + lp(RNG.standard_normal(len(t)), 700) * np.exp(-t * 9) * 0.8
    return reverb(x, 2.5, 0.3, 6)

def main(folder):
    os.makedirs(folder, exist_ok=True)
    for name, x in [('JW Rain', rain()), ('JW Sub Drone', sub_drone()), ('JW Dark Pad', dark_pad()), ('JW Piano', piano_phrase()),
                    ('JW Coin Ring', coin_ring()), ('JW Coin Wobble', coin_wobble()), ('JW Pulse', pulse()), ('JW Drum', drum_hit()), ('JW Impact', impact())]:
        save(name, x, folder); print(f'{name:16s} {len(x) / SR:5.2f}s')
    print('Wrote the John Wick sound kit to', folder)

main(sys.argv[1])
