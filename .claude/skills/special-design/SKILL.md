---
name: special-design
description: Builds a complete Arabic visual story (RTL) for social video, from a script or a voiceover recording to a finished 9:16 TikTok/Reels MP4 plus an interactive web Artifact. It includes scenes with 3D icon stickers on editorial backgrounds, bold slanted Kufi headlines, the full narration as synced on-screen captions inside the TikTok safe area, short English translation tags that appear and go, designed transitions and quiet sound effects. Use it whenever the user wants an Arabic awareness, explainer, educational or storytelling video, reel, TikTok, story or carousel. Also use it when they send a voiceover/WAV and images or icons and ask for a video "synced to the audio", or ask for "special design" or the «بيننا شاشة» style, even if they don't say "skill" or name every feature. Works for sensitive topics too, such as health, relationships and habits, with a calm, non-preachy tone.
---

# Special Design

An Arabic story-video pipeline. One HTML page is both the interactive Artifact and the video source, so the
two always match. Every visual is a pure function of time (`window.__render(t)`). Playwright screenshots
each frame, and ffmpeg muxes the frames with the cleaned voiceover and sound effects.

Read `references/design-system.md` before changing tokens, backgrounds, motion or captions.

## Working agreement with the user
- If the user says to wait until they send the audio or images, wait. Confirm in one line and don't build yet.
- The user's explicit rules win over this skill. That covers colours, which text colour goes on which background, sizes, fonts and aspect ratio. Earlier rounds of this work changed colour rules three times. Restate the current rule back to the user only if it is ambiguous.
- Reply in the user's language (usually Arabic). Keep status lines short while long renders run, and send the video as soon as it exists.

## Content guardrails (why: these videos often cover sensitive habits)
- No explicit imagery, nudity or suggestive visuals. Show "the screen" as an abstract block, light or a closed window.
- No invented statistics, quotes, sources, or claims about the brain or hormones. No promise of instant recovery.
- Treat people with dignity. Neither gender is "the problem", and viewing is not assumed to be addiction. A relationship is not presented as a cure.
- Use no logos, account names or signatures from reference images. Skip icons that carry a brand (e.g. a branded watch) and draw or pick a neutral one instead.

## Pipeline

### 1. Gather inputs
- Script or voiceover text, split into scenes, plus the on-screen text for each scene.
- Voice recording (WAV/MP3), if any.
- Icons: a 3D set (often inside a .docx or zip), extra PNG/SVG packs, and any photos.
- References: palette boards and lettering examples. Take the backgrounds and the type mood from these.
- Fonts: Arabic display style taken from the references, plus any Latin font file for the tags. Check the font's licence file.

### 2. Clean and align the audio
```bash
pip install -q faster-whisper
python3 scripts/prepare_audio.py voice.wav WORKDIR          # → voiceover-clean.wav, voiceover.mp3, timeline.json
```
TTS tools often read "المشهد رقم ٣" aloud. The script cuts those labels at the middle of the surrounding silences, adds a 0.6 s lead-in and a 3 s tail, and reports the scene starts.
Check every cut point by transcribing about 5 s around it. Tell the user what was removed, and keep their original file untouched.
If there are no spoken labels, choose scene starts from `segments` (the first phrase of each scene).

### 3. Prepare the visuals
```bash
pip install -q "rembg[cpu]"
python3 scripts/cutout_icons.py assets/3d --docx icons.docx --names man,woman,phone,...
```
Open `_sheet.png` and name icons by what they show. Labels inside documents can be out of order: in the source pack, images 31–41 didn't match their captions.
Extra packs in a different style (e.g. isometric social icons) work as small accents, two to four in total. Photos can be turned into duotones with PIL if the brief wants brand colours.

### 4. Build the page
```bash
python3 scripts/build_page.py OUT/index.html                 # template + embedded tag font
python3 scripts/make_sfx.py OUT/assets                       # whoosh / tick / chime
```
Then edit only the `SCENES` and `VO` arrays in `index.html`. Each scene sets:
- `bg`: one of `grid`, `navy`, `blush`, `sunset`, `gold`. Alternate them.
- `tr`: one of `wipe`, `iris`, `push`, `zoom`.
- Text: `h` lines, `hAt`/`h2At`, optional `sub` and `outro`.
- `rows`: lists of word + time + icon + English.
- `art`: icon placements (`[src, x%, y%, L|M|S|XS, appearAt, {halo|soft|fade|aside|away}]`).
- `tags`: English tags that appear and go.
- `cap`: the full narration, phrase by phrase, in seconds from scene start.
- `dur`: scene length in seconds.

Set the `dur` values from `timeline.json` so the scenes add up to the clean audio length. List reveals and tags should land on the spoken word, so take their times from the segments. Use the authored script text for captions, never the raw transcript.

### 5. Check frames before rendering
Render about 10 sample frames, one per scene late in the scene, with Playwright at 1080×1920, and look at them as a contact sheet. Problems seen in practice:
- Headlines too big, so the art collapses. Shrink the type before shrinking the icons.
- Two-column lists overflowing the left edge in RTL. Reduce the word size or gap, or use one column.
- Tags colliding with the next column.
- A missing `[hidden]{display:none!important}` makes hidden panels show in local renders, because the local file lacks the Artifact skeleton.
- Leftover numbering. Remove "01 / 10" style counters if the user asks.
Fix everything in one pass, then render.

### 6. Render and deliver
```bash
node scripts/render_video.js OUT/index.html SCRATCH/silent.mp4          # ~15 min for 2:45 at 24 fps; run in background
python3 scripts/mux.py SCRATCH/silent.mp4 WORKDIR/voiceover-clean.wav OUT/assets SCRATCH/cues.json OUT/video.mp4 \
        --stills OUT/stills --starts 0,16.58,32.06,...
```
- Render into scratch space and mux into the project only at the end. A half-written MP4 is easy to commit by mistake.
- Publish the Artifact while the render runs, with the same file path each time so the link stays the same. Pass the images, audio and SFX through `files`.
- When the video is done, send the MP4 (display: render) and the scene PNGs (attach). If the user asked to commit and push, do that too.

### 7. Final message (in the user's language)
- The Artifact link and what the video is (size, duration, synced).
- What changed this round, grouped and short.
- Things the user must know: font licences, removed audio labels, icon label mismatches, file size.
- The clean voiceover text block and a scene table (scene → visual → on-screen text) when the brief asks for them.

## Other formats
- 16:9: change the stage `aspect-ratio`, the render viewport (`--w 1920 --h 1080`) and the safe-area variables. The scene data stays the same.
- Stills or a carousel only: render `__render(t)` at each scene's end and skip the video.
