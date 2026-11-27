#!/usr/bin/env bash
# Usage: build_video.sh <project_dir> <voiceover.mp3> <out.mp4> [duration=57.2]
# Renders frames with 4 parallel workers, mixes light SFX under the voice, encodes H.264 + AAC.
set -e
PD=$(realpath "$1"); VO=$(realpath "$2"); OUT=$(realpath -m "$3"); DUR=${4:-57.2}
HERE=$(cd "$(dirname "$0")" && pwd); W=$(mktemp -d); mkdir -p $W/fr $W/sfx
export NODE_PATH=${NODE_PATH:-/opt/node22/lib/node_modules}
for i in 0 1 2 3; do node "$HERE/render_frames.js" "$PD/index.html" $W/fr $i 4 $DUR & done; wait
# --- SFX (edit sfx_list.txt: "<file> <seconds>" per line) ---
cd $W/sfx
ding(){ ffmpeg -y -loglevel error -f lavfi -i "sine=f=$1:d=0.6" -af "afade=t=out:st=0.05:d=0.55,volume=0.5" $2; }
ding 1320 ding.wav; ding 880 ding2.wav
ffmpeg -y -loglevel error -f lavfi -i "sine=f=140:d=0.35" -af "tremolo=f=30:d=1,afade=t=out:st=0.1:d=0.25,volume=0.7" err.wav
ffmpeg -y -loglevel error -f lavfi -i "anoisesrc=d=0.5:c=pink:a=0.5" -af "highpass=f=300,lowpass=f=3500,afade=t=in:d=0.15,afade=t=out:st=0.2:d=0.3,volume=0.5" whoosh.wav
ffmpeg -y -loglevel error -f lavfi -i "sine=f=600:d=0.12" -af "afade=t=out:st=0.02:d=0.1,volume=0.6" pop.wav
ffmpeg -y -loglevel error -f lavfi -i "sine=f=1800:d=0.15" -af "afade=t=out:st=0.02:d=0.13,volume=0.35" ping.wav
LIST=${SFX_LIST:-$HERE/../template/sfx_list.txt}
inputs="";filter="";n=0
while read f t; do inputs="$inputs -i $f"; ms=$(python3 -c "print(int($t*1000))"); filter="$filter[$n:a]adelay=${ms}|${ms}[a$n];"; n=$((n+1)); done < "$LIST"
mix=$(for i in $(seq 0 $((n-1))); do printf "[a$i]"; done)
ffmpeg -y -loglevel error $inputs -filter_complex "${filter}${mix}amix=inputs=$n:normalize=0,volume=0.8[o]" -map "[o]" -t $DUR -ar 44100 -ac 1 sfxmix.wav
cd $W
ffmpeg -y -loglevel error -i "$VO" -i sfx/sfxmix.wav -filter_complex "[0:a]volume=1.0[v];[1:a]volume=0.22[s];[v][s]amix=inputs=2:normalize=0:duration=longest,apad=whole_dur=$DUR[o]" -map "[o]" -ar 44100 audio_final.wav
ffmpeg -y -loglevel error -framerate 30 -i fr/%05d.jpg -i audio_final.wav -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart "$OUT"
echo "done: $OUT"
