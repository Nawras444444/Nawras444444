#!/usr/bin/env python3
"""Rebuild cut-outs as solid stickers for panels where the soft mask left white blotches.

Usage: python3 fix_cuts.py PANELS_DIR ASSETS_DIR OUT_DIR id1,id2,... [--scale 2]

prep_layers.py composites semi-transparent mask pixels onto cream paper, and its sticker
border makes low-alpha holes inside the subject opaque cream. On ragged masks (hands,
skirts, broken metal) that reads as white blotches. Here the mask is thresholded low,
closed, and hole-filled, and the subject keeps the real picture pixels everywhere inside it.
Writes <id>_cut.png and <id>_bg.jpg to OUT_DIR and updates bbox/cov in a copy of meta.json.
"""
import argparse, json, os
import numpy as np
import cv2
from PIL import Image
from rembg import remove, new_session

PAPER = np.array([247, 243, 234], np.float32)
HOLE = (238, 229, 210)


def fill_holes(m, max_frac):
    """Fill gaps fully enclosed by the subject, but only small ones: a large enclosed
    region (a room seen between a door post and a figure) is background, not a hole."""
    h, w = m.shape
    n, lab, st, _ = cv2.connectedComponentsWithStats((1 - m).astype(np.uint8), 4)
    out = m.copy()
    for i in range(1, n):
        x, y, bw, bh, area = st[i]
        on_edge = x == 0 or y == 0 or x + bw == w or y + bh == h
        if not on_edge and area < max_frac * h * w:
            out[lab == i] = 1
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("panels"); ap.add_argument("assets"); ap.add_argument("out"); ap.add_argument("ids")
    ap.add_argument("--scale", type=float, default=2.0)
    ap.add_argument("--thresh", type=int, default=40)
    ap.add_argument("--minfrac", type=float, default=0.08, help="drop pieces smaller than this share of the largest")
    ap.add_argument("--holefrac", type=float, default=0.02, help="largest enclosed gap to fill, as a share of the image")
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    meta = {m["id"]: m for m in json.load(open(os.path.join(a.assets, "meta.json")))}
    sess = new_session("isnet-general-use")
    for pid in a.ids.split(","):
        im = Image.open(os.path.join(a.panels, pid + ".png")).convert("RGB")
        im2 = im.resize((round(im.width * a.scale), round(im.height * a.scale)), Image.LANCZOS)
        W, H = im2.size
        alpha = np.asarray(remove(im2, session=sess))[:, :, 3]
        m = (alpha > a.thresh).astype(np.uint8)
        k = max(9, int(min(W, H) * 0.012)) | 1
        m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k)))
        n, lab, st, _ = cv2.connectedComponentsWithStats(m, 8)
        keep = np.zeros_like(m)
        if n > 1:
            areas = st[1:, cv2.CC_STAT_AREA]
            for i, ar in enumerate(areas, 1):
                if ar > areas.max() * a.minfrac:
                    keep[lab == i] = 1
        m = fill_holes(keep, a.holefrac)
        soft = cv2.GaussianBlur(m.astype(np.float32) * 255, (5, 5), 0).astype(np.uint8)
        rgb = np.asarray(im2)
        r = max(8, int(min(W, H) * 0.013))
        sub = (m * 255).astype(np.uint8)
        border = cv2.GaussianBlur(cv2.dilate(sub, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))), (5, 5), 0)
        out = np.zeros((H, W, 4), np.uint8)
        af = (soft / 255.0)[..., None]
        out[..., :3] = (rgb * af + PAPER * (1 - af)).astype(np.uint8)
        out[..., 3] = np.maximum(soft, border)
        Image.fromarray(out).save(os.path.join(a.out, pid + "_cut.png"), optimize=True)
        fill = np.zeros((H, W, 3), np.float32); fill[:] = HOLE
        yy, xx = np.mgrid[0:H, 0:W]; sp = 16
        dots = (np.hypot((xx % sp) - sp / 2, (yy % sp) - sp / 2) < 3.4).astype(np.float32)[..., None]
        fill = fill * (1 - dots * 0.55) + np.array([26, 26, 26]) * dots * 0.55
        hole = cv2.dilate(sub, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
        mm = (cv2.GaussianBlur(hole, (7, 7), 0) / 255.0)[..., None]
        Image.fromarray((rgb * (1 - mm) + fill * mm).astype(np.uint8)).save(os.path.join(a.out, pid + "_bg.jpg"), quality=90)
        ys, xs = np.where(m > 0)
        meta[pid].update(bbox=[round(xs.min() / W, 3), round(ys.min() / H, 3), round(xs.max() / W, 3), round(ys.max() / H, 3)],
                         cov=round(float(m.mean()), 3))
        print(pid, "rebuilt", meta[pid]["cov"], flush=True)
    json.dump(list(meta.values()), open(os.path.join(a.out, "meta.json"), "w"))


if __name__ == "__main__":
    main()
