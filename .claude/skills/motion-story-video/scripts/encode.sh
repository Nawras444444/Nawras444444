#!/usr/bin/env bash
# usage: encode.sh frames_dir audio.wav out.mp4   (frames named f00000.jpg, 30 fps)
set -e
ffmpeg -y -loglevel error -framerate 30 -i "$1/f%05d.jpg" -i "$2" \
  -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -r 30 \
  -c:a aac -b:a 192k -movflags +faststart -shortest "$3"
ffprobe -v error -show_entries stream=codec_name,width,height,duration -of csv=p=0 "$3"
