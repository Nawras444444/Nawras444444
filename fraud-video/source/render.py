"""Fraud top-15 — Vox-style motion graphics renderer (1080x1920, 30 fps).

python3 render.py timing          -> print scene start times
python3 render.py still T [T...]  -> write PNG previews at global times T (seconds)
python3 render.py all             -> render video_only.mp4 (4 parallel chunks)
"""
import os, sys, math, re, random, subprocess
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont, ImageFilter

BASE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(BASE, "assets")
FONTS = os.environ.get("FONT_DIR", os.path.join(BASE, "fonts"))
VOICE = os.environ.get("VOICE", os.path.join(BASE, "voiceover.wav"))
W, H, FPS = 1080, 1920, 30
RAQM = ImageFont.Layout.RAQM

# ------------------------------------------------------------------ fonts (2 Arabic families)
_fc = {}
def F(name, size):
    k = (name, size)
    if k not in _fc:
        _fc[k] = ImageFont.truetype(os.path.join(FONTS, name + ".ttf"), size, layout_engine=RAQM)
    return _fc[k]
HEAD = lambda s: F("Cairo-900", s)
HEAD2 = lambda s: F("Cairo-800", s)
BODY = lambda s: F("Tajawal-500", s)
BODYB = lambda s: F("Tajawal-700", s)

# ------------------------------------------------------------------ palettes (3 colours each + card)
def hx(h): h = h.lstrip("#"); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
PAL = [
    dict(top=hx("#9F4209"), bot=hx("#E0E7E6"), acc=hx("#F59E0B"), card=hx("#111111")),   # copper / fog / amber
    dict(top=hx("#0D0D0D"), bot=hx("#EAE6DF"), acc=hx("#C81D25"), card=hx("#161616")),   # charcoal / cream / crimson
    dict(top=hx("#0F172A"), bot=hx("#334155"), acc=hx("#38BDF8"), card=hx("#090D16")),   # navy / slate / sky
]
WHITE = (255, 255, 255)
SOFT = (229, 231, 235)

