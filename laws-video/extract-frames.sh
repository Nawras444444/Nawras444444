#!/usr/bin/env bash
# Re-creates public/frames/<name>/0..8.jpg from the uploaded animated GIFs (upscaled + sharpened).
set -euo pipefail
cd "$(dirname "$0")/public"
for g in img/*.gif; do
  n=$(basename "$g" .gif); mkdir -p "frames/$n"
  ffmpeg -v error -y -i "$g" -vf "scale=-1:1920:flags=lanczos,unsharp=5:5:0.8" -qscale:v 6 -start_number 0 "frames/$n/%d.jpg"
done
