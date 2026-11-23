# Rain Check: original city-pop score (numpy synthesis) + procedural foley + ambience, driven by events.json -> out/mix.wav
# Usage: $LIB/.venv/bin/python mix.py
import sys, os, json, numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.environ.get('LIB', os.path.expanduser('~/lemo-opuscar'))
sys.path.insert(0, os.path.join(LIB, 'core/audio'))
from sfx import *

E = json.load(open(os.path.join(HERE, 'events.json'))); DUR = E['dur']; EV = E['ev']; N = int(DUR * SR)
tt = np.arange(N) / SR
rng = np.random.default_rng(1987)
BPM = 120; BEAT = 60 / BPM; BAR = BEAT * 4
bar = lambda n: n * BAR
mtof = lambda m: 440.0 * 2 ** ((m - 69) / 12)

def curve(keys):
    k = np.array(keys, float); return np.interp(tt, k[:, 0], k[:, 1])
def stereo_from(x, pan=0.0):
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    return np.stack([x * l * 1.414, x * r * 1.414], 1)
def adsr(d, a, rel, tail=0.0):
    n = int(round((d + tail) * SR)); t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)); e *= np.where(t > d, np.exp(-(t - d) / max(rel, 1e-3)), 1.0); return e

# ------------------------------------------------------------------ instruments (all mono float arrays)
def fm_ep(f, d, v=1.0):                      # DX-style electric piano: 1:1 carrier, decaying index, 14:1 bell transient
    n = int(round((d + .5) * SR)); t = np.arange(n) / SR
    idx = 1.8 * np.exp(-t / .25) + .4
    y = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * t))
    y += .35 * np.sin(2 * np.pi * f * 14 * t) * np.exp(-t / .018)
    y += .25 * np.sin(2 * np.pi * f * 2 * t + .6 * np.sin(2 * np.pi * f * 2 * t)) * np.exp(-t / .5)
    return y * np.exp(-t / (.9 + .3 * (f < 300))) * np.minimum(1, (d + .5 - t) / .15) * v
def slap(f, d, v=1.0):                       # slap bass: thumb + harmonics + pop
    n = int(round((d + .1) * SR)); t = np.arange(n) / SR
    y = sum(np.sin(2 * np.pi * f * h * t + h) / h ** .8 for h in range(1, 7)) * np.exp(-t / .28)
    y += hp(noise(d + .1), 1400)[:n] if len(noise(d + .1)) >= n else 0 * np.exp(-t / .008) * .35 + np.sin(2 * np.pi * f * 2 * t) * np.exp(-t / .03) * .5
    return np.tanh(y * 1.3) * v * np.minimum(1, (d + .1 - t) / .03)
def saw_add(f, t, nh=22, lim=7500):
    y = np.zeros_like(t)
    for h in range(1, nh + 1):
        if f * h > lim: break
        y += np.sin(2 * np.pi * f * h * t + h * .4) / h
    return y
def sax(f, d, v=1.0, vibd=.012):
    n = int(round((d + .25) * SR)); t = np.arange(n) / SR
    vib = 1 + vibd * np.minimum(1, t / .5) * np.sin(2 * np.pi * 5.6 * t)
    ph = np.cumsum(f * vib / SR) * 2 * np.pi
    y = sum(np.sin(ph * h + h * .3) / h ** .85 for h in range(1, 14) if f * h < 6500)
    y = bp(y, 400, 3200) * 1.8 + bp(noise(d + .25), 1800, 5000)[:n] * .06
    return y * adsr(d, .04, .12, .25) * v
def pad(f, d, v=1.0):
    n = int(round((d + 1.2) * SR)); t = np.arange(n) / SR; y = np.zeros(n)
    for dt in (-.006, 0, .006): y += saw_add(f * (1 + dt), t, 16, 3500)
    return lp(y, 1400) * adsr(d, .7, .9, 1.2) * v * .4
def arp(f, d, v=1.0):
    n = int(round((d + .1) * SR)); t = np.arange(n) / SR
    y = saw_add(f, t, 14, 5000) * .6 + np.sign(np.sin(2 * np.pi * f * t)) * .4
    return lp(y, 3000) * np.exp(-t / (d * .8 + .02)) * v
