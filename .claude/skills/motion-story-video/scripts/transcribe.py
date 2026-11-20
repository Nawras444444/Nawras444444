#!/usr/bin/env python3
"""Word-level timestamps for a narration file -> words.json  ([[word, start, end], ...]).

usage: python3 transcribe.py narration.wav [out_words.json]

Why this exists: scenes must be cued to the *actual* spoken words, and the sandbox has
two traps that cost time the first time round:
  * faster-whisper's own model download hits the Hugging Face *API*, which rate-limits
    (429). Fetching the files straight from /resolve/main/ works, so we do that.
  * the installed PyAV can be too old for faster-whisper's decode_audio(), so we decode
    with ffmpeg ourselves and hand the model a float32 numpy array.
"""
import sys, os, json, subprocess, wave, urllib.request
import numpy as np

src = sys.argv[1]
out = sys.argv[2] if len(sys.argv) > 2 else "words.json"
mdir = os.environ.get("WHISPER_DIR", "/tmp/whisper-base-en")
FILES = ["config.json", "model.bin", "tokenizer.json", "vocabulary.txt"]
os.makedirs(mdir, exist_ok=True)
for f in FILES:
    p = os.path.join(mdir, f)
    if not os.path.exists(p) or os.path.getsize(p) == 0:
        print("downloading", f, file=sys.stderr)
        urllib.request.urlretrieve(f"https://huggingface.co/Systran/faster-whisper-base.en/resolve/main/{f}", p)

try:
    from faster_whisper import WhisperModel
except ImportError:
    subprocess.run([sys.executable, "-m", "pip", "install", "-q", "faster-whisper"], check=True)
    from faster_whisper import WhisperModel

tmp = "/tmp/_a16.wav"
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-ar", "16000", "-ac", "1", tmp], check=True)
w = wave.open(tmp)
audio = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
segs, _ = WhisperModel(mdir, compute_type="int8").transcribe(audio, word_timestamps=True)
words = []
for s in segs:
    print(f"{s.start:6.2f}-{s.end:6.2f}  {s.text.strip()}")
    words += [[x.word, round(x.start, 2), round(x.end, 2)] for x in s.words]
json.dump(words, open(out, "w"))
print("wrote", out, f"({len(words)} words)", file=sys.stderr)
