# Special Design — design system

Everything here is already implemented in `assets/template.html`. Read this when you need to change a
token, add a background, or explain a choice to the user.

## Contents
1. Frame and TikTok safe area
2. Backgrounds (five, from the reference boards)
3. Typography
4. Icons
5. Captions (narrator text)
6. Latin translation tags
7. Motion system and transitions
8. Sound effects
9. Accessibility and the interactive page

## 1. Frame and TikTok safe area
- Canvas 1080×1920 (9:16). The page scales one stage with container units (`cqw` / `cqh`).
- Safe area: top 11.5%, bottom 22%, right 13% (TikTok's like/comment/share column), left 6%.
  Every word and every icon stays inside it. The bottom 22% is left to background only.
- Grid rows inside the safe area: header (wordmark, no numbering) → headline block → art (fills the rest) → caption band (13.5cqh).
- A dashed safe-area guide can be toggled from the panel to check placement.

## 2. Backgrounds
Five classes; alternate them so neighbouring scenes never share one. Each sets its own text, accent, caption and tag colours.

| class | look | headline | accent | taken from |
|---|---|---|---|---|
| `bg-grid` | near-black #0A0C12, fine 6×12 grid, drifting orange glow | white | #FC7702 | dark grid poster with glowing object |
| `bg-navy` | radial light beam from the top, #023661 → #0A0C12 | white | #FC7702 | blue "Photoshop shortcuts" card, navy/orange palette |
| `bg-blush` | flat #FCE9EC | navy #023661 | rust #DB5227 | pink "ظاهرة كونية" lettering card |
| `bg-sunset` | vertical #541A2E → #B51A2B → #FFA586 → #384358 → #161E2F | white | peach #FFA586 | navy/red/peach gradient palette |
| `bg-gold` | radial navy #22355F → #14213D | white | gold #FCA311 | "Black and Gold Elegance" palette |

When the user brings their own brand colours, replace the token values and keep the structure (one flat light ground, one flat dark ground with grid, three atmospheric gradients).
Earlier rounds used other rules (orange/charcoal only; white + purple with orange text on white and charcoal on purple). If the user states colour rules, they override this table.

## 3. Typography
- Headlines: **Kufam** italic 900 (Google Fonts). Heavy, slanted Kufi in the spirit of hand-lettered Arabic logotypes. The headline block is rotated −3.5° with a rounded accent bar under it.
  Sizes: headline 9.4cqw, hero 14.5cqw, list words 7.8cqw (6cqw for 4-item two-column lists, 9cqw for one-column lists).
- Body and captions: **IBM Plex Sans Arabic** 500–700.
- Latin tags: **Weird Talks** (Salamahtype), embedded as base64. Personal-use licence only; tell the user, and swap the font for commercial work.
- Arabic: never letter-space, never type letter by letter, never animate single letters (it breaks joining). The ellipsis "…" is set in Plex (`.ell`) because Kufam lacks a good glyph.
- Do not claim to know the font of a reference image; say the chosen font is "close in spirit".

## 4. Icons
- Primary: the user's 3D sticker icons, cut out with `scripts/cutout_icons.py`, 520 px WebP with a soft drop shadow.
- Sizes (relative to the art box): L `min(68cqw,100cqh)` hero, M `min(40cqw,64cqh)`, S `min(27cqw,44cqh)`, XS `min(19cqw,30cqh)` for faint context icons.
- One hero icon per scene, two or three supporting icons. Faint context icons (`soft`) say "what the screen doesn't show".
- Options per icon in the SCENES array: `halo` (glow behind), `soft` (55% opacity), `fade:t` (dissolves after t s), `aside:t` (put aside: slides down-left and fades), `away:t` (drifts up and shrinks).
- Line icons (SVG, `currentColor`) are a fallback when no 3D set is supplied; earlier versions of this work used them.

## 5. Captions
- The whole narration appears on screen, phrase by phrase, synced to the audio: `cap: [[seconds-into-scene, "phrase"], ...]`.
- Phrases come from the transcript segments (`timeline.json`), but the **text is the authored script**, never the raw transcript.
- One fixed corner: the caption band at the lower right of the safe area, framed by two corner brackets.
- Three entrance motions rotate per phrase: rise (slide up + fade), wipe (clip reveal right→left), focus (blur → sharp). The previous phrase fades out in 0.25 s.
- Small caption text on white needs a deeper tone than brand orange (#D96500) to stay readable.

## 6. Latin translation tags
- A small rotated label with an English translation of a key Arabic word or line appears near it, holds ~2.4 s, then lifts away. The Arabic is never removed.
- Headline tags: `tags: [[seconds, "ENGLISH"]]` (bottom-left of the headline block). List rows carry their own tag as the 4th element.
- Keep translations short and literal: CURIOSITY, PAUSE, HONEST TALK, MORE THAN AN IMAGE.

## 7. Motion system
Built with the motion-design skill. Personality: premium-calm, with playful pops for icons.
- Signature curve: ease-out quart for entrances; ease-in-out quart for transitions and exits; ease-out-back (≈10% overshoot) for icon and tag pops.
- Durations: quick 0.4 s, standard 0.65 s, slow 1.1 s. Scene transition 0.75 s.
- Three layers: primary (headline, hero icon), secondary (tags, drop shadows, supporting icons), ambient (background glow drift, slow 4.6 s icon bob).
- Transitions rotate: `wipe` (diagonal, right→left for RTL), `iris` (circle opening from the glow), `push` (new card pushes old up and dims it), `zoom` (zoom-through). Scene 1 fades in.
- Stagger inside a scene stays under ~0.5 s between related elements; nothing moves behind text continuously.
- `prefers-reduced-motion`: everything snaps to its end state; meaning never depends on motion.

## 8. Sound effects
- `scripts/make_sfx.py` synthesizes whoosh / tick / chime, so there are no licensing questions.
- Cues come from the page itself (`window.__sfx()`): whoosh 0.25 s before each scene, tick on each list item, chime on the closing line. Mixed well under the voice.

## 9. Interactive page
- Cover with two buttons: "ابدأ الحكاية مع الصوت" and "تصفّح بلا صوت". Nothing plays before a click.
- Previous/next, play/pause, mute, restart, segmented progress bar, scene name. Arrow keys follow RTL (← next, → previous), Space toggles play.
- Panel: clean voiceover text with copy button (falls back to selecting the text), safe-area toggle, effects toggle, per-scene durations that re-sync captions (saved in localStorage).
- Never add fake "generate voice" or "export video" buttons; never claim audio or video exists unless it was produced.
