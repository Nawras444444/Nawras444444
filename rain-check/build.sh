#!/bin/sh
# One command: Rain Check (30 s, 80s Cel Anime). LIB = the Lemo-Opuscar library folder.
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-$HOME/lemo-opuscar}
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
export LEMO_ANGLE=${LEMO_ANGLE:-swiftshader}      # software WebGL on machines without a GPU
mkdir -p "$HERE/out"; cd "$LIB"
node core/render/events.mjs "$HERE"
"$LIB/.venv/bin/python" "$HERE/mix.py"
node core/render/video.mjs "$HERE" --fps 24 --workers 4 --out "$HERE/out/video.mp4"
if ffmpeg -version | head -1 | grep -Eq 'version n?([7-9]|[1-9][0-9])\.'; then
  sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/rain-check.mp4" 24
else
  sh "$HERE/master.sh" "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/rain-check.mp4"
fi
node core/render/still.mjs "$HERE" 22.8 --q nosub=1 --out "$HERE/out/still" --prefix p_
cp "$HERE/out/still/p_22.8.jpg" "$HERE/poster.jpg"
"$LIB/.venv/bin/python" core/render/srt.py "$HERE/cues.json" "$HERE/subtitles_en.srt"
