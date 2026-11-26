#!/usr/bin/env python3
"""Render "The Phone That Rang From the Past" — 9:16 animated story video.

Frames are drawn with PIL/numpy (sub-pixel Ken Burns, phone vibration, red glow,
memory tint, film grain, word-by-word captions) and piped to ffmpeg.
Audio: voiceover + music (starting at 10 s into the track, boosted) + synthesized SFX.

Usage: python3 render.py <assets_dir> <out_dir>
"""
import json, math, os, subprocess, sys
from multiprocessing import Pool

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ASSETS = sys.argv[1] if len(sys.argv) > 1 else "."
OUT = sys.argv[2] if len(sys.argv) > 2 else "."
W, H, FPS = 1080, 1920, 30
TOTAL = 43.5
VOICE_OFFSET = 1.0
RED = np.array([224, 36, 43], np.float32)

IMG = {
    "desk": "8ad812a6-image.png",
    "box": "12240291-image.png",
    "number": "5c72f120-image.png",
    "bed": "0d4a50d8-image.png",
    "date": "58de54d8-image.png",
    "stare": "56b92ba6-image.png",
    "writing": "910c5534-image.png",
    "grid": "121fe698-image.png",
}
FONT_CAP = "/usr/share/fonts/truetype/crosextra/Caladea-Bold.ttf"
FONT_MONO = "/usr/share/fonts/truetype/jetbrains-mono/JetBrainsMono-Bold.ttf"

# ---------------------------------------------------------------- sources
def load_sources():
    src = {}
    for k, f in IMG.items():
        if k == "grid":
            continue
        src[k] = Image.open(os.path.join(ASSETS, f)).convert("RGB")
    g = Image.open(os.path.join(ASSETS, IMG["grid"])).convert("RGB")
    cols = [(12, 316), (330, 624), (645, 928)]
    rows = [(11, 546), (567, 1097), (1117, 1658)]
    n = 1
    for (y0, y1) in rows:
        for (x0, x1) in cols:
            p = g.crop((x0, y0, x1, y1))
            p = p.resize((p.width * 3, p.height * 3), Image.LANCZOS)
            p = p.filter(ImageFilter.UnsharpMask(radius=2, percent=90, threshold=2))
            src[f"p{n}"] = p
            n += 1
    return src

# ---------------------------------------------------------------- timeline
# (start, end, source, zoom_from, zoom_to, focus(x,y in source px, or None), memory, transition)
SHOTS = [
    (0.0, 6.4, "desk", 1.04, 1.18, (500, 1150), False, "black"),
    (6.4, 10.6, "number", 1.05, 1.20, (450, 700), False, "xf"),
    (10.6, 14.2, "p6", 1.04, 1.14, (470, 700), True, "flash"),
    (14.2, 16.6, "bed", 1.04, 1.16, (470, 470), False, "xf"),
    (16.6, 19.4, "p1", 1.05, 1.15, (420, 1150), True, "flash"),
    (19.4, 21.4, "p7", 1.05, 1.13, (500, 900), True, "xf"),
    (21.4, 23.9, "box", 1.04, 1.20, (470, 1050), False, "xf"),
    (23.9, 26.4, "p5", 1.05, 1.15, (500, 900), True, "flash"),
    (26.4, 28.4, "p4", 1.05, 1.14, (420, 700), True, "xf"),
    (28.4, 31.0, "date", 1.04, 1.22, (480, 560), False, "flash"),
    (31.0, 33.3, "stare", 1.05, 1.15, (560, 700), False, "xf"),
    (33.3, 35.6, "writing", 1.04, 1.12, (470, 800), False, "xf"),
    (35.8, 39.0, "p9", 1.04, 1.30, (585, 590), True, "black"),
    (39.0, TOTAL, "title", 1.0, 1.0, None, False, "xf"),
]
XF = 0.35

# phone vibration windows (also drive the buzz SFX)
BUZZ = [(0.4, 6.2, 7.0), (6.4, 7.6, 3.0), (31.0, 33.2, 7.0)]
BUZZ_ON, BUZZ_OFF = 0.9, 0.45
# red glow spots: (start, end, source, x, y, radius)
GLOWS = [
    (0.0, 6.6, "desk", 505, 1150, 160),
    (6.4, 10.8, "number", 680, 1050, 150),
    (28.4, 31.2, "date", 470, 520, 260),
    (31.0, 33.5, "stare", 630, 1245, 170),
]
GLITCH = (35.1, 35.6)

