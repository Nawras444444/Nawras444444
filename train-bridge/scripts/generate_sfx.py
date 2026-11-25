"""Procedurally synthesises the foley / SFX library used by the video
(no music in here - these are rain, wind, thunder, brakes, beeps, etc.)
and a film-grain texture.  Usage:  python3 scripts/generate_sfx.py
"""
import os
import wave
import numpy as np
from PIL import Image

SR = 48000
ROOT = os.path.join(os.path.dirname(__file__), "..", "public")
OUT = os.path.join(ROOT, "sfx")
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)


def t(d):
    return np.arange(int(SR * d)) / SR


def noise(d):
    return rng.standard_normal(int(SR * d))


def lp(x, cutoff):
    """Simple one-pole low-pass (applied twice for 12 dB/oct)."""
    a = np.exp(-2 * np.pi * cutoff / SR)
    for _ in range(2):
        y = np.empty_like(x)
        acc = 0.0
        for i in range(len(x)):  # small files - fine
            acc = (1 - a) * x[i] + a * acc
            y[i] = acc
        x = y
    return x


def lp_fast(x, cutoff):
    """FFT brick-ish low-pass with soft knee (fast for long files)."""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / (1 + (f / cutoff) ** 4)
    return np.fft.irfft(X, len(x))


def hp_fast(x, cutoff):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / (1 + (cutoff / np.maximum(f, 1)) ** 4)
    return np.fft.irfft(X, len(x))


def bp_fast(x, lo, hi):
    return hp_fast(lp_fast(x, hi), lo)


def env(n, a, r, shape=1.0):
    """attack/release envelope, a & r in seconds"""
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    if na:
        e[:na] = np.linspace(0, 1, na)
    if nr:
        e[-nr:] *= np.linspace(1, 0, nr) ** shape
    return e


def norm(x, peak=0.9):
    m = np.max(np.abs(x)) or 1
    return x / m * peak


def save(name, x, stereo_width=0.0):
    x = norm(x)
    if stereo_width:
        d = int(0.011 * SR)
        r = np.concatenate([np.zeros(d), x[:-d]])
        l = x
        st = np.stack([l, (1 - stereo_width) * l + stereo_width * r], 1)
    else:
        st = np.stack([x, x], 1)
    data = (np.clip(st, -1, 1) * 32767).astype(np.int16)
    with wave.open(os.path.join(OUT, name), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())
    print("sfx/", name)


def loopable(x, fade=1.0):
    """crossfade tail into head so the file loops seamlessly"""
    n = int(fade * SR)
    head, tail = x[:n], x[-n:]
    ramp = np.linspace(0, 1, n)
    x = x[:-n].copy()
    x[:n] = head * ramp + tail * (1 - ramp)
    return x


# ---------------------------------------------------------------- ambiences
def rain_loop(d=30):
    base = bp_fast(noise(d), 400, 9000) * 0.6
    hiss = hp_fast(noise(d), 5000) * 0.25
    drops = np.zeros(int(SR * d))
    for _ in range(int(d * 260)):
        p = rng.integers(0, len(drops) - 600)
        ln = rng.integers(80, 500)
        drops[p:p + ln] += rng.standard_normal(ln) * np.exp(-np.linspace(0, 8, ln)) * rng.uniform(0.2, 1)
    drops = hp_fast(drops, 1500) * 0.5
    swell = 0.8 + 0.2 * np.sin(2 * np.pi * t(d) / 7.5)
    return loopable((base + hiss + drops) * swell)


def wind(d=12, low=120, high=900):
    x = bp_fast(noise(d), low, high)
    tt = t(d)
    m = 0.55 + 0.3 * np.sin(2 * np.pi * tt / 3.1) + 0.15 * np.sin(2 * np.pi * tt / 1.3 + 1)
    return x * m * env(len(x), 1.5, 2.5)


def engine_hum(d=10):
    tt = t(d)
    f = 46 + 1.5 * np.sin(2 * np.pi * tt * 0.4)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = sum(np.sin(ph * k) / k ** 0.8 for k in range(1, 9))
    x += lp_fast(noise(d), 300) * 0.8
    return loopable(x, 0.5)


# ---------------------------------------------------------------- one shots
def thunder(d=5.0):
    n = int(SR * d)
    crack = hp_fast(noise(0.35), 800) * np.exp(-np.linspace(0, 6, int(SR * 0.35)))
    rumble = lp_fast(noise(d), 160) * 3
    tt = t(d)
    rumble *= (np.exp(-tt * 0.7) * (0.6 + 0.4 * np.sin(2 * np.pi * tt * 1.7) ** 2))
    x = rumble
    x[: len(crack)] += crack * 1.4
    return x * env(n, 0.005, 1.5)