def brass_hit(notes, d=.5, v=1.0):
    n = int(round((d + .3) * SR)); t = np.arange(n) / SR; y = np.zeros(n)
    for m in notes:
        for dt in (-.004, .004): y += saw_add(mtof(m) * (1 + dt), t, 18, 6000)
    cut = 900 + 3200 * np.exp(-t / .09)
    y = lp(y, 2600) * (.6 + .4 * np.exp(-t / .12)) * np.where(t < d, np.minimum(1, t / .015), np.exp(-(t - d) / .12))
    return y * v * .22
def kick(v=1.0):
    t = t_(.4); f = 48 + 90 * np.exp(-t / .03)
    return (np.sin(np.cumsum(f / SR) * 2 * np.pi) * np.exp(-t / .16) + hp(noise(.4), 2500) * np.exp(-t / .004) * .15) * v
def snare(v=1.0, gate=.2):                   # gated-reverb snare
    t = t_(gate + .05); body = np.sin(2 * np.pi * 190 * t) * np.exp(-t / .05)
    n = bp(noise(gate + .05), 900, 7000) * np.exp(-t / .09) * 1.2
    g = np.where(t < gate, 1.0, np.exp(-(t - gate) / .01)); return (body * .6 + n) * g * v
def hat(v=1.0, op=False):
    d = .22 if op else .04; return hp(noise(d), 7000) * np.exp(-t_(d) / (.08 if op else .012)) * v
def tom(f, v=1.0):
    t = t_(.5); ff = f * (1 + .6 * np.exp(-t / .05)); return np.sin(np.cumsum(ff / SR) * 2 * np.pi) * np.exp(-t / .22) * v

# ------------------------------------------------------------------ the score
mus = np.zeros((N, 2)); musGain = np.zeros(N)
def put(x, at, g=1.0, pan=0.0): add(mus, x, at, g, pan)
def chord(root, kind):
    return {'maj7': [0, 4, 7, 11], '7': [0, 4, 7, 10], 'm7': [0, 3, 7, 10], 'maj6': [0, 4, 7, 9]}[kind]
# bar -> (bass midi, chord midis)
PROG = {0: (46, [58, 62, 65, 69]), 1: (48, [60, 64, 67, 70]), 2: (45, [57, 60, 64, 67]), 3: (50, [62, 65, 69, 72]),
        4: (38, [50, 53, 57, 60]), 5: (43, [55, 58, 62, 65]), 6: (48, [58, 60, 64, 67]),
        8: (46, [58, 62, 65, 69]), 9: (46, [58, 62, 65, 69]), 10: (48, [60, 64, 67, 70]), 11: (45, [57, 60, 64, 67]), 12: (51, [63, 67, 70, 74]),
        13: (46, [58, 62, 65, 69]), 14: (41, [53, 57, 60, 62, 65])}
def groove(b, lvl, hats16=False, fill=False):
    t0 = bar(b); sx = BEAT / 4
    for s in (0, 6, 8, 10): put(kick(.9 * lvl), t0 + s * sx)
    for s in (4, 12): put(snare(.8 * lvl), t0 + s * sx)
    for s in range(0, 16, 1 if hats16 else 2):
        put(hat((.5 if s % 4 == 0 else .3) * lvl), t0 + s * sx + (.012 if s % 2 else 0), 1, .25)
    put(hat(.5 * lvl, True), t0 + 14 * sx, 1, .25)
    if fill:
        for i, f in enumerate([180, 150, 120, 95]): put(tom(f, .9 * lvl), t0 + (12 + i) * sx, 1, -.3 + i * .2)
def comp(b, lvl, chanks=False):
    bass, ch = PROG[b]; t0 = bar(b); sx = BEAT / 4
    for s in (0, 3, 6, 8, 11, 14):                           # e-piano stabs
        put(sum(fm_ep(mtof(m), .35, .26 * lvl) for m in ch), t0 + s * sx, 1, -.15)
    for s, o in ((0, 0), (3, 12), (6, 0), (8, 0), (10, 7), (12, 12), (14, 0)):   # slap bass
        put(slap(mtof(bass + o), .2, .5 * lvl), t0 + s * sx, 1, 0)
    if chanks:
        for s in range(2, 16, 2): put(hp(sum(fm_ep(mtof(m + 12), .08, .06 * lvl) for m in ch[1:]), 600), t0 + s * sx, 1, .4)
