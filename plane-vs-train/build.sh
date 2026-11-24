#!/bin/sh
# One-command build: sound -> render -> loudness (-14 LUFS) -> poster.
set -e
cd "$(dirname "$0")"
[ -d node_modules ] || npm install
python3 tools/audio.py
python3 tools/srt.py
npx remotion render PlaneVsTrain out/raw.mp4 --concurrency=4 --crf=18
ffmpeg -y -loglevel error -i out/raw.mp4 -c:v copy -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:a aac -b:a 192k -ar 44100 plane-vs-train.mp4
npx remotion still PlaneVsTrain poster.jpg --frame=75 --image-format=jpeg
echo "done: plane-vs-train.mp4"
