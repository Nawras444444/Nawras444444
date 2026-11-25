# The Train on the Broken Bridge — 16:9 Remotion video

1920×1080 (16:9) · 30 fps · 1710 frames (57 s) · Arabic RTL captions.

## Commands
```bash
npm i
npm run dev                                   # Remotion Studio preview
npx remotion render TrainOnBrokenBridge out/train_on_broken_bridge.mp4 --crf=18
```

## Pipeline scripts
| Script | What it does |
|---|---|
| `node scripts/sliceSheets.js` | Slices `public/sheets/sheet_01..08.png` (4-panel storyboards) into `public/panels/01_1..08_4.png`, makes blurred 9:16 backdrops in `public/panels/bg/`, writes `src/data/panelSizes.ts` |
| `python3 scripts/generate_sfx.py` | Synthesises the foley/SFX library in `public/sfx/` + `public/grain.png` |
| `python3 scripts/build_captions.py` | Builds `src/data/voiceData.ts` (VO clip placement + word-timed captions) from the Whisper word timings in `scripts/data/vo_words.json` |

## Code map
- `src/data/storyData.ts` — all 32 panels: timing, `focalPoint`, camera motion, shake, HUD, FX, SFX cues
- `src/components/ScenePanel.tsx` — Ken Burns, focal framing, transitions, shake, chromatic aberration
- `src/components/PanelFx.tsx` — wiper, splash, sparks, steam, light spill, pulses
- `src/components/HudEffects.tsx` — rain/fog, lightning, distance telemetry, rewind badge, gauges, film finish
- `src/components/SubtitleOverlay.tsx` — word-by-word two-tone Arabic captions
- `src/components/AudioTracks.tsx` — VO clips, music bed with ducking (`MIX` levels), rain bed, SFX
- `src/MainVideo.tsx` — layer orchestration

## Easy tweaks
- Music loudness: `MIX.music` / `MIX.musicUnderVoice` in `src/components/AudioTracks.tsx`
- Caption size/position: `SubtitleOverlay.tsx` (`fontSize`, `bottom`)
- Any panel's motion/framing: its entry in `storyData.ts`
