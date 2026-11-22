#!/usr/bin/env python3
"""Mix the sound effects under the voiceover, mux with the silent render, and export one PNG per scene.

Usage
  python3 mux.py SILENT.mp4 VOICE_CLEAN.wav SFX_DIR CUES.json OUT.mp4 [--stills DIR --starts 0,16.58,...]

Effect levels sit well under the voice (whoosh .28, tick .25, chime .22). Stills are taken 0.4 s before
each scene ends, when everything in the scene has appeared.
"""
import argparse, json, os, subprocess, wave
import numpy as np


def rd(p):
    w = wave.open(p); sr = w.getframerate()
    x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(float) / 32767
    return x, sr


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video"); ap.add_argument("voice"); ap.add_argument("sfxdir"); ap.add_argument("cues"); ap.add_argument("out")
    ap.add_argument("--stills"); ap.add_argument("--starts")
    a = ap.parse_args()
    vo, sr = rd(a.voice)
    gain = {"whoosh": .28, "tick": .25, "chime": .22}
    mix = vo.copy()
    for c in json.load(open(a.cues)):
        fx, fsr = rd(os.path.join(a.sfxdir, f"sfx-{c['k']}.wav"))
        if fsr != sr:
            fx = np.interp(np.arange(0, len(fx), fsr / sr), np.arange(len(fx)), fx)
        s = int(c["t"] * sr); e = min(len(mix), s + len(fx)); mix[s:e] += fx[:e - s] * gain.get(c["k"], .25)
    tmp = a.out + ".mix.wav"
    w = wave.open(tmp, "wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
    w.writeframes((np.clip(mix, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", a.video, "-i", tmp, "-map", "0:v", "-map", "1:a", "-c:v", "copy",
                    "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-shortest", "-movflags", "+faststart", a.out], check=True)
    os.remove(tmp)
    if a.stills and a.starts:
        os.makedirs(a.stills, exist_ok=True)
        st = [float(x) for x in a.starts.split(",")]
        total = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", a.video],
                                     capture_output=True, text=True).stdout)
        ends = st[1:] + [total]
        for i, e in enumerate(ends):
            subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-ss", str(e - 0.4), "-i", a.video, "-frames:v", "1",
                            os.path.join(a.stills, f"scene-{i + 1:02d}.png")], check=True)
    print("ok", a.out)


if __name__ == "__main__":
    main()
