#!/usr/bin/env python3
"""Synthesize three quiet, royalty-free effects: whoosh (scene change), tick (list reveal), chime (closing line).

Usage: python3 make_sfx.py OUTDIR      -> sfx-whoosh / sfx-tick / sfx-chime as .wav (for the mix) and .mp3 (for the page)
"""
import os, subprocess, sys, wave
import numpy as np

SR = 24000
out = sys.argv[1] if len(sys.argv) > 1 else "."
os.makedirs(out, exist_ok=True)
rng = np.random.default_rng(7)


def save(name, x):
    p = os.path.join(out, name + ".wav")
    w = wave.open(p, "wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", p, "-b:a", "64k", p[:-4] + ".mp3"], check=True)


def onepole(x, a):
    y = np.zeros_like(x); s = 0.0
    for i, v in enumerate(x):
        s += a[i] * (v - s); y[i] = s
    return y


n = int(.75 * SR); t = np.arange(n) / SR
x = onepole(rng.standard_normal(n), np.interp(t, [0, .4, .75], [.02, .25, .03]))
x = x - onepole(x, np.full(n, .01)); x *= np.sin(np.pi * np.clip(t / .75, 0, 1)) ** 2
save("sfx-whoosh", x / np.abs(x).max() * .8)

n = int(.14 * SR); t = np.arange(n) / SR
save("sfx-tick", (np.sin(2 * np.pi * 1150 * t) * .6 + np.sin(2 * np.pi * 2300 * t) * .25) * np.exp(-t * 45) * .8)

n = int(1.6 * SR); t = np.arange(n) / SR
x = (np.sin(2 * np.pi * 660 * t) + .5 * np.sin(2 * np.pi * 990 * t) + .25 * np.sin(2 * np.pi * 1320 * t)) * np.exp(-t * 2.6) * np.minimum(1, t / .01)
save("sfx-chime", x / np.abs(x).max() * .7)
print("ok")
