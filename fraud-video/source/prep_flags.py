"""Flags: cut light backgrounds off waving-flag images, crop full-bleed fabric flags,
and draw the two missing ones (Germany, Malaysia). Writes ./assets/flag_<cc>.png"""
import os, sys, math
import numpy as np, cv2
from PIL import Image, ImageDraw

RAW = sys.argv[1]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets")

def load(i):
    return np.array(Image.open(f"{RAW}/p{i:03d}.jpg").convert("RGB"))

from rembg import remove, new_session
_S = new_session("u2net")
def cut_light_bg(rgb, tol=0):
    im = remove(Image.fromarray(rgb), session=_S, post_process_mask=True)
    return im.crop(im.getbbox())
def _old_cut(rgb, tol=26):
    h, w = rgb.shape[:2]
    mask = np.zeros((h + 2, w + 2), np.uint8)
    flags = 4 | cv2.FLOODFILL_MASK_ONLY | (255 << 8)
    for x in range(0, w, 4):
        for y in (0, h - 1):
            if mask[y + 1, x + 1] == 0:
                cv2.floodFill(rgb.copy(), mask, (x, y), 0, (tol,) * 3, (tol,) * 3, flags)
    for y in range(0, h, 4):
        for x in (0, w - 1):
            if mask[y + 1, x + 1] == 0:
                cv2.floodFill(rgb.copy(), mask, (x, y), 0, (tol,) * 3, (tol,) * 3, flags)
    al = np.where(mask[1:-1, 1:-1] > 0, 0, 255).astype(np.uint8)
    nlab, lab, st, _ = cv2.connectedComponentsWithStats((al > 0).astype(np.uint8))
    if nlab > 1:
        k = 1 + np.argmax(st[1:, cv2.CC_STAT_AREA]); al = np.where(lab == k, 255, 0).astype(np.uint8)
    al = cv2.morphologyEx(al, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
    al = cv2.GaussianBlur(cv2.erode(al, np.ones((3, 3), np.uint8)), (3, 3), 0)
    im = Image.fromarray(np.dstack([rgb, al]), "RGBA")
    return im.crop(im.getbbox())

def crop_full(rgb, box=None):
    im = Image.fromarray(rgb)
    if box: im = im.crop(box)
    w, h = im.size; tw = min(w, int(h * 1.5)); th = int(tw / 1.5)
    im = im.crop(((w - tw) // 2, (h - th) // 2, (w - tw) // 2 + tw, (h - th) // 2 + th))
    return im.convert("RGBA")

def star(cx, cy, r1, r2, n, rot=-math.pi / 2):
    pts = []
    for k in range(2 * n):
        r = r1 if k % 2 == 0 else r2
        a = rot + k * math.pi / n
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts

def tricolor(cols, vertical=False):
    im = Image.new("RGBA", (600, 400)); d = ImageDraw.Draw(im)
    for k, c in enumerate(cols):
        d.rectangle((k * 200, 0, (k + 1) * 200, 400) if vertical else (0, k * 133, 600, (k + 1) * 134), fill=c + (255,))
    return im

def germany():
    im = Image.new("RGBA", (600, 360)); d = ImageDraw.Draw(im)
    for k, c in enumerate([(0, 0, 0), (221, 0, 0), (255, 206, 0)]):
        d.rectangle((0, k * 120, 600, (k + 1) * 120), fill=c + (255,))
    return im

def malaysia():
    W, H = 600, 300; im = Image.new("RGBA", (W, H)); d = ImageDraw.Draw(im)
    sh = H / 14
    for k in range(14):
        d.rectangle((0, k * sh, W, (k + 1) * sh), fill=(204, 0, 1, 255) if k % 2 == 0 else (255, 255, 255, 255))
    cw, ch = W / 2, sh * 8
    d.rectangle((0, 0, cw, ch), fill=(1, 0, 102, 255))
    cy = ch / 2; r = ch * 0.38
    d.ellipse((cw * 0.36 - r, cy - r, cw * 0.36 + r, cy + r), fill=(255, 204, 0, 255))
    r2 = r * 0.86
    d.ellipse((cw * 0.43 - r2, cy - r2, cw * 0.43 + r2, cy + r2), fill=(1, 0, 102, 255))
    d.polygon(star(cw * 0.72, cy, r * 0.75, r * 0.32, 14), fill=(255, 204, 0, 255))
    return im

os.makedirs(OUT, exist_ok=True)
cut_light_bg(load(36)).save(f"{OUT}/flag_us.png")
tricolor([(0,146,70),(255,255,255),(206,43,55)], vertical=True).save(f"{OUT}/flag_it.png")
cut_light_bg(load(5), tol=40).save(f"{OUT}/flag_uk.png")
crop_full(load(28)).save(f"{OUT}/flag_bs.png")
crop_full(load(20), (0, 0, int(load(20).shape[1] * 0.56), load(20).shape[0])).save(f"{OUT}/flag_bg.png")
crop_full(load(15)).save(f"{OUT}/flag_in.png")
crop_full(load(3)).save(f"{OUT}/flag_jp.png")
germany().save(f"{OUT}/flag_de.png")
malaysia().save(f"{OUT}/flag_my.png")
# extra map images
Image.fromarray(load(9)).save(f"{OUT}/11_map.png")
print("flags ok")