def buzz_amp(t):
    for a, b, amp in BUZZ:
        if a <= t < b:
            ph = (t - a) % (BUZZ_ON + BUZZ_OFF)
            if ph < BUZZ_ON:
                env = min(1.0, ph / 0.05, (BUZZ_ON - ph) / 0.05)
                return amp * env
    return 0.0

def smooth(x):
    x = min(max(x, 0.0), 1.0)
    return x * x * (3 - 2 * x)

# ---------------------------------------------------------------- captions
FIX = {"yusuf": "Youssef", "yusuf,": "Youssef,", "3am,": "3 a.m.,", "3am": "3 a.m."}

def build_captions(segs):
    words = []
    for s in segs:
        ws = [(w["word"].strip(), w["start"], w["end"]) for w in s["words"]]
        i = 0
        while i < len(ws):
            txt, a, b = ws[i]
            if txt.lower() == "a" and i + 1 < len(ws) and ws[i + 1][0].lower().startswith("mean"):
                nxt = ws[i + 1][0]
                txt = "Amin" + nxt[4:]
                b = ws[i + 1][2]
                i += 1
            txt = FIX.get(txt.lower(), txt)
            words.append([txt, a + VOICE_OFFSET, b + VOICE_OFFSET])
            i += 1
    chunks, cur = [], []
    for w in words:
        cur.append(w)
        if len(cur) >= 4 or (w[0][-1] in ",.?!" and len(cur) >= 2):
            chunks.append(cur)
            cur = []
    if cur:
        chunks.append(cur)
    out = []
    for i, c in enumerate(chunks):
        a = c[0][1] - 0.05
        b = c[-1][2] + 0.45
        if i + 1 < len(chunks):
            b = min(b, chunks[i + 1][0][1] - 0.05)
        out.append((a, b, c))
    a, b, c = out[-1]
    out[-1] = (a, GLITCH[0], c)  # let "Not yet." hang until the line dies
    return out

# ---------------------------------------------------------------- render helpers
def shot_transform(src_img, t, shot, shake):
    s0, s1, key, z0, z1, focus, _, _ = shot
    w, h = src_img.size
    k = smooth((t - s0) / max(0.01, (s1 - s0)))
    zoom = z0 + (z1 - z0) * k
    if shake:
        zoom += 0.02
    scale = max(W / w, H / h) * zoom
    cx, cy = w / 2, h / 2
    if focus:
        cx += (focus[0] - cx) * k * 0.85
        cy += (focus[1] - cy) * k * 0.85
    hw, hh = W / 2 / scale, H / 2 / scale
    cx = min(max(cx, hw + 2), w - hw - 2)
    cy = min(max(cy, hh + 2), h - hh - 2)
    ang, dx, dy = 0.0, 0.0, 0.0
    if shake:
        ang = math.radians(0.35 * shake / 7.0) * math.sin(2 * math.pi * 23 * t)
        dx = shake * math.sin(2 * math.pi * 31 * t)
        dy = shake * 0.5 * math.cos(2 * math.pi * 27 * t)
    ca, sa = math.cos(ang), math.sin(ang)
    # output (x,y) -> input: p_in = c + R^-1 ((p_out - o - d) / scale)
    a = ca / scale; b = sa / scale
    d_ = -sa / scale; e = ca / scale
    ox, oy = W / 2 + dx, H / 2 + dy
    c = cx - a * ox - b * oy
    f = cy - d_ * ox - e * oy
    img = src_img.transform((W, H), Image.AFFINE, (a, b, c, d_, e, f), resample=Image.BICUBIC)

    def fwd(px, py):  # source -> output (approx, ignoring rotation)
        return (px - cx) * scale + ox, (py - cy) * scale + oy
    return img, fwd, scale

_GLOW_CACHE = {}
def glow_sprite(r):
    if r not in _GLOW_CACHE:
        y, x = np.mgrid[-2 * r:2 * r, -2 * r:2 * r].astype(np.float32)
        _GLOW_CACHE[r] = np.exp(-(x * x + y * y) / (2 * (r * 0.6) ** 2))
    return _GLOW_CACHE[r]

def add_sprite(arr, spr, x, y, color, strength):
    sh, sw = spr.shape
    x0, y0 = int(x - sw / 2), int(y - sh / 2)
    xa, ya = max(0, x0), max(0, y0)
    xb, yb = min(W, x0 + sw), min(H, y0 + sh)
    if xa >= xb or ya >= yb:
        return
    s = spr[ya - y0:yb - y0, xa - x0:xb - x0][..., None]
    reg = arr[ya:yb, xa:xb]
    # screen blend toward red
    arr[ya:yb, xa:xb] = reg + (color - reg * 0.35) * s * strength

