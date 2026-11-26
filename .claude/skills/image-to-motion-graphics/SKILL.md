---
name: image-to-motion-graphics
description: Turn a flat illustration or infographic image (characters, icons, rings, charts) into a calm motion-graphics MP4 where elements appear one after another. Use when the user asks to animate an image, "حرّك العناصر", "موشن جرافيكس", or wants staggered element-by-element reveals from a single PNG/JPG.
---

# Image → Motion Graphics (element-by-element reveal)

Pipeline: **split image into alpha layers → HTML timeline driven by `render(t)` → Playwright frames → ffmpeg MP4.**
Defaults: Premium/calm archetype, ease-out entrances (cubic/quart), sine-in-out wipes, <=8% overshoot, 30fps, ~15s.

## Steps
1. **Inspect** the image (Read it). Crop contact sheets of regions to get exact pixel coordinates of every element (rings, panels, icons, bursts, connectors, bars, characters).
2. **Extract layers** – copy `scripts/extract.py`, edit the coordinates/masks for the new image, run it. It writes `L/<name>.png` (RGBA, cropped) + `meta.json` (x,y,w,h), plus `rest.png`/`diff.png` to verify.
   - Masks: rect/rounded-rect/circle/annulus/band(polygon) for icons, rings, panels, connectors; colour key (+largest connected component) for shapes over other art (e.g. yellow arrow).
   - Panels: inpaint icon rectangles (`cv2.inpaint`) so icons can animate separately; don't fill with a sampled colour (may sample the icon itself).
   - Characters: split a touching pair with a per-row polygon boundary (hard, non-overlapping masks, no AA overlap).
   - Anything that sits on top of characters (bars, arrow, badge): inpaint the hole in the character layers, and **make that element appear BEFORE the characters** so the inpainted hole is never seen.
   - Use **normal alpha compositing, not multiply** (multiply double-darkens overlaps).
   - Verify: composite all layers at rest, diff vs original (mean diff should be <~0.5), view `chars_only.png`.
3. **Timeline** – copy `scripts/anim_t.html`; replace `__META__` with `meta.json` contents (`anim.html`); edit the `T` start-time table and per-element motion in `render(t)`. Keep `render` a pure function of time.
   - Ring/arc reveal: `conic-gradient` mask sweep. Lines/arrow/bars: `clip-path: inset()` wipes. Panels: centre-out inset reveal + slide 40px. Icons: rise 18px + scale .8→1. Characters: slide 70px from sides + fade. Badge/bursts: ease-out-back pop.
   - Choreography: <=1/3 of elements moving at once, stagger 0.3–0.5s, hero (characters) last. Ambient: blurred drifting blobs; idle float/breathe (±3px, 0.2Hz) ramped in with smoothstep after the last reveal; hold ~3s at the end.
4. **Preview** key frames: `node render.js 1.0,3.5,6.9` → `f_<t>.png`; build a contact sheet and Read it.
5. **Render**: `node render.js` (needs `playwright`, `ffmpeg`; `pip install opencv-python-headless numpy pillow`). Output `out.mp4` (h264, yuv420p, crf16). Viewport must be even-sized (crop odd widths).
6. Copy MP4 to the project (e.g. `motion/`), send with SendUserFile, commit & push if asked/hooked.

## Notes
- Work in the scratchpad dir; scripts expect `src.png`, `L/`, `meta.json`, `anim.html` in cwd.
- Reply to the user in their language (Arabic if they write Arabic) with a short table of reveal order/timing.
