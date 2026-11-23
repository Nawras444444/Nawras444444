"""Cutouts that keep the original colours (rembg only supplies the mask). Run after prep2.py."""
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from rembg import remove, new_session
from scipy import ndimage
UP = sys.argv[1]; F = lambda h: f"{UP}/{h}-image.jpg"
S = new_session("isnet-general-use")
mask = lambda rgb: np.asarray(remove(rgb, session=S, only_mask=True))

def save(rgb, m, name, maxw, blur=1.2, erode=True):
    al = Image.fromarray((m * 255).astype(np.uint8))
    if erode: al = al.filter(ImageFilter.MinFilter(3))
    al = al.filter(ImageFilter.GaussianBlur(blur))
    out = rgb.copy(); out.putalpha(al); out = out.crop(al.point(lambda v: 255 if v > 8 else 0).getbbox())
    if out.width > maxw: out = out.resize((maxw, round(out.height * maxw / out.width)), Image.LANCZOS)
    out.save(f"assets/{name}.png", optimize=True); print(name, out.size)

def keep(m, frac):
    lab, n = ndimage.label(m); sz = ndimage.sum(m, lab, range(1, n + 1))
    return np.isin(lab, [i + 1 for i, s in enumerate(sz) if s >= frac * sz.max()])

def cut(h, name, thr=100, close=0, fill=True, frac=1.0, maxw=800):
    rgb = Image.open(F(h)).convert("RGB"); m = mask(rgb) > thr
    if close: m = ndimage.binary_closing(m, iterations=close)
    if fill: m = ndimage.binary_fill_holes(m)
    save(rgb, keep(ndimage.binary_opening(m, iterations=2), frac), name, maxw)

cut("2477b07b", "host-cat", thr=25, close=8, maxw=760)   # yellow hoodie on yellow: low threshold + closing
cut("84608740", "verified", maxw=400)
cut("08a09b39", "thumbs3d", maxw=500)
cut("e9fb7132", "statue-thumbs", maxw=700)

# Lanyard badge: colour distance from the white backdrop (keeps the metal ring), minus grey shadows
rgb = Image.open(F("3d2ef922")).convert("RGB"); a = np.asarray(rgb).astype(np.float32)
bg = np.median(np.concatenate([a[:20, :20].reshape(-1, 3), a[:20, -20:].reshape(-1, 3)]), 0)
mx, mn = a.max(-1), a.min(-1); shadow = ((mx - mn) / (mx + 1) < 0.10) & (mx > 150)
m = ((np.sqrt(((a - bg) ** 2).sum(-1)) > 38) & ~shadow) | (mask(rgb) > 100)
m[:, :150] = False; m[:, 560:] = False
lab, n = ndimage.label(ndimage.binary_opening(m, iterations=1)); sz = ndimage.sum(lab > 0, lab, range(1, n + 1))
save(rgb, np.isin(lab, [i + 1 for i, s in enumerate(sz) if s > 300]), "badge", 376, blur=0.8, erode=False)

# Calendar: rounded card + rings, header text erased (the page writes the year there)
cal = Image.open(F("b8aea911")).convert("RGB"); d = ImageDraw.Draw(cal)
red = tuple(int(v) for v in np.asarray(cal)[150:175, 300:420].reshape(-1, 3).mean(0))
d.rectangle((122, 188, 614, 266), fill=red)
mk = Image.new("L", cal.size, 0); ImageDraw.Draw(mk).rounded_rectangle((108, 115, 628, 652), radius=34, fill=255)
rings = mask(Image.open(F("b8aea911")).convert("RGB")) > 100; rings[130:] = False
save(cal, (np.asarray(mk) > 0) | rings, "calendar", 600)

# Blurred hall for the film scenes
from PIL import ImageEnhance
ImageEnhance.Brightness(Image.open("assets/bg-hall.jpg").filter(ImageFilter.GaussianBlur(9))).enhance(0.8).save("assets/bg-hall-blur.jpg", quality=88)