def memory_grade(arr):
    lum = arr.mean(axis=2, keepdims=True)
    redmask = np.clip((arr[..., 0:1] - arr[..., 1:2] - 40) / 60, 0, 1)
    sep = np.concatenate([lum * 1.02 + 10, lum * 0.95 + 6, lum * 0.82], axis=2)
    out = sep * (1 - redmask) + arr * redmask
    return out * 0.94 + 14  # lifted blacks, faded print

def vignette_mask():
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    nx, ny = (x - W / 2) / (W / 2), (y - H / 2) / (H / 2)
    d = np.sqrt(nx * nx * 1.0 + ny * ny * 0.8)
    return np.clip(1.0 - 0.55 * np.clip(d - 0.45, 0, None) ** 1.6, 0.35, 1)[..., None]

# ---------------------------------------------------------------- worker state
G = {}

def init_worker(caps):
    G["src"] = load_sources()
    G["caps"] = caps
    G["vig"] = vignette_mask()
    rng = np.random.default_rng(7)
    G["grain"] = rng.normal(0, 1, (H + 64, W + 64)).astype(np.float32)
    G["fcap"] = ImageFont.truetype(FONT_CAP, 70)
    G["fcap_small"] = ImageFont.truetype(FONT_CAP, 58)
    G["fmono"] = ImageFont.truetype(FONT_MONO, 150)
    G["ftitle"] = ImageFont.truetype(FONT_CAP, 112)
    G["fsub"] = ImageFont.truetype(FONT_CAP, 44)
    # title-card paper: the writing image, washed out
    wr = G["src"]["writing"].resize((W, H), Image.LANCZOS)
    paper = np.asarray(wr, np.float32)
    G["paper"] = 255 - (255 - paper) * 0.16

def render_shot(i, t):
    shot = SHOTS[i]
    key = shot[2]
    if key == "title":
        return title_card(t - shot[0])
    shake = buzz_amp(t)
    img, fwd, scale = shot_transform(G["src"][key], t, shot, shake)
    arr = np.asarray(img, np.float32).copy()
    for (a, b, gk, gx, gy, r) in GLOWS:
        if gk == key and a <= t < b:
            ox, oy = fwd(gx, gy)
            pulse = 0.35 + 0.35 * (0.5 + 0.5 * math.sin(2 * math.pi * 1.6 * t))
            rr = int(r * scale / 1.15 / 10) * 10 or 10
            add_sprite(arr, glow_sprite(rr), ox, oy, RED, pulse)
    if shot[6]:
        arr = memory_grade(arr)
    return arr

def title_card(lt):
    arr = G["paper"].copy()
    im = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    d = ImageDraw.Draw(im)
    lines = ["THE PHONE", "THAT RANG", "FROM THE PAST"]
    y = 640
    for j, ln in enumerate(lines):
        a = smooth((lt - 0.4 - j * 0.45) / 0.6)
        if a > 0:
            col = (224, 36, 43) if j == 2 else (17, 17, 17)
            tw = d.textlength(ln, font=G["ftitle"])
            layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
            ImageDraw.Draw(layer).text(((W - tw) / 2, y + (1 - a) * 30), ln, font=G["ftitle"], fill=col + (int(255 * a),))
            im.paste(layer, (0, 0), layer)
        y += 135
    # red line drawing across
    p = smooth((lt - 1.8) / 1.2)
    if p > 0:
        x0, x1 = 170, 170 + (910 - 170) * p
        d.line([(x0, 1100), (x1, 1088)], fill=(224, 36, 43), width=9)
    a = smooth((lt - 2.6) / 0.8)
    if a > 0:
        txt = "a story in ink"
        tw = d.textlength(txt, font=G["fsub"])
        layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
        ImageDraw.Draw(layer).text(((W - tw) / 2, 1140), txt, font=G["fsub"], fill=(60, 60, 60, int(255 * a)))
        im.paste(layer, (0, 0), layer)
    return np.asarray(im, np.float32).copy()

