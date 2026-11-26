---
name: norostyle
description: Nawras "norostyle" motion-graphics montage. Animate a flat poster/illustration (Arabic text, collage, comic, characters, icons) so every element flies in from outside or forms in place, each time with a different technique and direction, assembled in a fixed order (background pieces → characters → shapes/symbols → text last), with sparse matching sound effects. Use when the user says norostyle, "نوروستايل", or asks to animate an image with these montage rules.
---

# norostyle — montage rules (from the user, do not change)

1. **Every element starts outside its place, then takes its place.** Direction changes every time (8 directions: N S E W NE NW SE SW). Never two consecutive elements from the same side; never one side for the whole montage.
2. **Background is assembled piece by piece**, following the real pieces in the image (torn paper, colour blocks, panels).
3. **Small elements (shapes, symbols, icons, arrows, rays, underlines)** mix three behaviours: they *arrive* (from outside), they are *hidden then appear*, or they *form / get pulled* (stretch, unfold, rubber-pull, mosaic, slices, draw-on).
4. **Order:** background first → main + secondary characters second → shapes & symbols third → **text last**.
5. **Text forms differently every line** (typewriter, mosaic, blur-rise, stamp, slices, marker, flip, drop-bounce, spin, glitch). Words reveal in Arabic reading order (right → left).
6. **Variety library:** `scripts/noro.js` holds 38 techniques × 8 directions × 4 easings = **1216 entrance variants** (more than the 500 the user asked for). A seeded picker never repeats a technique within the last 4 elements, nor a direction within the last 2.
7. **Sound only where needed**, one sound per element (not per word, no music wall): technique→sound map in `noro.js` (`SOUND`), synthesized in `scripts/audio.py` from the exported `schedule.json`. Keep a very low pad bed. Never exaggerate.

## Technique classes (noro.js `TECH`)
- **outside** (backgrounds, characters): slide, spin, arc, slam, stop-motion, flip, zoom, stretch, tumble, pendulum
- **reveal** (hidden → appears): wipe, iris, torn-wipe, blur-focus, flicker (light switching on), pop, stamp, flipX, mosaic, pixel, shutter, draw-on, glow
- **form** (forms / pulled): stretchF, unfold, rubber, grow, slices
- **text**: type, mosaicT, blurT, stampT, slicesT, marker, flipT, drop, spinT, glitch

## Pipeline (same tooling as image-to-motion-graphics)
1. Inspect the image; crop regions to find every element.
2. `scripts/prep.py` (adapt per image): characters via `rembg` (isnet-general-use) + colour-key fixes; background pieces by colour classes → connected components → each piece cut out; hidden areas behind characters filled with a tiled texture of the same piece; text matted per word (manual split x if Arabic gaps are ambiguous); paper/notes with text inpainted out; strokes/arrows/rays by colour key. Verify rest composite vs original (diff < ~4) and look at it.
3. `scripts/anim_t.html`: register sprites in the rule order with `add(sprite, class, t0, dur, opts)`; `NORO.pick` chooses tech/dir/ease. Idle life after the last entrance (glows, breathing, slow camera push), hold ~3s.
4. `node scripts/render.js t1,t2,...` for preview frames → contact sheet; then full render (writes `schedule.json` + `video_silent.mp4`), `python3 scripts/audio.py`, mux with ffmpeg (aac 160k).
5. Deliver MP4 in `motion/`, send with SendUserFile, commit & push. Reply in Arabic with a table: element → technique → direction → sound.