def arpeggio(b, lvl, start=0, bars=1):
    bass, ch = PROG[b]; t0 = bar(b); sx = BEAT / 4; seq = [ch[0], ch[2], ch[3], ch[2] + 12]
    for s in range(start, 16): put(arp(mtof(seq[s % 4] + 12), .14, .16 * lvl * (.6 + .4 * (s / 16))), t0 + s * sx, 1, -.35 + .7 * ((s % 4) / 3))
def melody(notes, b, lvl, shift=0, pan=.1):
    for off, m, d in notes: put(sax(mtof(m + shift), d * BEAT * .95, .5 * lvl), bar(b) + off * BEAT, 1, pan)
MEL = {9: [(0, 81, 1.5), (1.5, 79, .5), (2, 77, 1), (3, 74, 1)], 10: [(0, 76, 1.5), (1.5, 74, .5), (2, 72, 1), (3, 70, .5), (3.5, 72, .5)],
       11: [(0, 69, 1), (1, 72, 1), (2, 76, 1.5), (3.5, 74, .5)], 12: [(0, 77, 1), (1, 81, 1), (2, 84, 1.5), (3.5, 81, .5)],
       13: [(0, 74, 1), (1, 77, 1), (2, 81, 2)], 14: [(0, 77, 4)]}

# 0-3: intro (e-piano, soft drums, bass)
for b in (0, 1):
    comp(b, .8); groove(b, .55)
# 3-4: the music is a cassette: band-passed, then it dies on the beat; 4-8 only a dark pad
tape_seg = mus[int(3.0 * SR):int(4.0 * SR)].copy()
for c in range(2): tape_seg[:, c] = bp(tape_seg[:, c], 420, 3200)
mus[int(3.0 * SR):int(4.0 * SR)] = tape_seg
cut = int(3.5 * SR); mus[cut:] = 0          # dead on beat 2 of bar 2... nothing plays until the pad (re-added below)
mus[:int(3.0 * SR)] *= 1
for m, g in ((38, .5), (45, .4), (50, .4), (53, .3)):                      # tension drone, Dm
    put(pad(mtof(m), 4.4, 1) , 3.8, g, 0)
# 6-8: single bell + rising arpeggio (after the silence)
for b in (3,): arpeggio(4, .8, start=0)
arpeggio(4, .6, 8);
# 8-14: driving rain section
for b in (4, 5): comp(b, .75, True); groove(b, .85, True)
for b in (4, 5): arpeggio(b, 1.0)
groove(6, .95, True, fill=True); comp(6, .7)
# riser into the crack at 14.0
t = t_(2.0); riser = bp(noise(2.0), 1000, 6000) * (t / 2.0) ** 2 * .5; put(riser, 12.0, .5, 0)
# 14-16: near silence; one faint bell on the leaf
put(fm_ep(mtof(93), 1.6, .12), 15.25, 1, .3)
# 16-18: strings + heartbeat kicks
for m, g in ((46, .5), (58, .45), (65, .45), (69, .4)): put(pad(mtof(m), 2.4, 1), 15.8, g, 0)
for i in range(4): put(kick(.5 + .15 * i), 16.0 + i * .5, 1, 0)
for i in range(4): put(kick(.8 + .1 * i), 17.0 + .5 + i * .125, 1, 0)
# 18: brass hit then the band re-enters on the rip
put(brass_hit([46, 58, 65, 69, 74], .6, 1.0), 18.0, 1.0, 0); put(kick(1.0), 18.0)
put(snare(1.0), 18.5); put(kick(1.0), 18.5)
# 18-26 chorus: sax + band
groove(9, .6)        # lighter first bar (kick/snare ghost)
for b in (10, 11, 12): groove(b, 1.0, True)
for b in (9, 10, 11, 12): comp(b, 1.0, True)
for b in (9, 10, 11, 12): melody(MEL[b], b, 1.0, shift=1 if b == 12 else 0)
put(brass_hit([58, 62, 65, 69, 74], .5, .9), bar(11), 1, 0)            # the title lands on a brass hit at 22.0
for m, g in ((46, .35), (58, .3), (65, .3)): put(pad(mtof(m), 3.8, 1), 18.0, g, 0)
# 26-30: outro: thinner band, sax, last chord
groove(13, .5); comp(13, .55); melody(MEL[13], 13, .7)
for m, g in ((41, .5), (53, .4), (57, .4), (60, .35), (65, .3)): put(pad(mtof(m), 2.2, 1), 28.0, g, 0)
melody(MEL[14], 14, .55)
put(fm_ep(mtof(77), 2.0, .2), 28.0, 1, .3); put(fm_ep(mtof(84), 2.0, .12), 28.2, 1, -.3)

