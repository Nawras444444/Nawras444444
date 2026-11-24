# الطائرة أم القطار؟ — TikTok 9:16 (56 s)

- `plane-vs-train.mp4` — the finished film (1080×1920, 30 fps, about -14 LUFS)
- `SCRIPT.md` — the editing script in one text, with transitions, sounds and shapes
- `subtitles.srt` — Arabic subtitles timed to the voiceover
- `poster.jpg` — cover frame
- `CREDITS.md` — every asset and its licence

Rebuild: `./build.sh` (needs Node 20+, Python 3 with numpy, ffmpeg).
Preview and edit: `npm run studio`.

Code map: `src/Scenes.tsx` (8 scenes, scene-relative timings), `src/ui.tsx` (square text frame `Box`, `Sticker`, icons, flash, shake),
`src/Background.tsx` (black grid with orange shapes), `src/captions.ts` (word timings), `tools/audio.py` (music + sound effects).
