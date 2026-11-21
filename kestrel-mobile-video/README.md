# Kestrel Mobile: 70 s motion graphics spot

1080 × 1920 (9:16), 30 fps, 70 s. Built from the "Kestrel Mobile — 70-second motion graphics script".

| File | What it is |
|---|---|
| `kestrel_mobile_70s.mp4` | Clean master: picture, music and sound effects, and a toggleable English caption track |
| `kestrel_mobile_70s_captioned.mp4` | Same cut with the voiceover captions burned in (above the 250 px platform UI zone) |
| `captions.srt` | Voiceover captions, timed to the script at about 150 wpm |
| `music_sfx.wav` | Original music bed and sound design stem (90 BPM, about −17 LUFS, leaves room for the voice) |
| `storyboard.png` | One frame from each of the 8 scenes |
| `scene.html` | All animation code. `draw(t)` renders any frame at time `t` |
| `audio.py` / `render.js` / `encode.py` | Build scripts for the audio, frames and captions, and the final encode |

## Placeholders (need client approval)

Nothing in the spot invents a figure. Bracketed placeholders appear on screen and in the captions:
`[X] Mbps`, `[€XX] / month`, `[Offer terms]`, `[kestrel-url.example]`, and in the VO `[offer]` / `[N]`.
To fill them, edit `CONFIG` at the top of `scene.html` (numbers count up automatically), update
the cue text in `CAPS` in the same file, then rebuild.

## Voiceover

No voice is recorded yet. The caption timings in `captions.srt` are the VO timing guide. Record the narrator dry,
then mix it over `music_sfx.wav` (the bed is already low; duck it 3–4 dB more under speech if needed).

## Rebuild

```bash
python3 audio.py              # music_sfx.wav
node render.js captions       # captions/*.png + captions.srt
node render.js frames         # frames/*.jpg (2100 frames)
python3 encode.py             # both MP4s
node render.js stills 15.9 47 # optional: PNG review frames at given times
```