# music gain (the hush/dropouts are in the curve)
mg = curve([(0, .8), (2.9, .8), (3.5, .8), (3.55, .0), (3.8, .0), (4.0, .5), (4.9, .5), (5.0, 0), (7.0, 0), (7.4, .45), (8.0, .75), (14.0, 1.0), (14.01, 0), (15.9, 0), (16.0, .6), (17.9, .7),
            (18.0, 1.0), (24.0, 1.0), (26.0, .85), (29.0, .7), (29.5, 0), (30, 0)])
mus *= mg[:, None]
# strip the post-3.5 drums/bass that were placed in the intro bars (they ended at 4.0): handled by mg

# ------------------------------------------------------------------ ambience
amb = np.zeros((N, 2))
wind_g = curve([(0, .05), (3.0, .06), (4.0, .22), (4.8, .2), (5.0, .05), (5.99, .04), (6.0, .1), (8.0, .16), (14.0, .3), (14.1, .02), (15.0, .1), (20, .15), (26, .12), (26.5, .06), (29, .04), (30, 0)])
wind = bp(noise(DUR), 220, 1400) * (.55 + .45 * np.sin(2 * np.pi * .35 * tt + 1)) * wind_g
amb += stereo_from(wind * .7, -.4) + stereo_from(np.roll(wind, 9001) * .7, .4)
crick = (np.sin(2 * np.pi * 4300 * tt) * (np.sin(2 * np.pi * 21 * tt) > .6) + np.sin(2 * np.pi * 5100 * tt) * (np.sin(2 * np.pi * 17 * tt + 1) > .7)) * curve([(0, .012), (2.8, .012), (3.8, 0), (30, 0)])
amb += stereo_from(crick, .3)
rain_g = curve([(0, 0), (5.99, 0), (6.0, .02), (7.0, .05), (8.0, .22), (12, .3), (14.0, .34), (14.1, .1), (14.9, .12), (16, .26), (18.4, .3), (18.5, .24), (26.0, .24), (26.4, .0), (30, 0)])
rainb = hp(lp(noise(DUR), 9000), 700) * .35
amb += stereo_from(rainb * rain_g, -.3) + stereo_from(np.roll(rainb, 4801) * rain_g, .3)
# the leaf drums (18.9 -> 26): dense resonant patter on top
leafg = curve([(0, 0), (18.8, 0), (19.2, .5), (22, .8), (26.0, .8), (26.3, 0), (30, 0)])
hits = np.zeros(N); idx = rng.integers(int(18.8 * SR), int(26.4 * SR), 5200); hits[idx] = rng.uniform(.3, 1, len(idx))
patter = bp(hits, 900, 2600, 2) * 3.5 + bp(hits, 3000, 7000) * 1.2
amb += stereo_from(patter * leafg, .1) * .5
# dripping and a clean room after the storm (26 -> 29)
dg = curve([(0, 0), (26.3, 0), (26.6, 1), (29, 1), (29.5, 0), (30, 0)])
dr = np.zeros(N)
for ti in np.arange(26.6, 29.4, .37): dr[int((ti + rng.uniform(0, .2)) * SR)] = rng.uniform(.4, 1)
drips = bp(dr, 1400, 2800) * 1.6 * dg
amb += stereo_from(drips, -.2)

