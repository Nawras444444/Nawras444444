---
name: tiktok-myth-video
description: Build a 9:16 Arabic TikTok "myth vs correction" explainer video (about 45–60 s) on a white background with four colors, big animated icons, a data chart, generated illustration cards, topic-based background icons, and sound effects, synced to a supplied voiceover. Use when the user wants a short Arabic motion-graphics video from a script plus a voiceover mp3, or a new episode in the same template (e.g. "talent is born, not made?").
---

# TikTok myth-vs-correction video (Arabic, 9:16)

Reusable pipeline built for «خرافة: العمل أكثر ساعات = إنتاجية أعلى». The whole video is **one HTML file driven by a `render(t)` function**, captured frame by frame with Playwright and encoded with ffmpeg. No Remotion install needed.

## What is in this skill
- `template/index.html` — the finished 8-scene video (v3). Copy it, then change texts/timings/images.
- `template/fonts/` — Cairo Arabic + Latin (700, 900), loaded as `CairoX`.
- `template/images/` — example generated scene images (`s1..s8.png`) and their tight crops (`c1..c8.png`).
- `template/sfx_list.txt` — `<sound file> <seconds>` list for the sound-effect track.
- `scripts/transcribe.sh` — Whisper (Arabic) → segment timings of the voiceover.
- `scripts/crop_images.py` — crops generated images around the subject (drops ghost text at top).
- `scripts/render_frames.js` — Playwright frame renderer (run 4 workers in parallel).
- `scripts/build_video.sh` — frames + SFX + voiceover → MP4.

## Design rules (keep these; the user approved them)
- **Whole screen white.** Exactly four colors plus white: navy `#1B2A5C` (text/outlines), red `#F04545` (myth/errors), green `#17B26A` (correction), yellow `#FFC414` (highlight; never as text on white — only as fills with navy text).
- Sticker style: thick navy outlines, flat fills, big icons that fill the screen. Font Cairo 900, Arabic punctuation, Western digits, 2 lines max per caption.
- **Background icons**: four fixed themes (SVG `<symbol>`s in a grid at ~13 % opacity) that change only a few times, by topic: A (clock/battery/brain/?) → B (target/check/gear/bars) → C (phone/bell/timer/coffee) → D (bookmark/share/comment/thumb). Edit `themes=[{id,s,e}]` to move the switch points.
- **Image cards**: each scene has a generated illustration inside a navy-bordered card (`#c1..#c8`) at the bottom. The original scene content is wrapped in `.wrap` and scaled to 0.75 to make room. Do **not** replace the big animated icons with images — the user explicitly wanted the original design kept and images added.
- Chart scene: data points are illustrative only; keep the label «رسم توضيحي» under the chart.
- TikTok safe zones: keep text out of the top ~150 px and bottom ~350 px where possible; progress bar sits at y=58.

## Workflow for a new video
1. **Script → scenes.** Keep the 8-scene skeleton: 1 hook (red ❌), 2 myth equation, 3 why we believe it (brain + battery), 4 correction (formula), 5 chart, 6 split comparison, 7 practical steps with countdown, 8 CTA (نعم/لا + save/share/comment).
2. **Timings from the voice, not the script.** The voiceover decides the length (this one was 57.2 s, not the planned 45 s). Run `scripts/transcribe.sh voiceover.mp3 outdir`, then set each scene's `s`/`e` in the `scenes` array and the `an(el,t,s+offset,…)` entry times inside the scene functions, and update `themes` and `sfx_list.txt`.
3. **Images.** Generate 8 portrait (9:16) images with the same prompt prefix: *"Flat-shaded 3D sticker-style illustration, soft clay-like rendering, on a pure white background, absolutely no text, no letters, no words, no numbers. Thick navy outlines, bold rounded shapes… palette strictly navy #1B2A5C, red #F04545, green #17B26A, yellow #FFC414 plus white; no orange, no brown. Vertical 9:16."* + the scene subject. Save as `images/s1..s8.png`, run `crop_images.py images`.
   - Generators leave ghost text in the top third and drift in style/palette between calls; inspect each result and regenerate off-palette ones (brown/orange).
   - Free-plan image generation is rate-limited per day; generate all 8 in one batch.
4. **Edit text** in `index.html` (Arabic strings, big numbers, chart `data` array, formula). Check each scene visually with a Playwright screenshot of `render(t)` before the full render.
5. **Build:** `NODE_PATH=<global node_modules> scripts/build_video.sh <project_dir> voiceover.mp3 out.mp4 <duration>`. Needs `ffmpeg`, `node` with `playwright`, and Chromium. Frame rendering of ~1700 frames takes a few minutes with 4 workers.
6. **Cover:** open `index.html?cover` and screenshot `render(0)` at 1080×1920.
7. Verify: extract frames with `ffmpeg -ss <t> -i out.mp4 -frames:v 1`, check for tofu boxes, clipped text, overlaps between captions and cards.

## Gotchas learned
- Container has no Arabic font: bundle Cairo woff2 and use `@font-face` with `unicode-range` for both Arabic and Latin subsets (digits live in the Latin file). Wait for `document.fonts.ready` and ~800 ms before capturing so images decode.
- Generated images have an off-white background: `filter:contrast(1.2) brightness(1.06)` on the `<img>` pushes it to pure white; masking the top 26–40 % hides ghost text on full-height images.
- Use `.scene{background:transparent}` — a white scene background hides the icon themes.
- Flash overlays (`s1flash`, `s6flash`) must stay outside `.wrap` so they cover the full screen.
- In SVG text, don't rely on `direction="rtl"`; Cairo shaping handles Arabic fine with plain `text-anchor="middle"`.
- Honesty: Whisper output is only used for timing, never as the published script. The Arabic copy should be reviewed by a native speaker before publishing.

## Extending the series
Same template, new topic (examples from the user's list): «الموهبة تولد ولا تُكتسب؟», «المبتدئ يحتاج كل الأدوات قبل البدء؟», «النجاح يحتاج فكرة عبقرية؟», «كل متابعة تعني جمهورًا حقيقيًا؟», «لا يمكن البدء بدون رأس مال كبير؟». Keep the structure and caption/hashtag block; swap icons, formula, chart data and images.
