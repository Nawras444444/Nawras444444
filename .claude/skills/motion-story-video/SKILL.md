---
name: motion-story-video
description: Build a narrated 9:16 (TikTok/Reels/Shorts) motion-graphics story video from an audio file, entirely in code - animated SVG characters, d3 globe and flat-map effects, flag/brand-color synchronized backgrounds, word-synced kinetic captions, stripe/iris/diagonal wipe transitions, a journey-map recap scene, and a synthesized music + SFX mix. Use this whenever the user hands over a voice-over or narration (wav/mp3) and wants a vertical video, motion graphics, an animated story, a country-to-country or love/travel/immigration story, a map animation, or says "make a video from this audio" - even if they never say "motion graphics". Also use it to remake or lengthen an earlier video made this way.
---

# Motion-story video (audio in -> 9:16 mp4 out)

The pipeline renders every frame as SVG in headless Chromium (Playwright), driven by one
pure function `draw(t)`, then muxes with a numpy-synthesized soundtrack via ffmpeg. No video
editor, no stock footage. A complete working example (60 s, Algeria x Chile love story) lives in
`assets/reference-algeria-chile/` - **copy it and adapt it** rather than starting blank; the
character rig, map scenes, wipes, captions and journey map are all reusable.

## Workflow

1. **Get word timings from the narration** (never guess scene timing):
   `python3 scripts/transcribe.py narration.wav words.json` - prints segments, writes
   `[[word,start,end],...]`. The script works around two sandbox traps (HF API rate limit, old PyAV).
   Gaps >= ~0.6 s between sentences are where scene boundaries and wipes belong.
2. **Plan the timeline.** Map narration to scenes, one idea per scene, wipe boundary placed
   ~0.35 s *before* the next sentence's first word so the wipe finishes as speech starts.
   If the user wants a longer video than the audio (e.g. "make it 1 minute"), keep their voice
   and insert **music-only interludes** in the silence gaps (a map scene, a journey-map recap)
   by placing narration parts at offsets: `U2T(u)` in `scene.html` and `place()` in `audio.py`
   must use the same mapping. Do not invent narration - you have no good TTS here.
3. **Adapt `scene.html`**: edit palette, characters, scene functions, `SCN` start times,
   `BOUND` wipe times, `KF` background weights. Keep scenes as pure functions of time.
4. **Preview stills before the full render**: `node render.js stills 2 9 15 ...` then tile them
   with ffmpeg `hstack/vstack` into a contact sheet and look at it. Fix overlaps, then render.
   Full render is ~20 fps with 4 workers (1800 frames ~ 90 s). `S0=..E0=.. node render.js full`
   re-renders a frame range after a small fix.
5. **Audio**: adapt `audio.py` (same BPM as the visuals' beat pulse, ducking under voice,
   whoosh on every wipe, pop on every heart/stamp event, risers in music-only gaps).
6. **Encode**: `scripts/encode.sh frames mix.wav out.mp4`, grab frames from the *mp4* for a last
   visual check, `SendUserFile` the result, commit the source (not `frames/`, `node_modules/`).

Setup once per project dir: `npm i animejs d3 topojson-client world-atlas @fontsource/poppins @fontsource/lora`
(Playwright is global: `NODE_PATH=$(npm root -g) node render.js ...`).

## Design rules that earned their keep

- **Safe zones.** Title badge y 170-280; art y 300-1250; captions centered ~y 1385; leave the
  bottom ~380 px and right ~150 px for the platform UI (decorative landscape only below 1560).
- **Captions**: word-by-word, active word in the accent color, unspoken words dimmed; wrap with
  canvas `measureText` **after** `document.fonts.load()` (measuring before load gives wrong
  widths and glued words); shrink font 68->60->54 to cap at 3 lines.
- **Synchronized colors**: a 60-30-10 scheme - warm neutral base, the two flag/brand colors as
  large fields, one shared accent (e.g. the red both flags have) for emphasis. Background blob
  weights are keyframed per scene (`KF`) and pulse on the beat (`BEAT = 60/BPM`).
- **Transitions**: three wipe types (bands, iris via even-odd hole, diagonal) in flag colors,
  each needs an all-covering instant where the scene swaps (`t >= start + .05`).
- **Characters**: SVG rig `person(state, "A"|"B")` - walk cycle (`ph` in units of pi, integer =
  idle), waving arms, blink, smile, heart-eyes, held items, lean, hop. Animate the *state
  objects* with an Anime.js timeline (`createTimeline({autoplay:false})`, `tl.seek(ms)` each
  frame - it seeks deterministically both ways, which frame rendering needs). Always give
  tweens explicit `[from,to]` arrays.
- **Maps**: d3 `geoOrthographic` globe (rotate to follow the route, `clipAngle(90)`, countries
  from `world-atlas/countries-110m.json`, ids are ISO numeric strings: Algeria `012`, Chile `152`)
  and `geoEquirectangular` flat map with a great-circle route (`geoInterpolate`) and a plane
  glyph. Load JSON in Node and inject with `page.evaluate` - `fetch()` fails on `file://`.
- **Journey-map recap** (from the journey-mapping skill): <=7 phases, sentiment curve, feelings as
  adjectives, pain points as gerunds, opportunities as change verbs, 2-3 flagged moments of
  truth, and make the final phase the emotional peak (peak-end rule). Pitch the audio "dings"
  from the curve's values.
- **Facts**: compute distances (`d3.geoDistance * 6371`) instead of asserting them; avoid
  claims that change with the season (e.g. Chile's UTC-4/-3) - show both or omit.
- **Fonts**: Poppins (headings) / Lora (accent) via `@fontsource` woff2 files + `@font-face`;
  DejaVu/WenQuanYi are system fallbacks for Arabic/CJK bubbles. Emoji are not available - draw
  hearts, clocks, hourglasses as shapes. Characters are stylised; ask before assigning identities.

## Skills this workflow draws on (invoke them when the task warrants)

`animejs-repo-dev` (library behavior), `brand-palette-type` (type + neutrals),
`design-skills:journey-mapping` (recap scene), `design-skills:design-elevation` (restraint,
palette discipline). `chrome-browser`, `session-start-hook`, `setup-writing-style` do not apply to
video work - say so rather than force them in.

## Pitfalls

- A pop/ring keyed to absolute time inside a scene that receives local time `u` shows up at the
  wrong moment - convert with `U2T(u)` or pass absolute `t`.
- Wipes hide ~0.8 s; don't put a key visual beat inside one.
- 24 MB at crf 18 is fine for upload; raise crf to ~22 if a size cap appears.
