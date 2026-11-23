"""Second pass: new hall/curtain/stage backgrounds, cat host, icons and stickers."""
import json, sys
import numpy as np
from PIL import Image, ImageDraw
from rembg import remove, new_session

UP = sys.argv[1]; OUT = "assets"
F = lambda h: f"{UP}/{h}-image.jpg"
S = new_session("isnet-general-use")
meta = {}

def cover(src, name, w=1080, h=1920, q=90):
    im = Image.open(src).convert("RGB"); r = max(w / im.width, h / im.height)
    im = im.resize((round(im.width * r), round(im.height * r)), Image.LANCZOS)
    x, y = (im.width - w) // 2, (im.height - h) // 2
    im.crop((x, y, x + w, y + h)).save(f"{OUT}/{name}.jpg", quality=q)

def cut(src, name, box=None, maxw=900):
    im = Image.open(src).convert("RGB")
    if box: im = im.crop(box)
    out = remove(im, session=S); bb = out.getchannel("A").point(lambda v: 255 if v > 10 else 0).getbbox()
    out = out.crop(bb)
    if out.width > maxw: out = out.resize((maxw, round(out.height * maxw / out.width)), Image.LANCZOS)
    out.save(f"{OUT}/{name}.png", optimize=True); print(name, out.size); return bb, out.size

def ink(src, name, white=True, box=None):  # black line art on white -> white line art with alpha
    g = np.asarray(Image.open(src).convert("L").crop(box) if box else Image.open(src).convert("L")).astype(np.float32)
    a = np.clip((235 - g) / 150, 0, 1) * 255
    rgba = np.zeros(g.shape + (4,), np.uint8); rgba[..., :3] = 255 if white else 0; rgba[..., 3] = a
    im = Image.fromarray(rgba); im = im.crop(im.getchannel("A").getbbox()); im.save(f"{OUT}/{name}.png", optimize=True); print(name, im.size)

def card(src, name, box, w):
    im = Image.open(src).convert("RGB").crop(box); im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    im.save(f"{OUT}/{name}.jpg", quality=90); print(name, im.size)

# Backgrounds
cover(F("31143362"), "bg-hall"); cover(F("fd635fc8"), "bg-question"); cover(F("60b82afe"), "bg-projector")
cover(F("ada24af6"), "bg-tv"); cover(F("653a36b6"), "bg-stage")
c = Image.open(F("723b4ddb")).convert("RGB"); c.resize((round(c.width * 1920 / c.height), 1920), Image.LANCZOS).save(f"{OUT}/curtain.jpg", quality=90)

# Icons
ink(F("f2ff7a73"), "arrow"); ink(F("e62cf67e"), "bubble-line")
sp = np.asarray(Image.open(F("4d1e6a90")).convert("L").crop((168, 128, 568, 528))).astype(np.float32)
rgba = np.zeros(sp.shape + (4,), np.uint8); rgba[..., :3] = 255; rgba[..., 3] = np.clip((sp - 12) / 220, 0, 1) * 255
Image.fromarray(rgba).save(f"{OUT}/spinner.png", optimize=True)
nb = np.asarray(Image.open(F("4a35cd77")).convert("RGB").crop((160, 0, 580, 1110))).astype(np.float32)
a = np.clip((nb.max(-1) - 70) / 140, 0, 1); rgba = np.dstack([nb, a * 255]).astype(np.uint8)
Image.fromarray(rgba).save(f"{OUT}/neon.png", optimize=True)

# Stickers (kept with their own backgrounds, shown as framed cards)
card(F("e6d45578"), "st-pointing", (0, 0, 736, 900), 460)
card(F("3de102ce"), "st-statue3d", (40, 520, 700, 1200), 460)
card(F("dcd9f7c5"), "st-ghost", (90, 0, 690, 960), 420)
card(F("ec721a45"), "st-phone", (20, 170, 736, 1060), 520)
