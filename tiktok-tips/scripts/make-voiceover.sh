#!/usr/bin/env bash
# Regenerate public/vo/<scene>.wav with Piper (offline TTS), then print each clip's length in frames.
# Setup once:  pip install piper-tts
#   curl -LO https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/ryan/high/en_US-ryan-high.onnx
#   curl -LO https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/ryan/high/en_US-ryan-high.onnx.json
# If a clip's length changes, update that scene's voFrames (and dur/from) in src/script.ts,
# then run: python3 scripts/make-soundtrack.py
set -euo pipefail
VOICE=${VOICE:-en_US-ryan-high.onnx}
mkdir -p public/vo
node -e "
const s=require('fs').readFileSync('src/script.ts','utf8');
for (const m of s.matchAll(/id: '(\w+)'[\s\S]*?vo: (['\"])(.*?)\2/g)) console.log(m[1]+'\t'+m[3]);" |
while IFS=$'\t' read -r id text; do
  echo "$text" | python3 -m piper -m "$VOICE" -f "public/vo/$id.wav"
  d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "public/vo/$id.wav")
  echo "$id voFrames=$(python3 -c "import math;print(math.ceil($d*30))")"
done
