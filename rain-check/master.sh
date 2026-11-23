#!/bin/sh
# Master: measure the mix with ebur128, apply one static gain to -14 LUFS (true peak <= -1.2 dB), mux with the picture.
# Used instead of core/render/mux.sh only when the system ffmpeg is older than 7 (mux.sh refuses it).
# usage: master.sh video.mp4 mix.wav out.mp4
set -e
V="$1"; A="$2"; O="$3"
I=$(ffmpeg -hide_banner -nostats -i "$A" -af ebur128=peak=true -f null - 2>&1 | awk '/^ *I:/{v=$2} END{print v}')
G=$(awk -v i="$I" 'BEGIN{printf "%.2f", -14 - i}')
echo "measured $I LUFS, gain $G dB"
ffmpeg -y -hide_banner -loglevel error -i "$A" -af "volume=${G}dB,alimiter=limit=0.87:level=disabled:attack=3:release=60" -ar 48000 "$(dirname "$O")/mix_norm.wav"
ffmpeg -y -hide_banner -loglevel error -i "$V" -i "$(dirname "$O")/mix_norm.wav" -map 0:v -map 1:a -c:v libx264 -preset slow -crf 22 -vf "noise=c0s=2:allf=t,format=yuv420p" -r 24 -c:a aac -b:a 192k -movflags +faststart -t 30 "$O"
ffmpeg -hide_banner -nostats -i "$O" -af ebur128=peak=true -f null - 2>&1 | awk '/Integrated loudness/{f=1} f' | head -12