def distant_thunder(d=4.0):
    tt = t(d)
    x = lp_fast(noise(d), 110) * np.exp(-tt * 0.6) * (0.5 + 0.5 * np.sin(2 * np.pi * tt * 1.1) ** 2)
    return x * env(len(x), 0.25, 1.2)


def screech(d=2.6, rise=True):
    tt = t(d)
    x = np.zeros_like(tt)
    for f0, a in [(2310, 1), (3470, 0.7), (4920, 0.5), (1650, 0.4), (6100, 0.25)]:
        f = f0 * (1 + (0.04 * tt / d if rise else -0.06 * tt / d)) + 25 * np.sin(2 * np.pi * 7 * tt)
        x += a * np.sin(2 * np.pi * np.cumsum(f) / SR) * (0.6 + 0.4 * np.sin(2 * np.pi * 13 * tt + f0) ** 2)
    x += bp_fast(noise(d), 2000, 9000) * 0.6
    return x * env(len(x), 0.08, 0.5)


def grind_stop(d=3.2):
    """brakes screaming then grinding to a sudden stop"""
    tt = t(d)
    stop = 1.0  # seconds at which train stops
    prog = np.clip(tt / stop, 0, 1)
    f = 2600 * (1 - 0.55 * prog ** 2)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.6 * np.sin(2 * np.pi * np.cumsum(f * 1.51) / SR)
    x += bp_fast(noise(d), 500, 7000) * 0.9
    x += lp_fast(noise(d), 200) * 1.5
    e = np.where(tt < stop, 1.0, np.exp(-(tt - stop) * 18))
    clunk = lp_fast(noise(0.4), 120) * np.exp(-np.linspace(0, 7, int(SR * 0.4))) * 4
    i = int(stop * SR)
    x = x * e
    x[i:i + len(clunk)] += clunk
    return x * env(len(x), 0.02, 0.4)


def click(d=0.09, pitch=2500):
    tt = t(d)
    x = np.sin(2 * np.pi * pitch * tt) * np.exp(-tt * 90) + hp_fast(noise(d), 2000) * np.exp(-tt * 140)
    x += lp_fast(noise(d), 400) * np.exp(-tt * 60) * 0.8
    return x


def toggles():
    out = np.zeros(int(SR * 1.1))
    for i, (off, p) in enumerate([(0.0, 2400), (0.17, 2900), (0.34, 2200), (0.52, 3300)]):
        c = click(0.09, p) * (1.4 if i == 3 else 1)
        s = int(off * SR)
        out[s:s + len(c)] += c
    return out


def beeps(n=3, f=1850, gap=0.22, ln=0.12):
    out = np.zeros(int(SR * (n * gap + 0.2)))
    for i in range(n):
        tt = t(ln)
        b = (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * 2 * f * tt)) * env(len(tt), 0.004, 0.02)
        s = int(i * gap * SR)
        out[s:s + len(b)] += b
    return out


def alarm(d=1.4):
    tt = t(d)
    f = np.where((tt * 4).astype(int) % 2 == 0, 960, 720)
    x = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.4 + np.sin(2 * np.pi * np.cumsum(f) / SR)
    return lp_fast(x, 4000) * env(len(x), 0.01, 0.2)


def hiss(d=2.2):
    x = hp_fast(noise(d), 2500)
    tt = t(d)
    return x * np.minimum(1, tt * 25) * np.exp(-tt * 0.9)


def heartbeat():
    out = np.zeros(int(SR * 1.5))
    for s0 in (0.0, 0.7):
        for off, a in ((0, 1), (0.18, 0.7)):
            tt = t(0.25)
            b = np.sin(2 * np.pi * (55 - 20 * tt / 0.25) * tt) * np.exp(-tt * 18) * a
            s = int((s0 + off) * SR)
            out[s:s + len(b)] += b
    return out


def whoosh(d=1.2, lo=300, hi=6000):
    x = noise(d)
    tt = t(d)
    out = np.zeros_like(x)
    segs = 24
    sl = len(x) // segs
    for i in range(segs):
        p = i / segs
        c = lo + (hi - lo) * np.sin(np.pi * p)
        seg = bp_fast(x[i * sl:(i + 1) * sl + 2000], c * 0.6, c * 1.4)[:sl]
        out[i * sl:i * sl + len(seg)] = seg
    return lp_fast(out, 9000) * np.sin(np.pi * tt / d) ** 2