def draw_overlays(arr, t):
    im = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    d = ImageDraw.Draw(im, "RGBA")
    # 03:00 typed clock
    if 1.0 <= t < 6.2:
        txt = "03:00"
        n = min(len(txt), int((t - 1.0) / 0.14) + 1)
        a = 1.0 - smooth((t - 5.7) / 0.5)
        shown = txt[:n]
        tw = d.textlength(txt, font=G["fmono"])
        x = (W - tw) / 2
        d.text((x + 4, 214), shown, font=G["fmono"], fill=(0, 0, 0, int(160 * a)))
        d.text((x, 210), shown, font=G["fmono"], fill=(224, 36, 43, int(255 * a)))
        if n == len(txt) and int(t * 2.5) % 2 == 0:
            cx = x + d.textlength(shown, font=G["fmono"]) + 10
            d.rectangle([cx, 240, cx + 14, 370], fill=(224, 36, 43, int(255 * a)))
    # captions
    for (a, b, words) in G["caps"]:
        if a <= t < b:
            alpha = min(1.0, (t - a) / 0.12, (b - t) / 0.12)
            font = G["fcap"]
            parts = [w[0] for w in words]
            space = d.textlength(" ", font=font)
            widths = [d.textlength(p, font=font) for p in parts]
            total = sum(widths) + space * (len(parts) - 1)
            if total > 960:
                font = G["fcap_small"]
                space = d.textlength(" ", font=font)
                widths = [d.textlength(p, font=font) for p in parts]
                total = sum(widths) + space * (len(parts) - 1)
            x = (W - total) / 2
            y = 1520
            pad = 26
            d.rounded_rectangle([x - pad, y - 18, x + total + pad, y + 96], radius=18,
                                fill=(10, 10, 10, int(150 * alpha)))
            for (p, wd, wobj) in zip(parts, widths, words):
                active = wobj[1] - 0.02 <= t
                col = (224, 36, 43) if (wobj[1] - 0.02 <= t < wobj[2] + 0.08) else (245, 241, 232)
                if not active:
                    col = (245, 241, 232)
                    al = int(110 * alpha)
                else:
                    al = int(255 * alpha)
                d.text((x, y), p, font=font, fill=col + (al,), stroke_width=3, stroke_fill=(0, 0, 0, al))
                x += wd + space
    return np.asarray(im, np.float32)

def glitch(arr, t, fi):
    rng = np.random.default_rng(fi)
    out = arr.copy()
    for _ in range(9):
        y0 = rng.integers(0, H - 80); hh = rng.integers(10, 90); sh = rng.integers(-120, 120)
        out[y0:y0 + hh] = np.roll(out[y0:y0 + hh], sh, axis=1)
    out[..., 0] = np.roll(out[..., 0], 12, axis=1)
    out[..., 2] = np.roll(out[..., 2], -12, axis=1)
    return out * (0.7 + 0.3 * rng.random())

def frame(fi):
    t = fi / FPS
    idx = [i for i, s in enumerate(SHOTS) if s[0] <= t < s[1] + 1e-6]
    if not idx:
        arr = np.zeros((H, W, 3), np.float32)
    else:
        i = idx[-1]
        arr = render_shot(i, t)
        s = SHOTS[i]
        lt = t - s[0]
        if s[7] == "black":
            arr = arr * smooth(lt / 0.8)
        elif s[7] in ("xf", "flash") and i > 0 and lt < XF:
            prev = render_shot(i - 1, t)
            k = smooth(lt / XF)
            arr = prev * (1 - k) + arr * k
            if s[7] == "flash":
                arr = arr + (255 - arr) * 0.55 * math.sin(math.pi * k)
    if SHOTS[-1][0] > t:
        if GLITCH[0] <= t < GLITCH[1]:
            arr = glitch(arr, t, fi)
        elif GLITCH[1] <= t < SHOTS[-2][0]:
            arr = arr * 0.0
    # end fade
    arr = arr * (1 - smooth((t - (TOTAL - 1.2)) / 1.2))
    # lamp flicker + vignette + grain
    if t < SHOTS[-1][0]:
        flick = 1 + 0.015 * math.sin(t * 17.0) * math.sin(t * 5.3)
        arr = arr * flick * G["vig"]
    ox, oy = (fi * 37) % 64, (fi * 53) % 64
    arr = arr + G["grain"][oy:oy + H, ox:ox + W][..., None] * 7.0
    arr = draw_overlays(arr, t)
    return np.clip(arr, 0, 255).astype(np.uint8).tobytes()

