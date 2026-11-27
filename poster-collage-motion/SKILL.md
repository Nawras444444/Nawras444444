---
name: poster-collage-motion
description: Turn a supplied poster image (flat graphic, editorial or newspaper style, with a central figure, orange or colour slash, columns of text and a title block) into a self-contained animated collage HTML page and a 10 s MP4 that rebuilds the poster in a 4.5 s GSAP assembly and then keeps it alive. Use this whenever the user sends a poster, flyer or cover image and asks to animate it, make a motion version, rebuild it as a collage video, or export it to MP4, even if they only say "make it move" or "animate this poster".
compatibility: Python 3 with rembg (u2net model, about 176 MB download on first run), opencv-python-headless, numpy, Pillow; Node with Playwright and Chromium; ffmpeg. Rendering needs network access to cdnjs and Google Fonts.
---

# Poster collage motion

The output is one HTML page (`index.html`) on a fixed 900 x 1204 stage, plus an MP4 rendered from it. The page rebuilds the source poster layer by layer: paper, print metadata, columns that wrap around the figure, an orange slash, the figure cut in three paper pieces, the title block, and grain.

Work in a folder for the poster, `PROJ/`. Put the source image there as `poster.jpg`. Everything below runs from this skill's `scripts/` folder.

## Workflow

1. **Look at the poster first.** Note the stage ratio, the title and subtitle text, the slash colour and where it crosses the figure, and whether the figure's eyes are a split or a clean portrait. These decide the cut-off row and the stripe points. Do not guess coordinates; measure them.

2. **Cut the figure out.**
   `python3 scripts/make_mask.py PROJ/poster.jpg PROJ/build --cut-y <title block top in source px>`
   Look at `figure_mask.png` on a flat orange background. The head and shoulders must be clean. If the background or text leaks in, the poster is not a flat graphic and the mask needs manual tracing. Say so to the user.

3. **Scale the mask to the stage.** The page uses a 900 x 1204 frame. Resize `figure_mask.png` to that size before building, or pass `--stage-h` if the poster ratio differs. Keep the whole poster frame, not only the figure.

4. **Measure the column wrap shapes.**
   `python3 scripts/measure_shapes.py PROJ/build/figure_mask.png PROJ/build/shapes.json`
   Columns 0 and 1 wrap on the figure's right, columns 2 and 3 on its left. If the figure sits far to one side, change `COLS` in the script.

5. **Set the stripe.** Write `PROJ/build/stripe.json` as a list of `[x, y]` points in 900 x 1204 coordinates, covering the slash band in the source. Start from the poster; the default in `build.py` is for the Godfather poster.

6. **Build the page.**
   `python3 scripts/build.py PROJ/build/figure_mask.png PROJ/build/shapes.json PROJ/build/index.html --stripe PROJ/build/stripe.json`
   This fills the template with the Base64 figure, the shapes and the stripe.

7. **Match the title.** Measure the title ink in the source poster and in the render:
   `node scripts/measure_title.js PROJ/build/index.html`
   Compare the bottoms and widths with the source. Adjust `#title` `font-size`, `letter-spacing` and `top`, and `#subtitle` likewise, in `PROJ/build/index.html`. Use Anton for the title and Oswald for the subtitle, as in the template.

8. **Preview, then render.** Take a frame at about 1.5 s and at 4.5 s and compare it with the source. Then render:
   `node scripts/render.js PROJ/build/index.html PROJ/godfather_poster.mp4 10`
   Check that the file has one video stream of 300 frames and a 10.000 s duration with `ffprobe`.

9. **Hand back the files.** Send the MP4 and the HTML. Do not commit or push unless the user asks.

## What the timeline does

The template is one GSAP timeline, paused and driven by `renderFrame(f, fps)`, so every frame is exact. Phases are:

- 0.0–0.9 s: the sheet settles from a 5° tilt. The registration marks pop in with a back ease. The serials scramble into place.
- 0.5–1.7 s: the columns cascade block by block (stagger 0.04).
- 1.3–2.2 s: the orange stripe slashes in with `expo.out` and an ink splat appears.
- 1.8–3.1 s: the torso rises, the head steps in, and the eye band slides in from the right.
- 2.7–4.2 s: the title block slams up and the letters rise from a mask; the subtitle tracks outward.
- After 4.5 s: the figure breathes, the stripe and marks jitter at 8 fps, a light sweep crosses the face, and dust drifts.

## Things that go wrong

- **Text bleeds into the figure.** The shapes are measured from the mask, so check that the mask has no background left in it.
- **The footer shows above the title block.** The footer starts at `yPercent: 140`, so it stays below the sheet until the slam.
- **The image looks soft.** The source is often small. Say so to the user; a larger source makes a real difference.
- **Seeking jumps.** Keep every tween as a `fromTo` on the paused timeline. A plain `.to()` chain renders wrong when seeked out of order.

## Files

- `scripts/make_mask.py`: cut the figure out (rembg), keep the orange ink in the face, cut at the title row.
- `scripts/measure_shapes.py`: column text-wrap polygons from the mask.
- `scripts/build.py`: fill the template with the figure, shapes and stripe.
- `scripts/measure_title.js`: screenshot the title block for measuring.
- `scripts/render.js`: frame-by-frame MP4 render.
- `assets/template.html`: the page template with the timeline.
