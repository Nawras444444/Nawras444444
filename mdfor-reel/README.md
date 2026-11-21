# mdfor.dev motion reel

30-second 16:9 motion reel introducing mdfor.dev (1920x1080, 60 fps, 120 BPM).

Every picture is a real capture from mdfor.dev, cut into components in `assets/parts/`
(header icons, editor and preview panes, cards, export menu, outline panel). The film is
`film.js`, a pure function of time, drawn on a canvas by `lib/motion.js`.

## Rebuild

Run from the folder that contains `mdfor-reel/` (the motion-reel scripts read and write there):

1. Music bed (the WAVs are not committed, the seeded synth regenerates them):
   `uv run <motion-reel>/scripts/beats.py mdfor-reel --synth --bpm 120 --tonic F --mode major --flavor house --duration 30 --drop 6`
2. Picture: `node <motion-reel>/scripts/render.mjs --film mdfor-reel --format 16x9 --video-only`
3. Sound and mux: `node <motion-reel>/scripts/sfx.mjs mdfor-reel && node <motion-reel>/scripts/mix.mjs mdfor-reel`

The UI captures are in `assets/parts/` and `assets/shots/`, so the build does not need the
live site. `tools/capture*.cjs` re-capture them from https://mdfor.dev with Playwright if the
site changes.

Outputs go to `out/mdfor-reel/`, which is git-ignored.
