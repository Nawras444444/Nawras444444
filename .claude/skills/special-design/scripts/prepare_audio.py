#!/usr/bin/env python3
"""Clean a voiceover and align it for the story.

What it does
  1. Transcribes the voiceover (faster-whisper, Arabic by default) with timestamps.
  2. Finds spoken scene labels ("المشهد ٢", "المشهد رقم ثلاثة" ...) that TTS tools often read aloud,
     and cuts each one at the middle of the silences around it, so the pause stays natural.
  3. Adds a short lead-in and a tail of silence, writes voiceover-clean.wav and voiceover.mp3.
  4. Writes timeline.json: scene start times (each removed label marks a scene change) and every
     transcript segment mapped onto the cleaned timeline — use these for scene durations and captions.

Usage
  python3 prepare_audio.py VOICE.wav OUTDIR [--lang ar] [--lead 0.6] [--tail 3] [--model small]
         [--label-word المشهد] [--keep-labels]

If the recording has no spoken labels, scene starts come back with only 0; split scenes yourself
from the segment list (pick the segment where each scene's narration begins).
Requires: ffmpeg, pip install faster-whisper numpy.
"""
import argparse, json, os, subprocess, sys
import numpy as np


def sh(*a, **k):
    return subprocess.run(list(a), check=True, capture_output=True, **k)


def decode(path, sr=16000):
    raw = sh("ffmpeg", "-loglevel", "error", "-i", path, "-ar", str(sr), "-ac", "1", "-f", "f32le", "-").stdout
    return np.frombuffer(raw, np.float32)


def silences(path, noise="-40dB", d=0.2):
    out = subprocess.run(["ffmpeg", "-hide_banner", "-i", path, "-af", f"silencedetect=noise={noise}:d={d}", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    s, res = None, []
    for line in out.splitlines():
        if "silence_start:" in line:
            s = float(line.split("silence_start:")[1].split()[0])
        elif "silence_end:" in line and s is not None:
            res.append((s, float(line.split("silence_end:")[1].split()[0]))); s = None
    return res


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("voice"); ap.add_argument("outdir")
    ap.add_argument("--lang", default="ar"); ap.add_argument("--model", default="small")
    ap.add_argument("--lead", type=float, default=0.6); ap.add_argument("--tail", type=float, default=3.0)
    ap.add_argument("--label-word", default="المشهد"); ap.add_argument("--keep-labels", action="store_true")
    a = ap.parse_args()
    os.makedirs(a.outdir, exist_ok=True)

    from faster_whisper import WhisperModel   # passing a numpy array avoids PyAV version issues
    model = WhisperModel(a.model, device="cpu", compute_type="int8")
    segs, _ = model.transcribe(decode(a.voice), language=a.lang, word_timestamps=True)
    segs = [{"s": s.start, "e": s.end, "t": s.text.strip()} for s in segs]
    dur = float(sh("ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", a.voice, text=True).stdout)

    sil = silences(a.voice)
    cuts = []
    if not a.keep_labels:
        for sg in segs:
            if a.label_word in sg["t"] and len(sg["t"].split()) <= 4:
                before = max([x for x in sil if x[1] <= sg["s"] + 0.3], key=lambda x: x[1], default=None)
                after = min([x for x in sil if x[0] >= sg["e"] - 0.3], key=lambda x: x[0], default=None)
                c0 = (before[0] + before[1]) / 2 if before else sg["s"]
                c1 = (after[0] + after[1]) / 2 if after else sg["e"]
                cuts.append((round(c0, 3), round(c1, 3)))

    def mapt(t):
        r = t
        for c0, c1 in cuts:
            if t >= c1: r -= c1 - c0
            elif t > c0: r -= t - c0
        return round(r + a.lead, 3)

    keep, prev = [], 0.0
    for c0, c1 in cuts:
        keep.append((prev, c0)); prev = c1
    keep.append((prev, None))
    parts = []
    for k, (s0, s1) in enumerate(keep):
        trim = f"atrim={s0}" + (f":{s1}" if s1 is not None else "")
        parts.append(f"[0:a]{trim},asetpts=PTS-STARTPTS[a{k}]")
    lead_ms = int(a.lead * 1000)
    fc = ";".join(parts) + ";" + "".join(f"[a{k}]" for k in range(len(keep))) + \
        f"concat=n={len(keep)}:v=0:a=1,adelay={lead_ms},apad=pad_dur={a.tail}[o]"
    clean = os.path.join(a.outdir, "voiceover-clean.wav")
    sh("ffmpeg", "-loglevel", "error", "-y", "-i", a.voice, "-filter_complex", fc, "-map", "[o]", "-ac", "1", clean)
    sh("ffmpeg", "-loglevel", "error", "-y", "-i", clean, "-b:a", "64k", os.path.join(a.outdir, "voiceover.mp3"))
    total = float(sh("ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", clean, text=True).stdout)

    starts = [0.0] + [mapt(c0) for c0, _ in cuts]   # each removed label marks where a scene begins
    out = {"source_duration": dur, "clean_duration": total, "cuts": cuts, "scene_starts": starts,
           "scene_durations": [round(b - s, 2) for s, b in zip(starts, starts[1:] + [total])],
           "segments": [{"t": mapt(sg["s"]), "text": sg["t"]} for sg in segs if not (cuts and a.label_word in sg["t"] and len(sg["t"].split()) <= 4)]}
    json.dump(out, open(os.path.join(a.outdir, "timeline.json"), "w"), ensure_ascii=False, indent=1)
    print(f"removed {len(cuts)} spoken labels; {dur:.2f}s -> {total:.2f}s; scenes: {len(starts)}")
    print("scene starts:", [round(x, 2) for x in starts])


if __name__ == "__main__":
    main()