# ------------------------------------------------------------------ content
S = [
 dict(kind="intro", voice="خمس عشرة قصة صنعت الخسارة... والنهاية لن تتوقعها."),
 dict(voice="برنارد مادوف وعد بأرباح ثابتة لا تعرف الخسارة.", ar="مادوف", person="برنارد مادوف", country="الولايات المتحدة",
      flag="us", kar="مخطط بونزي", amar="65 مليار $", year="2008", sar="150 عاماً في السجن"),
 dict(voice="شركة ألبان إيطالية عرضت رصيداً بنكياً بمليارات... لم يكن موجوداً أصلاً.", ar="بارمالات", person="كاليستو تانزي",
      country="إيطاليا", flag="it", kar="شركة ألبان إيطالية", amar="17 مليار $", year="2003", sar="الرصيد لم يكن موجوداً"),
 dict(voice="شركة اتصالات سجّلت نفقاتها كاستثمارات، فبدت أرباحها أعلى.", ar="وورلدكوم", person="برنارد إيبرز",
      country="الولايات المتحدة", flag="us", kar="أرباح مضخّمة", amar="11 مليار $", year="2002", sar="أكبر إفلاس حينها"),
 dict(voice="منصة وثق بها الملايين، وأموالهم اختفت.", ar="FTX", person="سام بانكمان-فريد", country="جزر البهاما",
      flag="bs", kar="منصة عملات رقمية", amar="8 مليار $", year="2022", sar="25 عاماً في السجن"),
 dict(voice="ملياردير أقنع المستثمرين بشهادات بعوائد مضمونة.", ar="ألين ستانفورد", person="ألين ستانفورد",
      country="الولايات المتحدة", flag="us", kar="عوائد مضمونة", amar="7 مليار $", year="2009", sar="110 أعوام في السجن"),
 dict(voice="صندوق حكومي لتنمية ماليزيا، اختفت منه مليارات عبر صفقات وهمية.", ar="1MDB", person="جو لو",
      country="ماليزيا", flag="my", kar="صندوق حكومي", amar="4.5 مليار $", year="2015", sar="المتهم ظل هارباً"),
 dict(voice="عملة رقمية باعت الوهم للملايين، بلا سلسلة كتل حقيقية.", ar="OneCoin", person="روجا إغناتوفا",
      country="بلغاريا", flag="bg", kar="عملة وهمية", amar="4 مليار $", year="2017", sar="المؤسِّسة اختفت"),
 dict(voice="رجل أعمال قدّم نفسه مستثمراً ناجحاً، وكل شيء كان مزيفاً.", ar="توم بيترز", person="توم بيترز",
      country="الولايات المتحدة", flag="us", kar="مستثمر مزيّف", amar="3.7 مليار $", year="2008", sar="50 عاماً في السجن"),
 dict(voice="عائد يومي مضمون... ثم انهار البرنامج فجأة.", ar="Bitconnect", person="ساتيش كومبهاني",
      country="الهند", flag="in", kar="عائد يومي مضمون", amar="2.4 مليار $", year="2018", sar="انهار فجأة"),
 dict(voice="شركة دفع ألمانية في مؤشر كبير، ثم اتضح أن 1.9 مليار يورو لم تكن موجودة.", ar="Wirecard", person="ماركوس براون",
      country="ألمانيا", flag="de", kar="شركة دفع ألمانية", amar="2.1 مليار $", year="2020", sar="1.9 مليار يورو مفقودة"),
 dict(voice="شركة كاميرات يابانية أخفت خسائر ضخمة لسنوات.", ar="أوليمبوس", person="مايكل وودفورد · كاشف الفضيحة",
      country="اليابان", flag="jp", kar="خسائر مخفية", amar="1.7 مليار $", year="2011", sar="أُقيل كاشف الفضيحة"),
 dict(voice="رئيس شركة برمجيات هندية اعترف في رسالة بأنه زوّر أرصدة نقدية.", ar="ساتيام", person="رامالينغا راجو",
      country="الهند", flag="in", kar="أرصدة مزوّرة", amar="1.5 مليار $", year="2009", sar="اعتراف في رسالة"),
 dict(voice="متداول شاب أخفى خسائره في حساب سري، فانهار بنك عمره أكثر من 200 عام.", ar="بنك بارينغز", person="نيك ليسون",
      country="المملكة المتحدة", flag="uk", kar="متداول شاب", amar="1.4 مليار $", year="1995", sar="انهار بنك عمره 200 عام"),
 dict(voice="شركة يابانية عملاقة ضخّمت أرباحها سنوات، ثم اعترفت بذلك.", ar="توشيبا", person="توشيبا",
      country="اليابان", flag="jp", kar="أرباح مضخّمة", amar="1.2 مليار $", year="2015", sar="اعتراف عام 2015"),
 dict(voice="رئيس تنفيذي أنفق أموال الشركة على حفلة عيد ميلاد بنحو مليوني دولار.", ar="تايكو", person="دينيس كوزلوفسكي",
      country="الولايات المتحدة", flag="us", kar="حفلة بمليوني دولار", amar="150 مليون $", year="2002", sar="النهاية: السجن"),
 dict(kind="outro", voice="اكتب القصة الأكثر صدمة في التعليقات، وتابع لتعرف الجزء الثاني."),
]
# person cutout: crop to this fraction of height (keeps stock watermarks off screen); None = use photo card
CUTCROP = {1: 1.0, 2: 1.0, 3: 0.6, 4: 1.0, 5: 0.6, 7: 1.0, 8: 1.0, 10: 1.0, 11: 1.0, 12: 0.9, 13: 1.0, 15: 0.56}
# voice sync (seconds in voiceover.wav): scene starts and the punchline moment of each story
VOICE_STARTS = [0.0, 6.80, 15.36, 22.00, 30.08, 37.28, 45.96, 55.48, 63.88, 72.28, 78.04, 85.60, 92.76, 99.04, 106.60, 114.76, 124.24]
VOICE_END = 130.6
VOICE_SHOCK = [None, 11.44, 19.72, 27.44, 33.96, 42.16, 51.88, 60.44, 69.60, 74.20, 81.12, 89.96, 94.76, 103.04, 111.24, 121.76, None]
# (hero icon, shock icon, background icon set)
ICONS = [
 (None, None, ["money_bag", "gold", "bank", "chart_down"]),
 ("chart_down", "bars", ["money_bag", "gold", "chart_up"]),
 ("bank", "eraser", ["gold", "money_bag", "warning"]),
 ("board", "chart_down", ["bar_chart", "chart_up", "folder"]),
 ("shield_crack", "bars", ["gold", "chart_down", "money_bag"]),
 ("folder", "bars", ["gold", "bank", "money_bag"]),
 ("pin", "clock", ["globe", "money_bag", "gold"]),
 ("chart_up", "warning", ["gold", "chart_up", "globe"]),
 ("money_bag", "bars", ["gold", "money_bag", "folder"]),
 ("chart_up", "chart_down", ["chart_up", "gold", "warning"]),
 ("eraser", "warning", ["money_bag", "bar_chart", "bank"]),
 ("camera_orange", "warning", ["camera_blue", "clock", "folder"]),
 ("folder", "eraser", ["bar_chart", "eraser", "board"]),
 ("bank", "clock", ["chart_down", "clock", "gold"]),
 ("bar_chart", "eraser", ["board", "bar_chart", "chart_up"]),
 ("money_bag", "bars", ["gold", "money_bag", "clock"]),
 (None, None, ["warning", "shield_ok", "camera_blue", "globe"]),
]
BGTYPES = ["split", "diagonal", "spot"]
for i, s in enumerate(S):
    s.setdefault("kind", "story")
    s["idx"] = i
    s["pal"] = PAL[[0, 1, 2][i % 3]] if s["kind"] == "story" else (PAL[0] if s["kind"] == "intro" else PAL[1])
    s["bg"] = BGTYPES[(i + i // 3) % 3] if s["kind"] == "story" else "split"
    s["hero"], s["shockicon"], s["bgicons"] = ICONS[i]

# ------------------------------------------------------------------ timing
LEAD = 0.3    # half transition length
TR = 2 * LEAD

def durations():
    if os.path.exists(VOICE):
        b = VOICE_STARTS[1:] + [VOICE_END]
        return [x - y + (0.1 if k == 0 else 0) for k, (x, y) in enumerate(zip(b, [0.1] + VOICE_STARTS[1:]))]
    out = []
    for s in S:
        if s["kind"] == "intro": out.append(4.2)
        elif s["kind"] == "outro": out.append(5.0)
        else: out.append(max(5.2, min(7.2, 2.6 + len(s["voice"]) / 17)))
    return out

def voice_durations():
    total = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", VOICE],
                                 capture_output=True, text=True).stdout)
    out = subprocess.run(["ffmpeg", "-hide_banner", "-i", VOICE, "-af", "silencedetect=noise=-38dB:d=0.25", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    st = [float(x) for x in re.findall(r"silence_start: ([0-9.]+)", out)]
    en = [float(x) for x in re.findall(r"silence_end: ([0-9.]+)", out)]
    ps = [(a + b) / 2 for a, b in zip(st, en)]
    lens = [len(s["voice"]) for s in S]
    cum = np.cumsum(lens) / sum(lens)
    b = [0.0]
    for c in cum[:-1]:
        tg = c * total
        cand = [p for p in ps if abs(p - tg) < 3.5 and p > b[-1] + 2.5]
        b.append(min(cand, key=lambda p: abs(p - tg)) if cand else tg)
    b.append(total)
    return list(np.diff(b))

def starts():
    d = durations()
    st = [0.0]
    for x in d: st.append(st[-1] + x)
    return st   # len = n+1, last = total

# ------------------------------------------------------------------ easing
def clamp(x, a=0.0, b=1.0): return max(a, min(b, x))
def e_out3(t): t = clamp(t); return 1 - (1 - t) ** 3
def e_out5(t): t = clamp(t); return 1 - (1 - t) ** 5
def e_inout(t): t = clamp(t); return 4 * t ** 3 if t < .5 else 1 - (-2 * t + 2) ** 3 / 2
def e_back(t, s=1.7): t = clamp(t) - 1; return t * t * ((s + 1) * t + s) + 1
def e_expo(t): t = clamp(t); return 1 if t >= 1 else 1 - 2 ** (-10 * t)

# ------------------------------------------------------------------ drawing helpers
def text_img(txt, fnt, fill=WHITE, rtl=True, stroke=0, stroke_fill=(0, 0, 0)):
    kw = dict(direction="rtl", language="ar") if rtl else {}
    d0 = ImageDraw.Draw(Image.new("RGBA", (4, 4)))
    b = d0.textbbox((0, 0), txt, font=fnt, stroke_width=stroke, **kw)
    asc, desc = fnt.getmetrics()
    pad = 8 + stroke
    im = Image.new("RGBA", (b[2] - b[0] + 2 * pad, asc + desc + 2 * pad), (0, 0, 0, 0))
    ImageDraw.Draw(im).text((pad - b[0], pad), txt, font=fnt, fill=fill, stroke_width=stroke, stroke_fill=stroke_fill, **kw)
    return im

def wrap_lines(txt, fnt, maxw):
    d0 = ImageDraw.Draw(Image.new("RGBA", (4, 4)))
    words, lines, cur = txt.split(), [], ""
    for w_ in words:
        t = (cur + " " + w_).strip()
        if d0.textlength(t, font=fnt, direction="rtl", language="ar") <= maxw: cur = t
        else: lines.append(cur); cur = w_
    if cur: lines.append(cur)
    return lines

def fit(im, maxw):
    if im.width <= maxw: return im
    r = maxw / im.width
    return im.resize((int(im.width * r), int(im.height * r)), Image.LANCZOS)

def scaled(im, s):
    if abs(s - 1) < 0.004: return im
    return im.resize((max(1, int(im.width * s)), max(1, int(im.height * s))), Image.BILINEAR)

def alpha_mul(im, a):
    if a >= 0.999: return im
    im = im.copy(); im.putalpha(im.getchannel("A").point(lambda v: int(v * a))); return im

def paste_c(canvas, im, cx, cy, a=1.0):
    if a <= 0.01 or im.width < 2: return
    im = alpha_mul(im, a)
    canvas.alpha_composite(im, (int(cx - im.width / 2), int(cy - im.height / 2))) if (
        cx - im.width / 2 >= 0 and cy - im.height / 2 >= 0 and cx + im.width / 2 <= W and cy + im.height / 2 <= H
    ) else canvas.paste(im, (int(cx - im.width / 2), int(cy - im.height / 2)), im)

def clip_rtl(im, p):
    """reveal from the right edge (Arabic reading direction)."""
    p = clamp(p)
    if p >= 0.999: return im
    out = im.copy(); x = int(im.width * (1 - p))
    a = np.array(out.getchannel("A")); a[:, :x] = 0
    out.putalpha(Image.fromarray(a)); return out

def shadowed(im, off=(10, 14), blur=14, op=0.45):
    a = im.getchannel("A")
    pad = blur * 2 + max(abs(off[0]), abs(off[1]))
    out = Image.new("RGBA", (im.width + 2 * pad, im.height + 2 * pad), (0, 0, 0, 0))
    sh = Image.new("RGBA", out.size, (0, 0, 0, 0))
    sa = Image.new("L", out.size, 0); sa.paste(a, (pad + off[0], pad + off[1]))
    sa = sa.filter(ImageFilter.GaussianBlur(blur)).point(lambda v: int(v * op))
    sh.putalpha(sa)
    out.alpha_composite(sh); out.alpha_composite(im, (pad, pad))
    return out

def sticker(im, border=12, color=WHITE):
    """white die-cut outline around an alpha shape (Vox paper cut-out look)."""
    a = np.array(im.getchannel("A"))
    pad = border + 4
    a2 = np.pad(a, pad)
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * border + 1, 2 * border + 1))
    dil = cv2.dilate((a2 > 100).astype(np.uint8) * 255, k)
    dil = cv2.GaussianBlur(dil, (3, 3), 0)
    out = Image.new("RGBA", (a2.shape[1], a2.shape[0]), color + (0,))
    out.putalpha(Image.fromarray(dil))
    out.alpha_composite(im, (pad, pad))
    return out

