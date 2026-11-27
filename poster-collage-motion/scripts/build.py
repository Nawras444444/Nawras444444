#!/usr/bin/env python3
"""Fill assets/template.html with the hero cut-out, column shapes and marker stripe.

usage: build.py figure_mask.png shapes.json OUT_index.html [--stripe stripe.json]

stripe.json: list of [x, y] points (stage coords, 900 x H) for the orange slash.
Default is the stripe used for the Godfather poster (across the eyes).
The template placeholders are: __HERO__, __SHAPES__, __STRIPE__, __BAND__, __BAND0__.
"""
import argparse, base64, json, os
ap = argparse.ArgumentParser()
ap.add_argument("mask"); ap.add_argument("shapes"); ap.add_argument("out")
ap.add_argument("--stripe", default=None)
ap.add_argument("--stage-h", type=int, default=1204)
a = ap.parse_args()
H = a.stage_h
STRIPE = json.load(open(a.stripe)) if a.stripe else [
    [112,372],[250,352],[400,330],[540,306],[664,284],[672,322],[656,360],[666,402],
    [540,424],[400,446],[250,470],[118,494],[106,452],[120,416]]
here = os.path.dirname(os.path.abspath(__file__))
t = open(os.path.join(here, "..", "assets", "template.html")).read()
pct = lambda p: f"{p[0]/900*100:.2f}% {p[1]/H*100:.2f}%"
t = t.replace("__BAND__", ", ".join(pct(p) for p in STRIPE)).replace("__BAND0__", pct(STRIPE[0]))
t = t.replace("__STRIPE__", "M" + " L".join(f"{x},{y}" for x, y in STRIPE) + " Z")
t = t.replace("__SHAPES__", open(a.shapes).read())
t = t.replace("__HERO__", "data:image/png;base64," + base64.b64encode(open(a.mask, "rb").read()).decode())
open(a.out, "w").write(t)
print("built", a.out, len(t), "bytes")
