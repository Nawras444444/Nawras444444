#!/usr/bin/env bash
# Rebuilds the whole film: score -> mix -> frames -> final MP4.
# Needs: python3 (numpy), node + playwright (Chromium), ffmpeg.
set -euo pipefail
cd "$(dirname "$0")"
A=assets/audio

python3 music.py

ffmpeg -v error -y -i $A/voiceover.wav -i $A/score.wav -filter_complex \
 "[0:a]aresample=48000,pan=stereo|c0=c0|c1=c0,highpass=f=70,acompressor=threshold=-20dB:ratio=3:attack=5:release=120,apad=whole_dur=98,asplit=2[vo][key];\
  [1:a]volume=0.15[mus];[mus][key]sidechaincompress=threshold=0.02:ratio=8:attack=30:release=500[duck];\
  [vo][duck]amix=inputs=2:weights=1 1:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000" \
 -c:a pcm_s16le $A/final_mix.wav

node render.js video 30 3

ffmpeg -v error -y -i out/video_noaudio.mp4 -i $A/final_mix.wav -c:v copy -c:a aac -b:a 256k \
 -movflags +faststart -shortest DIDDY_Power_Influence_Reckoning.mp4
echo "Done: DIDDY_Power_Influence_Reckoning.mp4"