def rewind(d=0.9):
    tt = t(d)
    f = 400 + 2600 * (tt / d) ** 1.5
    chirp = np.sin(2 * np.pi * np.cumsum(f) / SR) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 38 * tt)))
    return (chirp * 0.6 + whoosh(d, 800, 7000)) * env(len(tt), 0.05, 0.15)


def impact(d=1.4):
    tt = t(d)
    boom = np.sin(2 * np.pi * (70 * np.exp(-tt * 3)) * tt) * np.exp(-tt * 4)
    return boom * 1.5 + lp_fast(noise(d), 600) * np.exp(-tt * 9)


def splash(d=1.3):
    tt = t(d)
    return bp_fast(noise(d), 300, 8000) * np.exp(-tt * 3.5) * np.minimum(1, tt * 60)


def creak(d=2.4, f0=38):
    tt = t(d)
    f = f0 + 12 * np.sin(2 * np.pi * 0.6 * tt)
    # stick-slip pulses
    ph = np.cumsum(f) / SR
    x = (ph % 1.0 < 0.08).astype(float)
    x = bp_fast(x - x.mean(), 200, 2500)
    return x * np.sin(np.pi * tt / d) ** 1.5


def sizzle(d=3.5):
    tt = t(d)
    x = hp_fast(noise(d), 3000) * (0.6 + 0.4 * (rng.random(len(tt)) > 0.995).astype(float) * 6)
    crackle = np.zeros_like(tt)
    for _ in range(int(d * 120)):
        p = rng.integers(0, len(tt) - 200)
        crackle[p:p + 120] += rng.standard_normal(120) * np.exp(-np.linspace(0, 6, 120))
    return (x * 0.5 + hp_fast(crackle, 1500)) * env(len(tt), 0.2, 1.0)


def rail_clatter(d=4.0, rate=6.0, accel=0.0):
    out = np.zeros(int(SR * d))
    tt = 0.0
    r = rate
    while tt < d - 0.2:
        for off in (0, 0.075):
            s = int((tt + off) * SR)
            c = click(0.08, 900) * 0.6 + lp_fast(noise(0.08), 250) * np.exp(-np.linspace(0, 10, int(0.08 * SR)))
            out[s:s + len(c)] += c
        tt += 1 / r
        r += accel / r
    return out + bp_fast(noise(d), 80, 1200) * 0.35


def door_slide(d=2.0):
    tt = t(d)
    latch = np.zeros_like(tt)
    c = click(0.1, 1300) * 1.5
    latch[: len(c)] += c
    slide = bp_fast(noise(d), 150, 2500) * np.clip((tt - 0.25) / 0.2, 0, 1) * np.exp(-np.maximum(tt - 0.6, 0) * 2.2)
    rumble = np.sin(2 * np.pi * 85 * tt) * 0.3 * (slide != 0)
    return latch + slide * 0.7 + rumble * np.abs(slide).mean()


def footsteps():
    out = np.zeros(int(SR * 1.5))
    for s0 in (0.05, 0.62):
        tt = t(0.22)
        st = lp_fast(noise(0.22), 900) * np.exp(-tt * 28) + np.sin(2 * np.pi * 110 * tt) * np.exp(-tt * 30) * 0.6
        ring = np.sin(2 * np.pi * 1900 * tt) * np.exp(-tt * 20) * 0.08
        s = int(s0 * SR)
        out[s:s + len(st)] += st + ring
    return out


def breath(d=1.8, inhale=False):
    tt = t(d)
    x = bp_fast(noise(d), 500, 3200)
    e = np.sin(np.pi * tt / d) ** (0.6 if inhale else 1.6)
    if not inhale:
        e *= np.exp(-tt * 0.8)
    return x * e


def gasp():
    tt = t(0.5)
    return bp_fast(noise(0.5), 700, 4000) * np.minimum(1, tt * 30) * np.exp(-tt * 6)


def swivel():
    x = creak(0.9, 60)
    c = click(0.05, 700) * 0.3
    x[: len(c)] += c
    return x


def sub_rumble(d=5.0):
    tt = t(d)
    return lp_fast(noise(d), 70) * 3 + np.sin(2 * np.pi * 36 * tt) * 0.5 * env(int(SR * d), 1.5, 1.5)


def drip(d=3.0):
    out = np.zeros(int(SR * d))
    for p in [0.2, 0.75, 1.15, 1.9, 2.4]:
        tt = t(0.12)
        f = 1400 + 900 * tt / 0.12
        dr = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 45)
        s = int(p * SR)
        out[s:s + len(dr)] += dr * rng.uniform(0.5, 1)
    return out