# ---------------------------------------------------------------- audio
def make_sfx(path, sr=48000):
    n = int(TOTAL * sr)
    t = np.arange(n) / sr
    out = np.zeros(n, np.float32)
    # phone buzz: 160 Hz motor + harmonics, gated like the visual shake
    env = np.array([buzz_amp(x) for x in t[::48]], np.float32)
    env = np.repeat(env, 48)[:n] / 7.0
    motor = (np.sin(2 * np.pi * 158 * t) + 0.5 * np.sign(np.sin(2 * np.pi * 158 * t)) * 0.4
             + 0.3 * np.sin(2 * np.pi * 316 * t)) * (0.8 + 0.2 * np.sin(2 * np.pi * 9 * t))
    out += 0.32 * motor * env
    # "line went dead" busy tone: three beeps
    for k in range(3):
        a = GLITCH[0] + 0.15 + k * 0.42
        m = (t >= a) & (t < a + 0.22)
        out[m] += 0.22 * (np.sin(2 * np.pi * 480 * t[m]) + np.sin(2 * np.pi * 620 * t[m])) / 2
    # glitch static
    m = (t >= GLITCH[0]) & (t < GLITCH[1])
    out[m] += np.random.default_rng(1).normal(0, 0.08, m.sum()).astype(np.float32)
    # low boom on title + soft one on the date reveal
    for (a, amp) in [(SHOTS[-1][0] + 0.4, 0.6), (28.4, 0.35), (35.8, 0.4)]:
        m = t >= a
        tt = t[m] - a
        out[m] += amp * np.sin(2 * np.pi * (48 + 20 * np.exp(-tt * 6)) * tt) * np.exp(-tt * 2.2)
    out = np.clip(out, -1, 1)
    import wave
    with wave.open(path, "wb") as wf:
        wf.setnchannels(1); wf.setsampwidth(2); wf.setframerate(sr)
        wf.writeframes((out * 32767).astype(np.int16).tobytes())

def main():
    os.makedirs(OUT, exist_ok=True)
    segs = json.load(open(os.path.join(OUT, "segs.json")))
    caps = build_captions(segs)
    for a, b, c in caps:
        print(f"{a:6.2f}-{b:6.2f}  {' '.join(w[0] for w in c)}")
    nframes = int(TOTAL * FPS)
    video = os.path.join(OUT, "video_only.mp4")
    if os.environ.get("MUX_ONLY") and os.path.exists(video):
        nframes = 0
    ff = None if nframes == 0 else subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
                           "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium",
                           "-crf", "19", "-pix_fmt", "yuv420p", video], stdin=subprocess.PIPE)
    with Pool(os.cpu_count(), initializer=init_worker, initargs=(caps,)) as pool:
        for k, buf in enumerate(pool.imap(frame, range(nframes), chunksize=4)):
            ff.stdin.write(buf)
            if k % 150 == 0:
                print(f"frame {k}/{nframes}", flush=True)
    if ff:
        ff.stdin.close(); ff.wait()

    sfx = os.path.join(OUT, "sfx.wav")
    make_sfx(sfx)
    voice = os.path.join(ASSETS, "e29e2e7c-Generated_Audio_November_26_2026_-_5_52PM.wav")
    music = os.path.join(ASSETS, "5dc6c25f-2023-04-11_-_Contact_With_The_Unknown_-_www.FesliyanStudios.com.mp3")
    final = os.path.join(OUT, "the_phone_that_rang_from_the_past.mp4")
    d = int(VOICE_OFFSET * 1000)
    fc = (
        f"[1:a]aresample=48000,aformat=channel_layouts=stereo,loudnorm=I=-15:TP=-2:LRA=9,adelay={d},apad,atrim=0:{TOTAL},asplit=2[v][vsc];"
        f"[2:a]aresample=48000,aformat=channel_layouts=stereo,loudnorm=I=-16:TP=-2,afade=t=in:st=0:d=0.4,"
        f"afade=t=out:st={TOTAL-3.5}:d=3.5,atrim=0:{TOTAL}[m];"
        f"[m][vsc]sidechaincompress=threshold=0.06:ratio=2.5:attack=20:release=400:makeup=1[md];"
        f"[3:a]aresample=48000,aformat=channel_layouts=stereo,volume=1.0[s];"
        f"[v][md][s]amix=inputs=3:normalize=0:duration=first,"
        f"loudnorm=I=-13:TP=-1.2:LRA=11,aresample=48000,aformat=channel_layouts=stereo[a]"
    )
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", video, "-i", voice,
                    "-ss", "10", "-t", str(TOTAL), "-i", music, "-i", sfx,
                    "-filter_complex", fc, "-map", "0:v", "-map", "[a]", "-c:v", "libx264", "-preset", "slow",
                    "-crf", "23", "-maxrate", "12M", "-bufsize", "24M", "-pix_fmt", "yuv420p",
                    "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-movflags", "+faststart",
                    "-shortest", final], check=True)
    print("done:", final)

if __name__ == "__main__":
    main()