def rounded(im, r):
    m = Image.new("L", im.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, im.width - 1, im.height - 1), r, fill=255)
    out = im.convert("RGBA"); out.putalpha(Image.fromarray(np.minimum(np.array(out.getchannel("A")), np.array(m))))
    return out

def cover(im, w, h, top=False):
    r = max(w / im.width, h / im.height)
    im = im.resize((int(im.width * r + 1), int(im.height * r + 1)), Image.LANCZOS)
    x, y = (im.width - w) // 2, 0 if top else (im.height - h) // 2
    return im.crop((x, y, x + w, y + h))

def pill(w, h, fill, outline=None, ow=3, r=None):
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(im).rounded_rectangle((0, 0, w - 1, h - 1), radius=h // 2 if r is None else r, fill=fill,
                                         outline=outline, width=ow if outline else 0)
    return im

def lum(c): return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]
def on(c): return (17, 17, 17) if lum(c) > 140 else WHITE

# ------------------------------------------------------------------ textures
_grain = None
def grain(k):
    global _grain
    if _grain is None:
        rng = np.random.default_rng(7)
        _grain = []
        for _ in range(3):
            n = rng.normal(0, 1, (H // 2, W // 2)).astype(np.float32)
            n = cv2.resize(n, (W, H), interpolation=cv2.INTER_LINEAR)
            _grain.append((1 + 0.045 * n)[..., None])
    return _grain[k % 3]

_bgc = {}
def background(s):
    key = (s["bg"], s["pal"]["top"])
    if key in _bgc: return _bgc[key]
    p = s["pal"]; t, b, a = np.array(p["top"], np.float32), np.array(p["bot"], np.float32), np.array(p["acc"], np.float32)
    bw, bh = W + 120, H + 120
    yy, xx = np.mgrid[0:bh, 0:bw].astype(np.float32)
    if s["bg"] == "split":
        m = (yy > bh * 0.5).astype(np.float32)
    elif s["bg"] == "diagonal":
        m = ((xx * 0.58 + yy) > bh * 0.52 + bw * 0.29).astype(np.float32)
    else:  # spot: solid top colour with soft radial spotlight
        r = np.sqrt(((xx - bw / 2) / (bw * 0.7)) ** 2 + ((yy - bh * 0.36) / (bh * 0.42)) ** 2)
        m = np.zeros_like(xx)
    arr = t * (1 - m[..., None]) + b * m[..., None]
    if s["bg"] == "spot":
        arr = arr + (a - arr) * np.clip(0.28 - 0.28 * r, 0, 0.28)[..., None] + 26 * np.clip(1 - r, 0, 1)[..., None]
    # halftone dots on the dark half (Vox print texture)
    dots = np.zeros((bh, bw), np.float32)
    step = 26
    gy, gx = (yy % step) - step / 2, (xx % step) - step / 2
    rad = 2.0 + 3.0 * np.clip(1 - yy / (bh * 0.55), 0, 1)
    dots = (gx ** 2 + gy ** 2 < rad ** 2).astype(np.float32)
    dmask = dots * (1 - m) * 0.10
    arr = arr * (1 - dmask[..., None]) + 255 * dmask[..., None] * (1 if lum(p["top"]) < 120 else 0)
    # vignette
    v = np.sqrt(((xx - bw / 2) / (bw / 2)) ** 2 + ((yy - bh / 2) / (bh / 2)) ** 2)
    arr = arr * np.clip(1.12 - 0.28 * v, 0.7, 1)[..., None]
    _bgc[key] = np.clip(arr, 0, 255).astype(np.uint8)
    return _bgc[key]

# ------------------------------------------------------------------ flag wave
def wave(im, t, amp=9, wl=210, speed=5.0):
    a = np.array(im)
    h, w = a.shape[:2]
    pad = amp + 2
    a = np.pad(a, ((pad, pad), (0, 0), (0, 0)))
    xs = np.arange(w, dtype=np.float32)
    off = amp * np.sin(2 * np.pi * xs / wl - t * speed) * (0.35 + 0.65 * xs / w)
    mapx = np.tile(xs, (h + 2 * pad, 1))
    mapy = np.arange(h + 2 * pad, dtype=np.float32)[:, None] - off[None, :]
    out = cv2.remap(a, mapx, mapy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    shade = 1 + 0.16 * np.cos(2 * np.pi * xs / wl - t * speed)
    out[..., :3] = np.clip(out[..., :3] * shade[None, :, None], 0, 255)
    return Image.fromarray(out.astype(np.uint8), "RGBA")

# ------------------------------------------------------------------ scene layers
_lc = {}
def layers(s):
    i = s["idx"]
    if i in _lc: return _lc[i]
    p = s["pal"]; L = {}
    acc, card = p["acc"], p["card"]
    if s["kind"] == "story":
        # map card (white border photo, kept un-rotated here; rotated per frame)
        mp = os.path.join(ASSETS, f"{i:02d}_map.png")
        L["map_src"] = Image.open(mp).convert("RGB")
        # flag
        fl = Image.open(os.path.join(ASSETS, f"flag_{s['flag']}.png")).convert("RGBA")
        full_bleed = np.array(fl.getchannel("A")).min() > 250
        fw = 330
        fl = fl.resize((fw, int(fl.height * fw / fl.width)), Image.LANCZOS)
        if full_bleed:
            fl = rounded(fl, 18)
            b = Image.new("RGBA", (fl.width + 20, fl.height + 20), (0, 0, 0, 0))
            ImageDraw.Draw(b).rounded_rectangle((0, 0, b.width - 1, b.height - 1), 24, fill=WHITE + (255,))
            b.alpha_composite(fl, (10, 10)); fl = b
        else:
            fl = sticker(fl, 9)
        L["flag"] = fl
        # person
        if i in CUTCROP:
            c = Image.open(os.path.join(ASSETS, f"{i:02d}_cut.png")).convert("RGBA")
            c = c.crop((0, 0, c.width, int(c.height * CUTCROP[i])))
            r = min(700 / c.height, 720 / c.width)
            c = c.resize((int(c.width * r), int(c.height * r)), Image.LANCZOS)
            L["person"] = shadowed(sticker(c, 12), (14, 18), 16, 0.5)
            L["person_cut"] = True
        else:
            ph = Image.open(os.path.join(ASSETS, f"{i:02d}_photo.png")).convert("RGB")
            ph = cover(ph, 500, 560 if ph.height >= ph.width * 0.9 else 400, top=True)
            fr = Image.new("RGBA", (ph.width + 28, ph.height + 28), WHITE + (255,))
            fr.paste(ph, (14, 14))
            # tape strip
            tp = Image.new("RGBA", (170, 46), acc + (215,))
            fr2 = Image.new("RGBA", (fr.width, fr.height + 30), (0, 0, 0, 0)); fr2.alpha_composite(fr, (0, 30))
            fr2.alpha_composite(tp.rotate(4, expand=True, resample=Image.BICUBIC), (fr.width // 2 - 90, 4))
            L["person"] = shadowed(fr2.rotate(3, expand=True, resample=Image.BICUBIC), (14, 18), 16, 0.5)
            L["person_cut"] = False
        # name callout + country tag
        L["name"] = pill_text(s["person"], HEAD2(36), WHITE + (255,), (17, 17, 17), pad=26, h=68)
        L["country"] = pill_text(s["country"], HEAD2(34), card + (235,), WHITE, pad=24, h=64, outline=acc + (255,), dot=acc)
        # info card
        cw, ch = 960, 470
        cardim = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
        ImageDraw.Draw(cardim).rounded_rectangle((0, 0, cw - 1, ch - 1), 32, fill=card + (246,), outline=acc + (255,), width=4)
        L["card"] = shadowed(cardim, (0, 16), 22, 0.45)
        L["year"] = pill_text(s["year"], HEAD(40), acc + (255,), on(acc), pad=30, h=70)
        L["title"] = fit(text_img(s["ar"], HEAD(108), WHITE, rtl=not s["ar"].isascii()), 880)
        L["hook"] = fit(text_img(s["kar"], HEAD2(46), acc), 880)
        lines = wrap_lines(s["voice"], BODY(36), 860)
        L["body"] = [text_img(ln, BODY(36), SOFT) for ln in lines[:3]]
        L["shock"] = stamp(s["sar"], acc)
    elif s["kind"] == "intro":
        L["faces"] = face_grid(acc)
        cw, ch = 960, 560
        cardim = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
        ImageDraw.Draw(cardim).rounded_rectangle((0, 0, cw - 1, ch - 1), 32, fill=card + (248,), outline=acc + (255,), width=4)
        L["card"] = shadowed(cardim, (0, 16), 22, 0.45)
        L["badge"] = pill_text("قصص حقيقية", HEAD2(34), acc + (255,), on(acc), pad=30, h=64)
        L["t1"] = fit(text_img("أكبر 15 احتيال مالي", HEAD(98), WHITE), 880)
        L["t2"] = fit(text_img("في التاريخ", HEAD(98), acc), 880)
        L["p"] = [text_img(ln, BODY(38), SOFT) for ln in wrap_lines(s["voice"], BODY(38), 840)]
    else:
        L["faces"] = face_grid(acc, small=True)
        cw, ch = 960, 600
        cardim = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
        ImageDraw.Draw(cardim).rounded_rectangle((0, 0, cw - 1, ch - 1), 32, fill=card + (248,), outline=acc + (255,), width=4)
        L["card"] = shadowed(cardim, (0, 16), 22, 0.45)
        L["t1"] = fit(text_img("أي قصة صدمتك؟", HEAD(104), WHITE), 880)
        L["c1"] = pill_text("اكتبها في التعليقات", HEAD2(44), acc + (255,), on(acc), pad=44, h=96)
        L["c2"] = pill_text("تابع للجزء الثاني", HEAD2(44), (0, 0, 0, 0), WHITE, pad=44, h=96, outline=WHITE + (255,))
        L["p"] = [text_img(ln, BODY(36), SOFT) for ln in wrap_lines(s["voice"], BODY(36), 820)]
    _lc[i] = L
    return L

def pill_text(txt, fnt, fill, color, pad=24, h=64, outline=None, dot=None):
    t = text_img(txt, fnt, color)
    extra = 34 if dot else 0
    w = t.width + 2 * pad + extra
    im = pill(w, h, fill, outline, 3)
    im.alpha_composite(t, (w - pad - t.width, (h - t.height) // 2 + 2))
    if dot:
        d = ImageDraw.Draw(im); cx = pad + 8
        d.ellipse((cx - 9, h // 2 - 9, cx + 9, h // 2 + 9), fill=dot + (255,))
    return im

def stamp(txt, acc):
    t = text_img(txt, HEAD(64), on(acc))
    t = fit(t, 820)
    w, h = t.width + 80, t.height + 40
    im = Image.new("RGBA", (w + 16, h + 16), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, w + 15, h + 15), 22, fill=WHITE + (255,))
    d.rounded_rectangle((8, 8, w + 7, h + 7), 16, fill=acc + (255,))
    im.alpha_composite(t, (8 + (w - t.width) // 2, 8 + (h - t.height) // 2))
    return shadowed(im.rotate(-5, expand=True, resample=Image.BICUBIC), (10, 16), 16, 0.5)

def face_grid(acc, small=False):
    faces = []
    for i in range(1, 16):
        if i in CUTCROP:
            c = Image.open(os.path.join(ASSETS, f"{i:02d}_cut.png")).convert("RGBA")
        else:
            c = Image.open(os.path.join(ASSETS, f"{i:02d}_photo.png")).convert("RGBA")
        sz = 150 if small else 170
        side = min(c.width, c.height)
        c = c.crop(((c.width - side) // 2, 0, (c.width - side) // 2 + side, side)).resize((sz, sz), Image.LANCZOS)
        bgc = Image.new("RGBA", (sz, sz), (245, 245, 245, 255))
        bgc.alpha_composite(c)
        m = Image.new("L", (sz, sz), 0); ImageDraw.Draw(m).ellipse((0, 0, sz - 1, sz - 1), fill=255)
        bgc.putalpha(m)
        ring = Image.new("RGBA", (sz + 16, sz + 16), (0, 0, 0, 0))
        ImageDraw.Draw(ring).ellipse((0, 0, sz + 15, sz + 15), fill=WHITE + (255,))
        ring.alpha_composite(bgc, (8, 8))
        faces.append(shadowed(ring, (6, 10), 10, 0.4))
    return faces

# ------------------------------------------------------------------ 3D icons
_ic = {}
def icon(name, size, rot=0.0):
    k = (name, size, round(rot, 1))
    if k not in _ic:
        im = Image.open(os.path.join(ASSETS, "icons", name + ".png")).convert("RGBA")
        r = size / max(im.size)
        im = im.resize((max(1, int(im.width * r)), max(1, int(im.height * r))), Image.LANCZOS)
        if rot: im = im.rotate(rot, expand=True, resample=Image.BICUBIC)
        _ic[k] = im
    return _ic[k]

_wall = {}
def wallpaper(s):
    """two parallax layers of themed 3D icons scattered behind the scene."""
    i = s["idx"]
    if i in _wall: return _wall[i]
    rnd = random.Random(i * 97 + 3)
    names = s["bgicons"]
    layers_ = []
    for depth, (n_cols, n_rows, smin, smax, op, blur) in enumerate(((5, 9, 80, 120, 0.30, 0), (3, 5, 150, 210, 0.42, 3))):
        lay = Image.new("RGBA", (W + 200, H + 520), (0, 0, 0, 0))
        cw, ch = lay.width / n_cols, lay.height / n_rows
        k = 0
        for r in range(n_rows):
            for c in range(n_cols):
                if rnd.random() < 0.18: continue
                nm = names[k % len(names)]; k += 1
                im = icon(nm, int(rnd.uniform(smin, smax)), rot=rnd.uniform(-28, 28))
                x = int((c + 0.5 + (0.5 if r % 2 else 0)) * cw + rnd.uniform(-cw * .2, cw * .2) - im.width / 2) % lay.width
                y = int((r + 0.5) * ch + rnd.uniform(-ch * .2, ch * .2) - im.height / 2)
                lay.alpha_composite(im, (min(max(0, x), lay.width - im.width), min(max(0, y), lay.height - im.height)))
        if blur: lay = lay.filter(ImageFilter.GaussianBlur(blur))
        lay.putalpha(lay.getchannel("A").point(lambda v, op=op: int(v * op)))
        layers_.append(lay)
    _wall[i] = layers_
    return layers_

def shock_time(s, D):
    v = VOICE_SHOCK[s["idx"]]
    if os.path.exists(VOICE) and v is not None:
        return v - VOICE_STARTS[s["idx"]] + LEAD - 0.05
    return 0.55 * D

# ------------------------------------------------------------------ scene frame
HEADPOS = {}
def scene_frame(s, t, D, gk=0):
    """s: scene, t: local time (s), D: nominal scene length. returns RGB uint8 array."""
    p = s["pal"]; L = layers(s); acc = p["acc"]
    bg = background(s)
    u = t / max(D, 1)
    ox = int(60 + 50 * math.sin(u * math.pi - math.pi / 2)); oy = int(60 + 50 * math.sin(u * 2.0))
    fr = Image.fromarray(bg[oy:oy + H, ox:ox + W]).convert("RGBA")

    # themed icon wallpaper (parallax, drifts upward, fades in)
    wa = clamp(t / 0.6)
    for depth, lay in enumerate(wallpaper(s)):
        sp = (22, 48)[depth]
        yo = -int(min(500, 60 + sp * t)); xo = -100 + int((14, -24)[depth] * math.sin(t * 0.5))
        piece = lay.crop((-xo, -yo, -xo + W, -yo + H))
        fr.alpha_composite(alpha_mul(piece, wa))

    # floating accent shapes (Vox geometric confetti)
    d = ImageDraw.Draw(fr)
    rnd = random.Random(s["idx"] * 31 + 5)
    for k in range(12):
        x0, y0, r0, ph = rnd.uniform(60, W - 60), rnd.uniform(150, 1050), rnd.uniform(8, 18), rnd.uniform(0, 6.3)
        x = x0 + 16 * math.sin(t * 0.9 + ph); y = y0 - 22 * t % 60 + 10 * math.cos(t * 1.1 + ph)
        sc = e_back((t - 0.3 - k * 0.05) / 0.4)
        if sc <= 0: continue
        r = r0 * sc
        col = acc + (200,) if k % 2 == 0 else WHITE + (150,)
        if k % 3 == 0: d.ellipse((x - r, y - r, x + r, y + r), outline=col, width=4)
        elif k % 3 == 1: d.line((x - r, y, x + r, y), fill=col, width=5); d.line((x, y - r, x, y + r), fill=col, width=5)
        else: d.rectangle((x - r * .7, y - r * .7, x + r * .7, y + r * .7), fill=col)

    if s["kind"] == "story":
        story_layers(fr, s, L, t, D, acc)
    elif s["kind"] == "intro":
        intro_layers(fr, s, L, t, D, acc)
    else:
        outro_layers(fr, s, L, t, D, acc)

    arr = np.asarray(fr.convert("RGB")).astype(np.float32)
    arr = arr * grain(gk)
    if s["kind"] == "story":
        ts = t - shock_time(s, D)
        if 0 <= ts < 0.3:                      # shock glitch
            arr = glitch(arr, (1 - ts / 0.3), seed=int(ts * 100) + s["idx"])
    if s["kind"] == "outro":
        arr = arr * clamp((D + LEAD - t) / 0.6)
    return np.clip(arr, 0, 255).astype(np.uint8)

def story_layers(fr, s, L, t, D, acc):
    i = s["idx"]
    shock_t = shock_time(s, D)
    ts = t - shock_t
    shake = (10 * math.sin(ts * 60) * math.exp(-ts * 7), 8 * math.cos(ts * 47) * math.exp(-ts * 7)) if ts > 0 else (0, 0)

    # --- map card: Ken Burns inside a white frame, zooms in (transition #5 Zoom)
    me = e_out5((t - 0.12) / 0.7)
    if me > 0:
        mw, mh = 520, 400
        src = L["map_src"]
        z = 1.0 + 0.10 * clamp(t / (D + 0.5))
        sw, sh = src.width / z, src.height / z
        cx, cy = src.width / 2, src.height / 2
        crop = src.crop((int(cx - sw / 2), int(cy - sh / 2), int(cx + sw / 2), int(cy + sh / 2)))
        m = cover(crop, mw, mh)
        card = Image.new("RGBA", (mw + 28, mh + 28), WHITE + (255,)); card.paste(m, (14, 14))
        card = card.rotate(-5 + 2 * (1 - me), expand=True, resample=Image.BICUBIC)
        card = shadowed(card, (10, 14), 14, 0.45)
        paste_c(fr, scaled(card, 1.45 - 0.45 * me), 315 + shake[0], 520 + shake[1], clamp((t - 0.12) / 0.25))
        # country tag pill (wipe from right, transition #6 Wipe)

    # --- flag: waving, wipes in (clip from right) with small drop
    fe = e_out3((t - 0.35) / 0.5)
    if fe > 0:
        fl = wave(L["flag"], t, amp=8 if L["flag"].getchannel("A").getextrema()[0] < 200 else 6)
        fl = fl.rotate(6, expand=True, resample=Image.BICUBIC)
        paste_c(fr, clip_rtl(fl, fe), 790 + shake[0] * .6, 360 - 40 * (1 - fe) + 6 * math.sin(t * 1.6), 1)

    # --- person rises from behind the card (transition #2 Rise)
    pe = e_back((t - 0.45) / 0.6, 1.4)
    if pe > 0:
        per = L["person"]
        br = 1 + 0.012 * math.sin(t * 2.0)
        pim = scaled(per, (0.9 + 0.1 * pe) * br)
        bottom = 1150 + 40
        cx = 600
        cy = bottom - pim.height / 2 + 260 * (1 - pe) + 6 * math.sin(t * 1.3)
        paste_c(fr, pim, cx + shake[0] * 1.2, cy + shake[1], clamp((t - 0.45) / 0.15))
        HEADPOS[i] = (cx, bottom - pim.height + 60)

    # hero 3D icon pops on the right, floats
    if s["hero"]:
        ie = e_back((t - 0.9) / 0.5, 2.2)
        if ie > 0:
            hi = icon(s["hero"], 250, rot=round(4 * math.sin(t * 1.4)))
            paste_c(fr, scaled(hi, ie), 905 + shake[0], 780 + 12 * math.sin(t * 1.8) + shake[1])

    # country tag pill (wipe from right)
    ce = e_out3((t - 0.65) / 0.45)
    if ce > 0: paste_c(fr, clip_rtl(L["country"], ce), max(L["country"].width / 2 + 40, 250), 790, 1)

    # --- name callout: line + label (Vox annotation); leaves when the stamp lands
    ne = e_out3((t - 1.0) / 0.5) * (1 - clamp(ts / 0.15) if ts > 0 else 1)
    if ne > 0 and L["person_cut"]:
        hx_, hy_ = HEADPOS.get(i, (600, 520))
        tx, ty = 250, 940
        d = ImageDraw.Draw(fr)
        ex = tx + (hx_ - 140 - tx) * ne; ey = ty + (hy_ + 120 - ty) * ne
        d.line((tx, ty, ex, ey), fill=WHITE + (255,), width=4)
        d.ellipse((ex - 9, ey - 9, ex + 9, ey + 9), fill=acc + (255,), outline=WHITE + (255,), width=3)
        nm = L["name"]
        paste_c(fr, clip_rtl(nm, ne), max(nm.width / 2 + 30, tx), ty + 46, 1)
    elif ne > 0:
        nm = L["name"]
        paste_c(fr, clip_rtl(nm, ne), 600, 1060, 1)

    # --- info card slides up
    ce = e_out5((t - 0.2) / 0.6)
    cy0 = 1360
    paste_c(fr, L["card"], 540, cy0 + 520 * (1 - ce), clamp((t - 0.2) / 0.2))
    top = cy0 - 235
    # year badge pops on the card edge
    ye = e_back((t - 0.6) / 0.4, 2.0)
    if ye > 0: paste_c(fr, scaled(L["year"], max(0.01, ye)), 540, top + 520 * (1 - ce))
    # title: blur reveal (transition #9)
    te = clamp((t - 0.7) / 0.5)
    if te > 0:
        ti = L["title"]
        if te < 1: ti = ti.filter(ImageFilter.GaussianBlur(14 * (1 - e_out3(te))))
        paste_c(fr, scaled(ti, 1.12 - 0.12 * e_out3(te)), 540, top + 115, e_out3(te))
    # hook keyword: wipe from right
    he = e_out3((t - 1.0) / 0.45)
    if he > 0: paste_c(fr, clip_rtl(L["hook"], he), 540, top + 205, 1)
    # amount: highlighter sweep + counter
    ae = clamp((t - 1.25) / 0.9)
    if ae > 0: draw_amount(fr, s, acc, s["pal"]["card"], ae, 540, top + 300)
    # body text: typewriter, line by line from the right
    bp = clamp((t - 1.7) / 1.6)
    if bp > 0:
        lines = L["body"]
        tot = sum(l.width for l in lines); done = bp * tot; y = top + 385
        for ln in lines:
            pr = clamp(done / ln.width); done -= ln.width
            if pr > 0: paste_c(fr, clip_rtl(ln, pr), 540, y, 1)
            y += 48

    # --- shock stamp slams in
    if ts > 0:
        se = e_back(ts / 0.35, 1.6)
        st = L["shock"]
        paste_c(fr, scaled(st, 2.2 - 1.2 * se), 540 + shake[0], 930 + shake[1], clamp(ts / 0.12))
        if s["shockicon"]:
            ie = e_back((ts - 0.12) / 0.4, 2.4)
            if ie > 0:
                si = icon(s["shockicon"], 240, rot=-8)
                paste_c(fr, scaled(si, ie), 185 + shake[0] * 1.5, 700 + 8 * math.sin(t * 2.2) + shake[1])

def draw_amount(fr, s, acc, card, ae, cx, cy):
    txt = s["amar"]
    m = re.match(r"([\d.]+)(.*)", txt)
    val, rest = float(m.group(1)), m.group(2)
    dec = len(m.group(1).split(".")[1]) if "." in m.group(1) else 0
    ce = e_out3(clamp((ae - 0.15) / 0.85))
    shown = f"{val * ce:.{dec}f}{rest}"
    full = text_img(txt, HEAD(96), on(acc))
    ti = text_img(shown, HEAD(96), on(acc))
    bw, bh = full.width + 70, 112
    me = e_out5(ae / 0.45)
    bar = Image.new("RGBA", (bw, bh), (0, 0, 0, 0))
    ImageDraw.Draw(bar).rounded_rectangle((0, 0, bw - 1, bh - 1), 14, fill=acc + (255,))
    bar = clip_rtl(bar, me).rotate(-1.5, expand=True, resample=Image.BICUBIC)
    paste_c(fr, bar, cx, cy)
    if ae > 0.15: paste_c(fr, ti, cx, cy + 2, clamp((ae - 0.15) / 0.15))

def intro_layers(fr, s, L, t, D, acc):
    faces = L["faces"]
    for k, f in enumerate(faces):
        r_, c_ = k // 5, k % 5
        x = 140 + c_ * 200 + (40 if r_ % 2 else 0) - 20
        y = 330 + r_ * 210
        e = e_back((t - 0.15 - k * 0.06) / 0.45, 2.0)
        if e <= 0: continue
        paste_c(fr, scaled(f, e), x, y + 8 * math.sin(t * 2 + k), 1)
    ce = e_out5((t - 0.3) / 0.6)
    cy = 1330
    paste_c(fr, L["card"], 540, cy + 560 * (1 - ce))
    top = cy - 280 + 560 * (1 - ce)
    be = e_back((t - 0.7) / 0.4, 2)
    if be > 0: paste_c(fr, scaled(L["badge"], be), 540, top)
    for key, y, dl in (("t1", 120, 0.85), ("t2", 235, 1.05)):
        e = clamp((t - dl) / 0.5)
        if e > 0:
            im = L[key].filter(ImageFilter.GaussianBlur(12 * (1 - e_out3(e)))) if e < 1 else L[key]
            paste_c(fr, im, 540, top + y + 30 * (1 - e_out3(e)), e_out3(e))
    pe = clamp((t - 1.5) / 1.2)
    y = top + 360
    tot = sum(l.width for l in L["p"]); done = pe * tot
    for ln in L["p"]:
        pr = clamp(done / ln.width); done -= ln.width
        if pr > 0: paste_c(fr, clip_rtl(ln, pr), 540, y)
        y += 54

def outro_layers(fr, s, L, t, D, acc):
    faces = L["faces"]
    for k, f in enumerate(faces):
        a = 2 * math.pi * k / 15 + t * 0.35
        R = 360
        x = 540 + R * math.cos(a); y = 600 + R * 0.72 * math.sin(a)
        e = e_back((t - 0.1 - k * 0.04) / 0.4, 2)
        if e <= 0: continue
        paste_c(fr, scaled(f, e * (0.8 + 0.2 * (math.sin(a) + 1) / 2)), x, y)
    q = text_img("؟", HEAD(260), acc)
    qe = e_back((t - 0.5) / 0.5, 2.4)
    if qe > 0: paste_c(fr, scaled(q, qe * (1 + 0.05 * math.sin(t * 5))), 540, 600)
    ce = e_out5((t - 0.3) / 0.6)
    cy = 1340
    paste_c(fr, L["card"], 540, cy + 600 * (1 - ce))
    top = cy - 300 + 600 * (1 - ce)
    e = clamp((t - 0.7) / 0.5)
    if e > 0: paste_c(fr, L["t1"], 540, top + 110 + 30 * (1 - e_out3(e)), e_out3(e))
    y = top + 215
    for ln in L["p"]:
        pe = e_out3((t - 1.0) / 0.5)
        paste_c(fr, ln, 540, y, pe); y += 50
    for key, yy, dl in (("c1", 400, 1.4), ("c2", 515, 1.65)):
        e = e_back((t - dl) / 0.45, 1.8)
        if e > 0:
            pulse = 1 + (0.04 * math.sin((t - dl) * 6) if key == "c1" and t > dl + 0.5 else 0)
            paste_c(fr, scaled(L[key], max(0.01, e) * pulse), 540, top + yy)

# ------------------------------------------------------------------ effects & transitions
def glitch(arr, k, seed=0):
    rng = np.random.default_rng(seed)
    out = arr.copy()
    sh = int(18 * k) + 2
    out[..., 0] = np.roll(arr[..., 0], sh, axis=1)
    out[..., 2] = np.roll(arr[..., 2], -sh, axis=1)
    for _ in range(int(10 * k) + 2):
        y = rng.integers(0, H - 60); hh = rng.integers(10, 70)
        out[y:y + hh] = np.roll(out[y:y + hh], rng.integers(-60, 60), axis=1)
    return out

def tr_bands(A, B, p, pal):
    base = A if p < 0.5 else B
    im = Image.fromarray(base).convert("RGBA")
    d = ImageDraw.Draw(im)
    slant = 500; bw = W + slant + 40
    cols = [pal["top"], pal["acc"], pal["bot"] if lum(pal["bot"]) < 200 else WHITE]
    for k, c in enumerate(cols):
        e = e_inout(clamp((p - k * 0.1) / 0.8))
        x = (W + slant) * (1 - 2 * e)        # +W -> -W   (right to left)
        poly = [(x + slant, 0), (x + slant + bw, 0), (x + bw, H), (x, H)]
        poly = [(px - slant / 2 - 20, py) for px, py in poly]
        d.polygon(poly, fill=c + (255,))
    return np.asarray(im.convert("RGB"))

def tr_circle(A, B, p, pal, c=(540, 900)):
    e = e_inout(p)
    R = e * math.hypot(W, H) * 0.75
    m = np.zeros((H, W), np.uint8); cv2.circle(m, c, int(R), 255, -1)
    out = np.where(m[..., None] > 0, B, A)
    if 0 < R < 2000:
        cv2.circle(out, c, int(R), pal["acc"], 22)
        cv2.circle(out, c, int(R) + 11, (255, 255, 255), 6)
    return out

def tr_push(A, B, p, pal):
    e = e_inout(p); dy = int(H * e)
    out = np.empty_like(A)
    out[:H - dy] = A[dy:]; out[H - dy:] = B[:dy]
    y = H - dy
    out[max(0, y - 12):min(H, y + 12)] = pal["acc"]
    return out

def tr_zoom(A, B, p, pal):
    e = e_inout(p)
    if p < 0.5:
        s = 1 + 1.2 * e_inout(p * 2) ** 2
        img = A; a = 1.0
    else:
        s = 1.35 - 0.35 * e_out3((p - 0.5) * 2)
        img = B
    M = cv2.getRotationMatrix2D((W / 2, H * 0.45), 0, s)
    z = cv2.warpAffine(img, M, (W, H), borderMode=cv2.BORDER_REFLECT)
    k = 1 - abs(p - 0.5) * 2
    if k > 0:
        z = cv2.addWeighted(z, 1 - 0.75 * k, np.full_like(z, 255), 0.75 * k, 0)
    return z

def tr_diag(A, B, p, pal):
    e = e_inout(p)
    yy, xx = np.mgrid[0:H, 0:W]
    v = (W - xx) * 0.6 + yy             # top-right -> bottom-left
    th = e * (W * 0.6 + H + 80) - 40
    out = np.where((v < th)[..., None], B, A)
    edge = (np.abs(v - th) < 18)
    out[edge] = pal["acc"]
    return out

def tr_glitch(A, B, p, pal):
    base = (A if p < 0.5 else B).astype(np.float32)
    k = 1 - abs(p - 0.5) * 2
    g = glitch(base, k, seed=int(p * 1000))
    if k > 0.6:
        g = 255 - g if k > 0.85 else g
    return np.clip(g, 0, 255).astype(np.uint8)

def tr_fx(img, p, pal, seed):
    """Vox-style motion lines and flying shapes layered over every transition."""
    k = 1 - abs(p - 0.5) * 2
    if k <= 0.02: return img
    im = Image.fromarray(img).convert("RGBA")
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    rnd = random.Random(seed)
    cols = [pal["acc"], WHITE, pal["top"] if lum(pal["top"]) > 40 else pal["acc"]]
    dirn = 1 if seed % 2 else -1
    # speed lines
    for n in range(16):
        y = rnd.uniform(80, H - 80); ln = rnd.uniform(240, 820); th = rnd.uniform(4, 16)
        sp = rnd.uniform(0.8, 1.6)
        x = (W + ln) * (0.5 + dirn * (p - 0.5) * 2.2 * sp) - ln
        c = cols[n % 3]
        d.rounded_rectangle((x, y, x + ln, y + th), radius=int(th / 2), fill=c + (int(230 * k),))
    # ring burst from the centre
    R = 80 + 1100 * e_out3(p)
    d.ellipse((540 - R, 900 - R, 540 + R, 900 + R), outline=pal["acc"] + (int(255 * k),), width=int(10 + 26 * k))
    R2 = R * 0.62
    d.ellipse((540 - R2, 900 - R2, 540 + R2, 900 + R2), outline=WHITE + (int(200 * k),), width=6)
    # flying triangles, plus signs and squares
    for n in range(12):
        a = rnd.uniform(0, 2 * math.pi); dist = 120 + 900 * e_out3(p) * rnd.uniform(0.6, 1.2)
        cx, cy = 540 + dist * math.cos(a), 900 + dist * math.sin(a)
        r = rnd.uniform(18, 42) * (0.5 + k); rot = a + p * 6
        c = cols[n % 3] + (int(255 * k),)
        if n % 3 == 0:
            pts = [(cx + r * math.cos(rot + q * 2.094), cy + r * math.sin(rot + q * 2.094)) for q in range(3)]
            d.polygon(pts, fill=c)
        elif n % 3 == 1:
            for q in (0, 1.5708):
                d.line((cx - r * math.cos(rot + q), cy - r * math.sin(rot + q), cx + r * math.cos(rot + q), cy + r * math.sin(rot + q)), fill=c, width=9)
        else:
            pts = [(cx + r * .8 * math.cos(rot + q * 1.5708 + .785), cy + r * .8 * math.sin(rot + q * 1.5708 + .785)) for q in range(4)]
            d.polygon(pts, outline=c, width=6)
    im.alpha_composite(ov)
    return np.asarray(im.convert("RGB"))

TRANS = [tr_bands, tr_circle, tr_push, tr_zoom, tr_diag, tr_glitch]

# ------------------------------------------------------------------ global frame
def frame_at(T, st):
    n = len(S)
    i = max(k for k in range(n) if st[k] <= T + 1e-9)
    i = min(i, n - 1)
    gk = int(T * FPS) // 2
    D = lambda k: st[k + 1] - st[k]
    loc = lambda k: T - st[k] + LEAD
    # in a transition window?
    if i + 1 < n and T >= st[i + 1] - LEAD:
        j = i + 1
    elif i >= 1 and T < st[i] + LEAD:
        j = i; i = i - 1
    else:
        return scene_frame(S[i], loc(i), D(i), gk)
    p = (T - (st[j] - LEAD)) / TR
    A = scene_frame(S[i], loc(i), D(i), gk)
    B = scene_frame(S[j], loc(j), D(j), gk)
    out = TRANS[(j - 1) % len(TRANS)](A, B, clamp(p), S[j]["pal"])
    return tr_fx(out, clamp(p), S[j]["pal"], j)

def render_range(a, b, out):
    st = starts()
    ff = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
                           "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "18",
                           "-pix_fmt", "yuv420p", out], stdin=subprocess.PIPE)
    for f in range(a, b):
        ff.stdin.write(frame_at(f / FPS, st).tobytes())
        if (f - a) % 150 == 0: print(f"[{out[-12:]}] {f - a}/{b - a}", flush=True)
    ff.stdin.close(); return ff.wait()

def _job(args): return render_range(*args)

if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "timing":
        st = starts(); print([round(x, 2) for x in st])
    elif cmd == "still":
        st = starts()
        for x in sys.argv[2:]:
            Image.fromarray(frame_at(float(x), st)).save(os.path.join(BASE, "previews", f"still_{float(x):06.2f}.png"))
    elif cmd == "all":
        from multiprocessing import Pool
        st = starts(); N = int(round(st[-1] * FPS))
        os.makedirs(os.path.join(BASE, "chunks"), exist_ok=True)
        k = int(os.environ.get("JOBS", "4"))
        cuts = [N * c // k for c in range(k + 1)]
        jobs = [(cuts[c], cuts[c + 1], os.path.join(BASE, "chunks", f"c{c}.mp4")) for c in range(k)]
        with Pool(k) as pool:
            print(pool.map(_job, jobs))
        with open(os.path.join(BASE, "chunks", "list.txt"), "w") as f:
            for _, _, o in jobs: f.write(f"file '{o}'\n")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i",
                        os.path.join(BASE, "chunks", "list.txt"), "-c", "copy", os.path.join(BASE, "video_only.mp4")], check=True)
        print("video_only.mp4", N, "frames")
