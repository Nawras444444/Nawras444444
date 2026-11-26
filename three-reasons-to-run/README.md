# Three Reasons to Run (9:16 TikTok motion graphic)

## v2 (current): `three-reasons-to-run-v2.mp4`
- Every image is full-screen, with no frames. Each scene goes from the studio photo to its cinematic panel (cheetah eating, gazelle leaping, cat pooping).
- Slow 0.85 s crossfades with a warm light flare, and slow camera push-ins and pans on every shot.
- Glowing icon badges cut from the panel image. The full 3-panel image is the outro.
- The panel image and the cat photo were upscaled 4x with Real-ESRGAN so they stay sharp at 1080x1920.
- Re-render: `node render.js 30 three-reasons-to-run-v2.mp4`

v1 (framed, neo-brutalist): `three-reasons-to-run-v1.mp4` / `index-v1.html`


Rendered video (v1): `three-reasons-to-run-v1.mp4` (1080x1920, 30 fps, H.264 + AAC, 15.0 s, with voiceover).

## Timeline (synced to the voiceover's word timestamps)
| Time | Scene | VO |
|---|---|---|
| 0.00 – 2.05 | Intro: kinetic type and three photo chips | "Every runner has a reason." |
| 2.05 – 4.40 | 01 / The Hunter: cheetah push-in, speed streaks, **HUNGRY** stamp | "The cheetah runs because he's hungry." |
| 4.40 – 7.45 | 02 / The Survivor: skittish hops, red alarm shake, **SURVIVAL** stamp | "The gazelle runs because he does not want to die." |
| 7.45 – 12.25 | 03 / The Twist: **PURE CHAOS** wobble, then motion-blur zoomies, **JUST POOPED** stamp | "And the cat? Pure chaos. He runs because he just pooped." |
| 12.25 – 15.00 | Summary rows and comment CTA | "Tell me you've seen that 3AM zoomie." |

Captions highlight each word karaoke-style as it is spoken. Key words turn gold.

## Files
- `index.html`: the composition (GSAP timeline). Open it in a browser and press play to preview it with audio.
- `render.js`: frame-accurate renderer. Playwright seeks the timeline frame by frame and pipes the frames to ffmpeg, which muxes in the voiceover.
- `assets/`: the animal photos, the voiceover, and a local copy of gsap 3.12.5.

## Re-render
```bash
node render.js 30 three-reasons-to-run.mp4   # needs playwright + ffmpeg
```
To retime a scene, change the times in `WORDS` and the scene boundaries in `index.html`.
