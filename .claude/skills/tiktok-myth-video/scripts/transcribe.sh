#!/usr/bin/env bash
# Usage: transcribe.sh voiceover.mp3 outdir  -> outdir/<name>.json with segment timings (Arabic)
set -e
whisper "$1" --model small --language ar --word_timestamps True --output_format json --output_dir "$2"
python3 - "$2" "$1" <<'PY'
import json,sys,os
d=json.load(open(os.path.join(sys.argv[1],os.path.splitext(os.path.basename(sys.argv[2]))[0]+'.json')))
for s in d['segments']: print(round(s['start'],2),round(s['end'],2),s['text'])
PY
