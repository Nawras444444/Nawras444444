"""Write subtitles.srt from src/captions.ts."""
import json
L = json.loads(open('src/captions.ts').read().split('= ', 1)[1].rstrip(';\n'))
def ts(s):
    ms = int(round(s * 1000)); return f"{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}"
out = []
for i, l in enumerate(L):
    a = l[0][1]; nxt = L[i+1][0][1] if i + 1 < len(L) else 52.9
    b = min(nxt, l[-1][1] + 1.6)
    out.append(f"{i+1}\n{ts(a)} --> {ts(b)}\n{' '.join(w for w, _ in l)}\n")
open('subtitles.srt', 'w').write('\n'.join(out)); print(len(out), 'cues')
