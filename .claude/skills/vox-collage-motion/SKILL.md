---
name: vox-collage-motion
description: Turn still images or storyboard sheets into Vox-style paper-collage explainer clips (MP4 with sound) where the elements inside each picture move - the subject is cut out with a white sticker border and pops off a halftone paper hole, a red arrow slides behind it, the background plate drifts, and a headline, data badges, dashed connector lines, a torn caption and a "VOX" stamp animate on top, with synthesized sound effects. Use this whenever the user wants Vox / editorial / paper-cutout / collage / halftone animation, wants "the elements in the picture to move", wants to animate a storyboard grid panel by panel, or asks (in Arabic or English) to make videos/reels from images in this style - e.g. "حرّك عناصر الصورة", "بأسلوب Vox", "فيديو لكل صورة", "طبقها على كل الصور" - even if they don't say "skill" or name the tools.
---

# Vox collage motion

Turn pictures into short Vox-style clips where the picture's own elements move: the main subject becomes a paper cut-out that pops and drifts over its own paper hole, so a flat image gets real depth. One clip per picture (or per storyboard panel), 1920x1080, 30 fps, about 6.5 s, AAC soundtrack.

The look comes from the collage, not from camera moves over a whole sheet. When the user hands over a storyboard sheet with many panels, they almost always want each panel as its own clip, with its own elements moving, not one camera pan across the sheet.

## Pipeline

All scripts are in `scripts/`; the clip template is `assets/template.html`. Work in a project folder of your choice, `PROJ`:

```
PROJ/
  index.html   <- copy of assets/template.html
  data.js      <- generated (step 4)
  assets/      <- generated cut-outs + plates (step 3)
  videos/      <- rendered MP4s (step 5)
```

1. **Dependencies** (once): `pip install rembg opencv-python-headless` (the first cut-out downloads a ~180 MB model). You also need ffmpeg and Playwright with Chromium. GSAP and the Google Fonts load from CDNs, so rendering needs network access to cdnjs and Google Fonts.

2. **Split sheets into panels** (skip if the user gave single images; put each one in a panels folder as `<group>_<n>.png` with a `list.json` of ids). Look at each sheet first and write `sheets.json` with the grid you see:
   ```json
   [{"file": "scene-02.jpg", "prefix": "02", "cols": 2, "rows": 3},
    {"file": "scene-08.jpg", "prefix": "08", "cols": 2, "rows": 3, "merge_last_row": true},
    {"file": "scene-06.jpg", "prefix": "06", "boxes": [[0,0,805,335],[812,0,1535,335]]}]
   ```
   `python3 scripts/split_panels.py sheets.json panels/`. Make a contact sheet of the crops and look at it before going on. A wrong grid wastes the whole render.

3. **Cut out subjects + build plates**: `python3 scripts/prep_layers.py panels/ PROJ/assets/`. Make a contact sheet of the `_cut.png` files on a coloured background and check it. Partial cut-outs are fine: they sit exactly over their own spot, so they still read correctly at rest. Panels with no clear subject (landscapes, close-ups of beans, text banners) come out plate-only, and the template still animates the plate and graphics. Tell the user which panels came out like that.

4. **Texts**: write `texts.json` (format in the `make_data.py` docstring). Give each group a title, kicker, badge and sound mood, and each panel its own short caption, in the user's language. Captions should describe what is in that panel, because 40 clips with the same text feel broken. Then run `python3 scripts/make_data.py PROJ/assets/meta.json texts.json PROJ/data.js` and `cp assets/template.html PROJ/index.html`.
   Sound moods: `wind` (mountains/nature), `pluck` (hand-made/picking), `sun` (warm/drying), `fire` (roasting/heat), `machine` (grinding/factory), `travel` (shipping/transport), `pour` (liquid/brewing), `finale` (closing chord).

5. **Preview 2-3 clips first**, then render. Screenshot a few panels at t=1.3 s and t=5 s (`index.html?p=<id>&render=1&rec=1`, then call `tl.time(t)` in the page) and look at them. Then render only a handful: `node scripts/render.js PROJ --only 01_6,02_3,03_6`. Send those to the user and ask before rendering the rest. A full set takes about 45 s per clip per worker (`--workers 2` on 4 cores). Rendering 49 clips unasked burns 40 minutes on something the user may want changed. They asked for exactly this sample step before.
   Full run: `node scripts/render.js PROJ --workers 2`. It resumes and skips finished clips.

6. **Check and deliver**: `ffprobe` each output for a video and an audio stream, and pull a frame or two to look at. Send the files to the user, then commit and push them if you're in a repository.

## The template (what moves, and where to tweak)

`assets/template.html` is one self-contained page on a fixed 1920x1080 canvas, scaled to fit the window. Open it as `index.html?p=<id>` for a live preview with controls: prev/next, play-all, scrubber, mute and record mode. Timeline, in seconds:

| t | layer | motion |
|---|-------|--------|
| 0-0.6 | grid paper, red/black halftone clusters, black torn block | fade / spring pop / slide |
| 0.3 | panel card (background plate) | lands from the right with a tilt; the plate Ken-Burns-zooms for the whole clip |
| 0.85 | red arrow (points left = forward in RTL) | clip-reveal behind the subject's upper third; with no subject it rides the card's top edge |
| 1.05 | cut-out subject | pops off its halftone paper hole, then drifts against the plate (parallax); 8 fps stop-motion wiggle |
| 1.3 | kicker + headline (top right) | slide in, red + black underline grows |
| 1.9 | three dashed connector lines | draw themselves (mask + stroke-dashoffset), end dots pop |
| 2.1 | data badge, "n of N" badge | spring pop |
| 2.7 | torn caption card (bottom left) | wipe reveal, text rises |
| 3.3 | stamp (default `VOX / تحليل`) | slaps down with overshoot |

To change the timing, edit the `tl.fromTo(...)` lines. To change colours, edit the `:root` palette. To change layout, edit the `#head`, `#badgeW`, `#capW` and `#stampW` CSS and the card box (`maxW`, `maxH`, `CX`, `CY`). Per-clip data comes from `data.js`: `title`, `kicker`, `badge`, `caption`, `stamp`, `mood`, `dur` and `dir` (`rtl` default, `ltr` for English).

Sound is synthesized in the page with Web Audio, so there are no audio files and no licensing questions. The same score plays live and renders offline to WAV for the MP4. It has common hits (whoosh when the card lands, pop when the subject appears, paper flips, badge pops, stamp slap) plus a bed chosen by `mood`.

## Things that went wrong before (and the fix that's already in)

- **Smeared inpainting behind the cut-out looked ugly** whenever the subject moved. The hole is filled with cream paper and halftone dots instead, which reads as a deliberate collage layer.
- **Stretched arrowhead**: the arrow polygon is built in pixels so the head keeps its proportions at any panel width.
- **Very wide panels** (such as a text banner) cover their own text if the arrow runs through the middle. Plate-only panels get the arrow on the top edge.
- **Seeking**: every tween is a `fromTo` on one paused timeline, so `tl.time(t)` gives the same frame every time. Keep that property when you add tweens; plain `.to()` chains can render wrong when you seek out of order.
- **Vertical (9:16) reels**: the canvas is fixed at 16:9. For Reels, change the stage to 1080x1920 and re-place the card, headline and caption, and render with a 1080x1920 viewport. Check the result by eye.
