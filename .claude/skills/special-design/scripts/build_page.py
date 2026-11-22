#!/usr/bin/env python3
"""Build a story page from the template: copy assets/template.html and embed the Latin tag font.

Usage: python3 build_page.py OUT.html [--font path/to/font.ttf]
Then edit the SCENES and VO arrays in OUT.html (everything editable lives there).
"""
import argparse, base64, os

here = os.path.dirname(os.path.abspath(__file__))
ap = argparse.ArgumentParser(); ap.add_argument("out")
ap.add_argument("--font", default=os.path.join(here, "..", "assets", "fonts", "WeirdTalks-Personal-Use.ttf"))
a = ap.parse_args()
tpl = open(os.path.join(here, "..", "assets", "template.html"), encoding="utf-8").read()
b64 = base64.b64encode(open(a.font, "rb").read()).decode()
open(a.out, "w", encoding="utf-8").write(tpl.replace("__WT_B64__", b64))
print("wrote", a.out)
