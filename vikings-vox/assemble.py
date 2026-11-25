#!/usr/bin/env python3
"""Mix the narration into the rendered clips, and join all clips into one video.

Usage: python3 assemble.py [--lead 0.3] [--sfx 0.4]

The narration is one continuous file. Clip boundaries in data.js were placed at the
start of each spoken line, so delaying the whole narration by --lead seconds makes
every line begin just after its card lands, and every cut falls inside a pause.

  videos_vo/<id>.mp4  each rendered clip with its slice of the narration mixed in
  final.mp4           all clips joined, with the full narration mixed in one pass
                      (written only when every clip in data.js has been rendered)

Mixing the joined video in one pass, rather than joining the per-clip mixes, avoids
the small AAC gaps that would otherwise click at every cut.
"""
import argparse, json, os, re, subprocess

FF = ["ffmpeg", "-y", "-loglevel", "error"]


def panels():
    src = open("data.js").read()
    return json.loads(re.sub(r"^const PANELS\s*=\s*", "", src).rstrip().rstrip(";"))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lead", type=float, default=0.3)
    ap.add_argument("--sfx", type=float, default=0.4, help="sound-effects level under the voice")
    a = ap.parse_args()
    P = panels()
    total = sum(p["dur"] for p in P)
    narr = "audio/narration_delayed.wav"
    subprocess.run(FF + ["-i", "audio/narration.mp3", "-af",
                         f"adelay={int(a.lead * 1000)}:all=1,apad,atrim=0:{total:.4f}",
                         "-ac", "2", "-ar", "44100", narr], check=True)
    mix = f"[0:a]volume={a.sfx}[s];[1:a]volume=1.0[n];[s][n]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.95[a]"
    os.makedirs("videos_vo", exist_ok=True)
    t, have = 0.0, []
    for p in P:
        clip = f"videos/{p['id']}.mp4"
        if os.path.exists(clip):
            have.append(clip)
            subprocess.run(FF + ["-i", clip, "-ss", f"{t:.4f}", "-t", f"{p['dur']:.4f}", "-i", narr,
                                 "-filter_complex", mix, "-map", "0:v", "-map", "[a]",
                                 "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", f"videos_vo/{p['id']}.mp4"], check=True)
            print("mixed", p["id"], f"{t:.2f}-{t + p['dur']:.2f}s")
        t += p["dur"]
    if len(have) < len(P):
        print(f"{len(have)}/{len(P)} clips rendered; final.mp4 needs all of them")
        return
    with open("videos/list.txt", "w") as f:
        f.writelines(f"file '{os.path.basename(c)}'\n" for c in have)
    subprocess.run(FF + ["-f", "concat", "-safe", "0", "-i", "videos/list.txt", "-c", "copy", "joined_sfx.mp4"], check=True)
    subprocess.run(FF + ["-i", "joined_sfx.mp4", "-i", narr, "-filter_complex",
                         mix.replace("[a]", "[m]") + ";[m]loudnorm=I=-14:TP=-1.5:LRA=11[a]",
                         "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
                         "-ar", "44100", "-movflags", "+faststart", "final.mp4"], check=True)
    os.remove("joined_sfx.mp4")
    print("final.mp4 written")


if __name__ == "__main__":
    main()
