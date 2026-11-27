#!/usr/bin/env python3
"""Cut the figure out of a poster image.

usage: make_mask.py POSTER.jpg OUT_DIR [--cut-y 740]

Writes OUT_DIR/figure_mask.png (RGBA, figure only, full-poster frame).
Works best when the poster is a flat graphic on a solid background.
Orange ink inside the face is kept; the background, title text and
footer are removed. Requires: rembg (u2net model), opencv-python-headless, numpy, Pillow.
"""
import argparse, os
import cv2, numpy as np
from PIL import Image
from rembg import remove, new_session

ap = argparse.ArgumentParser()
ap.add_argument("poster"); ap.add_argument("out_dir")
ap.add_argument("--cut-y", type=int, default=740, help="flat cut-off row (title block starts here)")
ap.add_argument("--face-xy", type=int, nargs=2, default=None, help="x y of a point inside the face (default: centre)")
a = ap.parse_args()
os.makedirs(a.out_dir, exist_ok=True)

src_im = Image.open(a.poster).convert("RGB")
W, H = src_im.size
src = np.array(src_im).astype(int)
rgba = np.array(remove(src_im, session=new_session("u2net")))
alpha = rgba[..., 3]
R, G, B = src[..., 0], src[..., 1], src[..., 2]
orange = (R > 190) & (G > 60) & (G < 150) & (B < 90)

fx, fy = a.face_xy or (W // 2, int(H * 0.45))
m = ((alpha > 128) & ~orange).astype(np.uint8)
_, lab = cv2.connectedComponents(m)
keep = (lab == lab[fy, fx]).astype(np.uint8) if lab[fy, fx] > 0 else m
keep = cv2.morphologyEx(keep, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))

# put back the orange ink that sits inside the face band
ys, xs = np.mgrid[0:H, 0:W]
face = (alpha > 128) & orange & (ys < H * 0.43) & (xs > W * 0.27) & (xs < W * 0.71)
keep = np.maximum(keep, face.astype(np.uint8))
keep[a.cut_y:, :] = 0

out = np.dstack([src.astype(np.uint8), (keep * 255).astype(np.uint8)])
Image.fromarray(out, "RGBA").save(os.path.join(a.out_dir, "figure_mask.png"))
print("mask written, kept pixels:", int(keep.sum()), "size:", W, H)
