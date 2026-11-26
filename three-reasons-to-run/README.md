# Three Reasons to Run (9:16 TikTok motion graphic)

Rendered video: `three-reasons-to-run.mp4` (1080x1920, 30 fps, H.264 + AAC, 15.0 s, with voiceover).

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
