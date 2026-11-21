# LoL-style montage (Remotion)

Blue/purple "Summoner's Rift" montage of three clips: 3D hextech crystal intro, skill-bar HUD
(Q/W/E/R with cooldown sweeps and spell bursts), kill banners, cube/iris/clock/flip transitions,
VICTORY outro, procedural synth score.

- `npm run dev` – open Remotion Studio (composition `LolMontage`)
- `npx remotion render LolMontage out/lol-montage.mp4` – 1920x1080, 30fps, ~20.7s
- `python3 make_music.py` – regenerates `public/music.wav`
- Fonts (Cinzel / Rajdhani / Orbitron) are self-hosted in `public/fonts`.
