"""Collect scene specs + prep meta + subtitles into film/data.js."""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from scenes import S, SUBS
DUR = 143.77
out = []
for i, sc in enumerate(S):
    if not os.path.exists(f"L/{sc['src']}/meta.json"): print('skip', sc['src']); continue
    meta = json.load(open(f"L/{sc['src']}/meta.json"))
    els = []
    for e in sc['els']:
        d = dict(k=e['k'], n=e['n'], box=e['box'])
        if e['k'] == 'text': d.update(s=e['s'], role=e['role'])
        else:
            if e['n'] not in meta: print('missing', sc['src'], e['n']); continue
            d['r'] = meta[e['n']]
        if e['k'] == 'piece' and e.get('mask') == 'red': d['k'] = 'tag'
        if e.get('grp'): d['grp'] = e['grp']
        els.append(d)
    start = 0.0 if i == 0 else sc['t0'] - 0.25
    end = DUR if i == len(S) - 1 else S[i + 1]['t0'] - 0.25
    out.append(dict(id=sc['src'], start=start, end=end, els=els))
os.makedirs('film', exist_ok=True)
open('film/data.js', 'w').write('window.DATA=' + json.dumps(dict(dur=DUR, scenes=out, subs=SUBS), ensure_ascii=False) + ';')
print('scenes', len(out), 'subs', len(SUBS))
