#!/bin/bash
# usage: sheet.sh OUTDIR t1 t2 ...  -> renders half-res stills and OUTDIR/sheet.jpg
OUT="$1"; shift; mkdir -p "$OUT"
for s in "$@"; do f=$(python3 -c "print(int($s*30))"); npx remotion still Victor "$OUT/t$s.jpg" --frame=$f --scale=0.5 >/dev/null 2>&1 || echo "fail $s"; done
python3 - "$OUT" "$@" <<'PY'
import subprocess,sys
d=sys.argv[1]; fs=[f"{d}/t{s}.jpg" for s in sys.argv[2:]]; n=len(fs)
fc=''.join(f'[{i}]scale=480:-1,drawtext=text={sys.argv[2+i]}:x=8:y=8:fontcolor=yellow:fontsize=22[v{i}];' for i in range(n))
fc+=''.join(f'[v{i}]' for i in range(n))+f'xstack=inputs={n}:layout='+'|'.join(f'{(i%4)*480}_{(i//4)*270}' for i in range(n))+':fill=black'
subprocess.run(['ffmpeg','-y','-loglevel','error']+sum([['-i',f] for f in fs],[])+['-filter_complex',fc,f'{d}/sheet.jpg'])
PY
