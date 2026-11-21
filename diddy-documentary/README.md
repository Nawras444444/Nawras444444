# DIDDY: Power, Influence, Reckoning

A 1:38 cinematic motion-graphics documentary (1920×1080, 30 fps). It is built from the supplied voiceover and photos, plus open-licensed photos, original 2D illustrations and an original score.

**Final film:** `DIDDY_Power_Influence_Reckoning.mp4`. **Subtitles:** `subtitles.srt`.

## How it's made

| Part | File | What it does |
|---|---|---|
| Visuals | `index.html` | Canvas renderer: `renderFrame(t)` draws any moment deterministically. It covers photos with slow push-ins, kinetic type, line-art illustrations, glitch, glass shatter, film grain and vignette. |
| Frames → video | `render.js` | Headless Chromium renders every frame and pipes the frames to ffmpeg. |
| Score + SFX | `music.py` | Synthesized dark piano, drones, an 84 BPM boom-bap beat, bass hits, risers, camera shutters, gavel, heartbeat, vinyl crackle and shatter. No samples and no copyrighted music. |
| Mix | `build.sh` | Ducks the music under the voice with a sidechain and normalizes to −14 LUFS. |

Rebuild everything with `./build.sh`. To preview in a browser with sound, run `python3 -m http.server`, then open `http://localhost:8000/index.html?preview`.

## Scene map (synced to the narration's word timings)

| Time | Scene | Visual |
|---|---|---|
| 0:00 | Opening | Spotlit portrait, title, then the names PUFF DADDY → P. DIDDY → DIDDY, with a voice-driven waveform |
| 0:11 | Harlem | Brownstone line art draws on over a Harlem photo, windows light up, then prints of the early years and the Apollo |
| 0:19 | The Rise | Illustrated studio mic, spinning vinyl, and VU bars driven by the voice |
| 0:24 | 1993 | Year counter, then BAD BOY ENTERTAINMENT |
| 0:28 | Bad Boy | Pan across 1710 Broadway, "BAD BOY" assembling from particles, stage beams, crowd |
| 0:35 | Fame | Camera flashes, MUSIC. FAME. INFLUENCE., then a triptych: ARTIST / BUSINESSMAN / CULTURAL FORCE |
| 0:45 | Sean John | Gold grade, tracksuit-on-hanger line art |
| 0:52 | The Shadow | Glitch from gold to blue, illustrated front page, U.S. District Court (S.D.N.Y.) |
| 1:02 | The Reckoning | Courtroom line art, scales, verdict board |
| 1:14 | Ending | Recap cuts, cracks spreading across the portrait, glass shatter on "instant" |
| 1:28 | Title + credits | POWER. INFLUENCE. RECKONING. |

## Facts shown on screen
- Bad Boy Entertainment was founded in 1993.
- Combs was arrested in September 2024 and charged federally in the Southern District of New York.
- He pleaded not guilty.
- The jury verdict came on July 2, 2025:
  - Acquitted of racketeering conspiracy.
  - Acquitted of sex trafficking (two counts).
  - Convicted of transportation to engage in prostitution (two counts).

The newspaper front page is an illustration. It is labelled "illustrative" on screen and does not imitate a real publication.

## Credits
Open-licensed photos (fetched through Openverse):
- "Harlem Brownstones" by pasa47, CC BY 2.0
- "Entrance at the Apollo Theater, Harlem" by Per Olof Forsberg, CC BY 2.0
- "Daniel Patrick Moynihan U.S. Courthouse" by edenpictures, CC BY 2.0

The other photos in `assets/photos/` were supplied by the producer. Confirm their rights before publishing commercially. The narration is AI-generated. The illustrations, motion graphics and score are original.
