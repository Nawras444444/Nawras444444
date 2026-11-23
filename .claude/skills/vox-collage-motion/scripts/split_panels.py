#!/usr/bin/env python3
"""Split storyboard sheets into individual panel images.

Usage:
  python3 split_panels.py sheets.json OUT_DIR

sheets.json is a list, one entry per sheet:
  {"file": "scenes/scene-02.jpg", "prefix": "02", "cols": 2, "rows": 3}
  {"file": "...", "prefix": "08", "cols": 2, "rows": 3, "merge_last_row": true}   # last row = one wide panel
  {"file": "...", "prefix": "06", "boxes": [[0,0,805,335], [812,0,1535,335]]}   # free-form collage, pixel boxes

Grid lines start at equal splits and are snapped to the nearest light gutter
(within +-4% of the sheet size), so slightly uneven grids still cut cleanly.
Writes OUT_DIR/<prefix>_<n>.png and OUT_DIR/list.json.
"""
import json, os, sys
import numpy as np
from PIL import Image


def snap(profile, guess, radius):
    lo = max(0, guess - radius)
    seg = profile[lo:guess + radius]
    return lo + int(np.argmax(seg)) if len(seg) else guess


def main(cfg_path, out):
    os.makedirs(out, exist_ok=True)
    base = os.path.dirname(os.path.abspath(cfg_path))
    listing = []
    for sh in json.load(open(cfg_path)):
        path = sh["file"] if os.path.isabs(sh["file"]) else os.path.join(base, sh["file"])
        im = Image.open(path).convert("RGB")
        W, H = im.size
        a = np.asarray(im).astype(int)
        light = ((a.min(2) > 190) & ((a.max(2) - a.min(2)) < 50)).astype(float)
        if "boxes" in sh:
            boxes = [tuple(b) for b in sh["boxes"]]
        else:
            cols, rows = sh.get("cols", 2), sh.get("rows", 3)
            xs = [0] + [snap(light.mean(0), round(W * i / cols), int(W * .04)) for i in range(1, cols)] + [W]
            ys = [0] + [snap(light.mean(1), round(H * i / rows), int(H * .04)) for i in range(1, rows)] + [H]
            boxes = []
            for r in range(rows):
                if sh.get("merge_last_row") and r == rows - 1:
                    boxes.append((0, ys[r], W, ys[r + 1]))
                    continue
                for c in range(cols):
                    boxes.append((xs[c], ys[r], xs[c + 1], ys[r + 1]))
        ins = sh.get("inset", 5)
        for k, (x0, y0, x1, y1) in enumerate(boxes):
            name = f'{sh["prefix"]}_{k + 1}'
            im.crop((x0 + ins, y0 + ins, x1 - ins, y1 - ins)).save(os.path.join(out, name + ".png"))
            listing.append(name)
        print(sh["prefix"], len(boxes), "panels")
    json.dump(listing, open(os.path.join(out, "list.json"), "w"))
    print("total", len(listing))


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
