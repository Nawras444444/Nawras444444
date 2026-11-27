#!/usr/bin/env python3
"""Measure text-wrap shapes for the four columns from the figure mask.

usage: measure_shapes.py figure_mask.png shapes.json [--stage 900 1204]

The stage is 900 x H. Columns are 182 px wide at x = 57, 253, 459, 661 and
span y = 67..697. Columns 0-1 wrap around the figure on their right side;
columns 2-3 on their left. Output is a JSON list of CSS polygon() strings
to paste into the page as shape-outside.
"""
import argparse, json
import numpy as np
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument("mask"); ap.add_argument("out")
ap.add_argument("--stage", type=int, nargs=2, default=[900, 1204])
ap.add_argument("--pad", type=int, default=10)
a = ap.parse_args()
SW, SH = a.stage
alpha = np.array(Image.open(a.mask).split()[3].resize((SW, SH))) > 128
COLS = [57, 253, 459, 661]; W = 182; TOP = 67; HH = 630
shapes = []
for i, cx in enumerate(COLS):
    pts = []
    for y in range(0, HH + 1, 10):
        idx = np.where(alpha[TOP + y, cx:cx + W])[0]
        if i < 2:
            x = (idx.min() - a.pad) if len(idx) else W
        else:
            x = (idx.max() + a.pad) if len(idx) else 0
        pts.append((max(0, min(W, x)), y))
    poly = [(W, 0)] + pts + [(W, HH)] if i < 2 else [(0, 0)] + pts + [(0, HH)]
    shapes.append("polygon(" + ", ".join(f"{x}px {y}px" for x, y in poly) + ")")
json.dump(shapes, open(a.out, "w"))
print("wrote", a.out)