# ------------------------------------------------------------------ foley from the event list
fx = np.zeros((N, 2))
def F(x, at, g=1.0, pan=0.0): add(fx, x, at, g, pan)
def thunder(d, v):
    n = rumble(d + 1.5, 1) * 1.0; t = t_(d + 1.5); return norm(lp(brown(d + 1.5), 150) * (np.exp(-t / (d * .55)) * (1 + .4 * np.sin(t * 9)))) * v
def gust(d, v): t = t_(d); return bp(noise(d), 300, 1700) * np.sin(np.pi * t / d) ** 2 * v * 1.4
def tink(v): t = t_(.5); return (np.sin(2 * np.pi * 2350 * t) * np.exp(-t / .09) + .5 * np.sin(2 * np.pi * 3520 * t) * np.exp(-t / .05) + lp(noise(.5), 3000) * np.exp(-t / .004) * .3) * v
def gravel(v, wet=False):
    d = .14; t = t_(d); y = hp(noise(d), 1500) * np.exp(-t / .018) * .7 + bp(noise(d), 300, 1200) * np.exp(-t / .03) * .5 + np.sin(2 * np.pi * 90 * t) * np.exp(-t / .04) * .6
    if wet: y += bp(noise(d), 700, 3500) * np.exp(-t / .05) * .8
    return y * v