def tension_whine(d=2.0):
    tt = t(d)
    f = 900 + 1700 * (tt / d) ** 2
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.4 * np.sin(2 * np.pi * np.cumsum(f * 1.5) / SR)
    return x * (tt / d) ** 1.2 * env(len(tt), 0.01, 0.06)


def throttle():
    tt = t(1.8)
    clk = np.zeros_like(tt)
    c = click(0.12, 700) * 2
    clk[: len(c)] += c
    f = 55 + 70 * np.clip((tt - 0.1) / 1.5, 0, 1) ** 1.3
    rev = sum(np.sin(2 * np.pi * np.cumsum(f * k) / SR) / k for k in range(1, 7))
    return clk + rev * 0.35 * np.clip((tt - 0.05) * 4, 0, 1) * env(len(tt), 0, 0.3)


def wiper():
    out = np.zeros(int(SR * 2.0))
    for s0 in (0.0, 0.95):
        tt = t(0.6)
        f = 1100 + 500 * np.sin(np.pi * tt / 0.6)
        sq = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / 0.6) ** 2 * 0.25
        rub = bp_fast(noise(0.6), 800, 4000) * np.sin(np.pi * tt / 0.6) ** 2
        s = int(s0 * SR)
        out[s:s + len(tt)] += sq + rub * 0.6
    return out


def roar(d=3.0):
    tt = t(d)
    x = lp_fast(noise(d), 500) * 2 + sum(np.sin(2 * np.pi * np.cumsum(60 + 25 * tt / d + 0 * tt) * k / SR) / k for k in range(1, 6))
    return x * env(len(tt), 0.3, 0.6)


def headlight_buzz(d=2.0):
    tt = t(d)
    return (np.sign(np.sin(2 * np.pi * 120 * tt)) * 0.3 + bp_fast(noise(d), 2000, 6000) * 0.3) * env(len(tt), 0.1, 0.4)


if __name__ == "__main__":
    save("rain_loop.wav", rain_loop(), 0.8)
    save("wind_gust.wav", wind(6, 90, 700), 0.6)
    save("storm_wind.wav", wind(8, 200, 2200), 0.7)
    save("canyon_wind.wav", wind(5, 50, 380), 0.5)
    save("engine_hum.wav", engine_hum())
    save("thunder.wav", thunder(), 0.6)
    save("distant_thunder.wav", distant_thunder(), 0.6)
    save("wheel_screech.wav", screech(2.0, rise=False), 0.4)
    save("steel_friction.wav", screech(2.2, rise=True), 0.4)
    save("brake_screech.wav", screech(2.6) + rail_clatter(2.6, 14) * 0.4, 0.5)
    save("grind_stop.wav", grind_stop(), 0.4)
    save("toggle_clicks.wav", toggles())
    save("alert_beeps.wav", beeps())
    save("alarm_chime.wav", alarm())
    save("air_hiss.wav", hiss(), 0.7)
    save("heartbeat.wav", heartbeat())
    save("whoosh.wav", whoosh(), 0.7)
    save("train_pass.wav", whoosh(2.0, 150, 3000) + rail_clatter(2.0, 10) * 0.5, 0.7)
    save("rewind.wav", rewind(), 0.5)
    save("impact.wav", impact())
    save("splash.wav", splash(), 0.7)
    save("bridge_creak.wav", creak(), 0.3)
    save("suspension_creak.wav", creak(1.8, 26) + impact(1.8) * 0.15, 0.3)
    save("sizzle.wav", sizzle(), 0.6)
    save("rail_clack.wav", rail_clatter(2.0, 2.2), 0.3)
    save("rail_fast.wav", rail_clatter(6.0, 7, accel=2.5), 0.4)
    save("door_slide.wav", door_slide(), 0.4)
    save("footsteps.wav", footsteps(), 0.3)
    save("exhale.wav", breath(1.8), 0.3)
    save("gasp.wav", gasp(), 0.2)
    save("chair_swivel.wav", swivel(), 0.3)
    save("sub_rumble.wav", sub_rumble(), 0.5)
    save("rain_drip.wav", drip(), 0.4)
    save("tension_whine.wav", tension_whine(), 0.3)
    save("throttle.wav", throttle())
    save("wiper.wav", wiper(), 0.3)
    save("reverse_roar.wav", roar(), 0.5)
    save("headlight_buzz.wav", headlight_buzz(), 0.3)
    save("ominous_wind.wav", wind(3, 40, 260), 0.5)

    # film grain tile (used at ~5% opacity, overlay blend)
    g = rng.normal(128, 48, (1080, 640)).clip(0, 255).astype(np.uint8)
    Image.fromarray(g, "L").save(os.path.join(ROOT, "grain.png"))
    print("grain.png")
