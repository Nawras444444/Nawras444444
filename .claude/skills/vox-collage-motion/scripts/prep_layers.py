#!/usr/bin/env python3
"""Build the two motion layers for every panel: a cut-out subject and a background plate.

Usage:
  python3 prep_layers.py PANELS_DIR ASSETS_DIR [--scale 2] [--model isnet-general-use]

For each PANELS_DIR/<id>.png (order from PANELS_DIR/list.json, else alphabetical):
  ASSETS_DIR/<id>_cut.png  subject with a white paper-sticker border (RGBA), only when a subject is found
  ASSETS_DIR/<id>_bg.jpg   the panel with the subject's spot filled by cream paper + halftone dots,
                           so when the cut-out moves it reveals "the paper under the collage"
  ASSETS_DIR/meta.json     [{id, w, h, cut, bbox, cov}]

Needs: pip install rembg opencv-python-headless  (first run downloads the ~180 MB model).
A panel counts as having a subject when the mask covers 3%-70% of it; otherwise
only the plate is written and the template animates the plate + graphics alone.
"""
import argparse, glob, json, os
import numpy as np
import cv2
from PIL import Image
from rembg import remove, new_session

PAPER = np.array([247, 243, 234], np.float32)
HOLE = (238, 229, 210)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("panels"); ap.add_argument("assets")
    ap.add_argument("--scale", type=float, default=2.0, help="upscale factor before cutting (sharper on 1080p)")
    ap.add_argument("--model", default="isnet-general-use")
    a = ap.parse_args()
    os.makedirs(a.assets, exist_ok=True)
    lst = os.path.join(a.panels, "list.json")
    ids = json.load(open(lst)) if os.path.exists(lst) else sorted(os.path.splitext(os.path.basename(p))[0] for p in glob.glob(os.path.join(a.panels, "*.png")))
    sess = new_session(a.model)
    meta = []
    for pid in ids:
        im = Image.open(os.path.join(a.panels, pid + ".png")).convert("RGB")
        im2 = im.resize((round(im.width * a.scale), round(im.height * a.scale)), Image.LANCZOS)
        W, H = im2.size
        alpha = np.asarray(remove(im2, session=sess))[:, :, 3].copy()
        m = (alpha > 128).astype(np.uint8)
        n, lab, st, _ = cv2.connectedComponentsWithStats(m, 8)
        keep = np.zeros_like(m)
        if n > 1:  # drop specks: keep components >= 8% of the largest
            areas = st[1:, cv2.CC_STAT_AREA]
            for i, ar in enumerate(areas, 1):
                if ar > areas.max() * 0.08:
                    keep[lab == i] = 1
        alpha = (alpha * keep).astype(np.uint8)
        cov = float((alpha > 128).mean())
        rgb = np.asarray(im2)
        has = 0.03 <= cov <= 0.7
        bbox = [0.2, 0.25, 0.8, 0.75]
        if has:
            r = max(8, int(min(W, H) * 0.013))
            sub = (alpha > 100).astype(np.uint8) * 255
            border = cv2.GaussianBlur(cv2.dilate(sub, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))), (5, 5), 0)
            out = np.zeros((H, W, 4), np.uint8)
            af = (alpha / 255.0)[..., None]
            out[..., :3] = (rgb * af + PAPER * (1 - af)).astype(np.uint8)
            out[..., 3] = np.maximum(alpha, border)
            Image.fromarray(out).save(os.path.join(a.assets, pid + "_cut.png"), optimize=True)
            # paper hole: cream + halftone dots where the subject was
            fill = np.zeros((H, W, 3), np.float32); fill[:] = HOLE
            yy, xx = np.mgrid[0:H, 0:W]; sp = 16
            dots = (np.hypot((xx % sp) - sp / 2, (yy % sp) - sp / 2) < 3.4).astype(np.float32)[..., None]
            fill = fill * (1 - dots * 0.55) + np.array([26, 26, 26]) * dots * 0.55
            hole = cv2.dilate(sub, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
            mm = (cv2.GaussianBlur(hole, (7, 7), 0) / 255.0)[..., None]
            bg = (rgb * (1 - mm) + fill * mm).astype(np.uint8)
            ys, xs = np.where(alpha > 128)
            bbox = [xs.min() / W, ys.min() / H, xs.max() / W, ys.max() / H]
        else:
            bg = rgb
        Image.fromarray(bg).save(os.path.join(a.assets, pid + "_bg.jpg"), quality=90)
        meta.append({"id": pid, "w": W, "h": H, "cut": has, "bbox": [round(v, 3) for v in bbox], "cov": round(cov, 3)})
        print(pid, "subject" if has else "plate-only", round(cov, 2), flush=True)
    json.dump(meta, open(os.path.join(a.assets, "meta.json"), "w"))


if __name__ == "__main__":
    main()
