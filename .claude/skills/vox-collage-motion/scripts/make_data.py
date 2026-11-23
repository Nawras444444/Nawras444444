#!/usr/bin/env python3
"""Merge layer metadata with the on-screen texts into the template's data.js.

Usage:
  python3 make_data.py ASSETS_DIR/meta.json texts.json PROJECT_DIR/data.js

texts.json:
{
  "defaults": {"stamp": ["VOX", "تحليل"], "dur": 6.5, "dir": "rtl"},
  "groups": {                         # keyed by the id prefix before "_" (one storyboard sheet)
    "01": {"title": "في أعالي الجبال", "kicker": "المشهد 1 · رحلة القهوة",
           "badge": ["1800", "متر"], "mood": "wind"}
  },
  "panels": {                         # per-panel overrides; "caption" is the usual one
    "01_1": {"caption": "جبال يلفّها الضباب"}
  }
}
badge: [big, small]; a single ["☕"] shows a cup icon.
mood (sound bed): wind | pluck | sun | fire | machine | travel | pour | finale.
"of" (e.g. "3/6") is filled in automatically per group.
"""
import json, sys


def main(meta_p, texts_p, out_p):
    meta = json.load(open(meta_p))
    T = json.load(open(texts_p))
    d, groups, panels = T.get("defaults", {}), T.get("groups", {}), T.get("panels", {})
    count = {}
    for m in meta:
        g = m["id"].split("_")[0]
        count[g] = count.get(g, 0) + 1
    seen = {}
    rows = []
    for m in meta:
        g = m["id"].split("_")[0]
        seen[g] = seen.get(g, 0) + 1
        row = {"title": "", "kicker": "", "badge": [str(seen[g]), ""], "caption": "", "mood": "wind"}
        row.update(d); row.update(groups.get(g, {})); row.update(panels.get(m["id"], {})); row.update(m)
        row.setdefault("of", f"{seen[g]}/{count[g]}")
        rows.append(row)
    open(out_p, "w").write("const PANELS = " + json.dumps(rows, ensure_ascii=False, indent=0) + ";\n")
    print(len(rows), "panels ->", out_p)


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(*sys.argv[1:])