def squelch(v): t = t_(.32); f = 300 + 700 * t / .32; return bp(noise(.32), 250, 1300) * (.5 + .5 * np.sin(2 * np.pi * 26 * t)) * np.exp(-t / .12) * v * 1.4
def plop(v): t = t_(.3); return (np.sin(np.cumsum((220 - 450 * t) / SR) * 2 * np.pi) * np.exp(-t / .07) + bp(noise(.3), 400, 2500) * np.exp(-t / .05) * .5) * v
def pat(v): t = t_(.12); return (lp(noise(.12), 700) * np.exp(-t / .02) * .8 + np.sin(2 * np.pi * 140 * t) * np.exp(-t / .03)) * v
def crack(v): t = t_(1.2); return (noise(1.2) * np.exp(-t / .05) * 1.3 + lp(brown(1.2), 220) * np.exp(-t / .22) * 3 + hp(noise(1.2), 2500) * np.exp(-t / .2) * .5) * v
def ringout(d, v): t = t_(d); return (np.sin(2 * np.pi * 3200 * t) + .5 * np.sin(2 * np.pi * 4800 * t)) * np.exp(-t / (d * .35)) * v * .12
def rip(v): t = t_(.5); crk = (rng.random(len(t)) > .93) * rng.uniform(.3, 1, len(t)); return (hp(noise(.5), 2200) * np.exp(-t / .22) * .7 + bp(crk, 1200, 6000) * 2 + lp(noise(.5), 400) * np.exp(-t / .06)) * v
def rustle(d, v): t = t_(d); return hp(noise(d), 3000) * (rng.random(len(t)) > .5) * np.sin(np.pi * t / d) ** 1.5 * v * .9 + bp(noise(d), 1800, 5000) * np.sin(np.pi * t / d) * .25 * v
def flap(d, v): t = t_(d); am = np.abs(np.sin(2 * np.pi * 7 * t + 4 * np.sin(2 * np.pi * 1.3 * t))) ** 2; return bp(noise(d), 200, 2200) * am * v * .8 * np.minimum(1, t * 4)
def chirp(v, f=4200): t = t_(.12); return np.sin(np.cumsum((f + 1800 * np.sin(np.pi * t / .12) ** 2 + 800 * t) / SR) * 2 * np.pi) * np.sin(np.pi * t / .12) * v * .5
def casehit(d, v): hits = np.zeros(int(d * SR)); idx = rng.integers(0, len(hits), int(d * 700)); hits[idx] = rng.uniform(.3, 1, len(idx)); return (bp(hits, 300, 1400) * 4 + bp(hits, 2000, 6000)) * v * np.minimum(1, t_(d) * 20)
def paper_s(d, v): t = t_(d); return hp(noise(d), 2500) * (.4 + .6 * rng.random(len(t))) * np.exp(-t / (d * .6)) * v
def tracknoise(d): t = t_(d); return (bp(noise(d), 800, 5000) * .7 + np.sin(2 * np.pi * (180 + 80 * np.sin(t * 40)) * t) * .5) * np.sin(np.pi * t / d)
def whine(d): t = t_(d); f = 1800 * np.exp(-t / d * 3.2) + 150; return np.sin(np.cumsum(f / SR) * 2 * np.pi) * np.minimum(1, t * 10) * np.exp(-t / (d * .9)) * .35 + hp(noise(d), 4000) * .08 * (t / d)
def crton(): t = t_(.5); return np.sin(2 * np.pi * 15700 * t) * np.exp(-t / .3) * .08 + np.pad(thump(.6, 55), (0, 24000))[:24000] * .6
for ev in EV:
    ty, tm, v, d = ev['type'], ev['t'], ev.get('v', 1.0), ev.get('d', 1.0)
    if ty == 'crton': F(crton(), tm, .8)
    elif ty == 'step': F(gravel(.5 * v, ev.get('wet', 0) == 1), tm, 1, .0 + rng.uniform(-.1, .1))
    elif ty == 'wetstep': F(gravel(.7 * v, True), tm, 1, rng.uniform(-.1, .1))
    elif ty == 'pat': F(pat(v), tm, .6, .1)
    elif ty == 'thunder': F(thunder(d, 1), tm, .55 * v, 0)
    elif ty == 'gust': F(gust(d, 1), tm, .5 * v, rng.uniform(-.4, .4))
    elif ty == 'drop': F(tink(v), tm, .45, rng.uniform(-.1, .1))
    elif ty == 'casehit': F(casehit(d, 1), tm, .18, 0)
    elif ty == 'squelch': F(squelch(v), tm, .5, 0)
    elif ty == 'paper': F(paper_s(d, 1), tm, .4, 0)
    elif ty == 'plop': F(plop(v), tm, .6, 0)
    elif ty == 'cloth': F(flap(d, 1), tm, .22, -.1)
    elif ty == 'crack': F(crack(v), tm, 1.1, 0)
    elif ty == 'ring': F(ringout(d, 1), tm, 1.0, 0)
    elif ty == 'rustle': F(rustle(d, 1), tm, .4, .2)
    elif ty == 'heart': pass
    elif ty == 'stretch': F(creak(.8), tm, .35, .1)
    elif ty == 'rip': F(rip(v), tm, .9, 0); F(thump(.7, 90), tm + .02, .5, 0)
    elif ty == 'whoosh': F(whoosh(.5, 1), tm, .4, 0)
    elif ty == 'title': F(ding(1.0), tm + .55, .35, .3); F(whoosh(.6, 1), tm - .1, .4, 0)
    elif ty == 'tape': F(tracknoise(d), tm, .35, 0)
    elif ty == 'birds':
        for i in range(9): F(chirp(1, rng.uniform(3600, 5200)), tm + rng.uniform(0, d), .22, rng.uniform(-.7, .7))
    elif ty == 'tapeout': F(whine(d), tm, .5, 0)
# blue-screen hiss after the tape ends
hiss = hp(lp(noise(DUR), 9000), 1500) * curve([(0, 0), (29.3, 0), (29.45, .05), (30, .05)])
fx += stereo_from(hiss, 0)
# heartbeat kicks 16-18 live in the score; gate the title-hit ring etc. is in events

# ------------------------------------------------------------------ mix
# ducking: score under the big foley, true silences at 5-6 and 14.0-14.9 (the curves above already clear the score)
duck = np.ones(N)
for ev in EV:
    if ev['type'] in ('crack',): duck *= 1 - .8 * np.exp(-np.clip(tt - ev['t'], 0, None) / .4) * (tt >= ev['t'])
master = mus * .9 + amb * 1.0 + fx * 1.0
master *= duck[:, None]
for c in range(2): master[:, c] = limit(master[:, c], .92)
master *= 0.9
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), master.astype(np.float32), SR)
print('mix.wav', DUR, 's, peak', float(np.abs(master).max()))
