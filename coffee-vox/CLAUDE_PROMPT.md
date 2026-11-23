# تعليمات وبرومبت كلود (Claude) — تحريك فيديو «رحلة القهوة» بأسلوب Vox

## طريقة الاستخدام السريعة (من الهاتف أو الكمبيوتر)
1. فك ضغط ملف `coffee-vox-claude-kit.zip`.
2. افتح محادثة جديدة في **Claude**.
3. ارفع هذا الملف `CLAUDE_PROMPT.md` (ويمكنك رفع صورة أو صورتين من مجلد `scenes/` كمرجع بصري للألوان والتقسيم، مثل `scene-01-mountains.jpg` و `scene-06-shipping.jpg`).
4. اكتب لكلود رسالة واحدة فقط:
   > `نفّذ التعليمات الموجودة في CLAUDE_PROMPT.md بدقة كاملة.`
5. بعد أن ينشئ كلود المعاينة (**Artifact**):
   - اضغط زر **رفع المشاهد (Upload 8 Scenes)** في الشريط السفلي، وحدد الصور الـ 8 من مجلد `scenes/` دفعة واحدة.
   - سيقوم الكود بترتيبها تلقائياً من `scene-01` إلى `scene-08` وتشغيل الفيديو المتحرك مع الصوت فوراً.
6. **لتصوير الفيديو من الهاتف (تيك توك / ريلز / شورتس):**
   - اختر المقاس المطلوب (`9:16` أو `16:9` أو `3:4`).
   - اضغط زر **وضع التصوير (Record Mode)** لإخفاء أزرار التحكم، ثم شغّل مسجّل الشاشة في هاتفك واضغط في منتصف الشاشة لبدء التشغيل.
7. **للتشغيل المحلي بدون إنترنت:**
   - احفظ الكود باسم `index.html` داخل مجلد `coffee-vox-claude-kit/` (بجانب مجلد `scenes/`) وافتحه في متصفح Chrome.

---

## البرومبت الجاهز لكلود (انسخه أو ارفع هذا الملف مباشرة)

```text
Create a single-file, self-contained, responsive HTML/CSS/JS animated **Vox Media editorial explainer video** titled **"رحلة القهوة — Vox Style"** (Arabic RTL) using **GSAP 3** (via CDN) and synthesized **Web Audio API** sound effects.

### Project Assets (8 Chronological Storyboard Sheets)
I have 8 high-contrast Vox paper-collage storyboard sheets saved in `scenes/` (and I will also load them via an in-app multi-file upload button inside Claude Artifacts):
1. `scenes/scene-01-mountains.jpg` — **في أعالي الجبال** | Sub: `حيث تبدأ حكاية رشفة` | Badge: `1800 متر` (2x4 grid: misty mountains, coffee branches, farmer harvesting, coffee basket, farm house).
2. `scenes/scene-02-picking.jpg` — **تُقطف بعناية** | Sub: `حبة صغيرة… تحمل تعب موسم` | Badge: `100% يدوي` (2x3 grid: hands picking ripe red cherries, handful of cherries, pouring into woven basket, farmer smiling).
3. `scenes/scene-03-drying.jpg` — **تُجفف تحت الشمس** | Sub: `وتنتظر بصبر تحت الدفء` | Badge: `14 يوم` (2x3 grid: drying beds, close-up beans, hands turning beans, farmer raking beans in sunlight).
4. `scenes/scene-04-roasting.jpg` — **ثم تدخل النار** | Sub: `فتتغير رائحتها ولونها` | Badge: `210° مئوية` (2x3 grid: raw beans poured into roaster, rotating drum with steam, dark roasted beans scooped and bagged).
5. `scenes/scene-05-grinding.jpg` — **تُطحن وتُعبأ** | Sub: `لتستعد لرحلتها حول العالم` | Badge: `15 درجة` (2x3 grid: grinder hopper, fresh ground coffee pile, metal scoop, automated bag filling line, finished bags).
6. `scenes/scene-06-shipping.jpg` — **تعبر البحار والقارات** | Sub: `لتصل إلى يدٍ تنتظرها` | Badge: `14k كم` (Dynamic full-page Vox collage: burlap sacks & forklift, delivery truck on mountain road, container ship & port, world map with red/yellow shipping routes, global cities & coffee cup).
7. `scenes/scene-07-brewing.jpg` — **هنا… تتحول** | Sub: `كل خطوة إلى رائحة ودفء` | Badge: `92° مئوية` (2x3 grid: barista measuring coffee, pour-over blooming, glass carafe dripping, pouring into speckled ceramic cup, barista serving).
8. `scenes/scene-08-finale.jpg` — **رحلة القهوة… من الطبيعة إلى فنجانك** | Sub: `لأن خلف كل رشفة رحلة تستحق التقدير` | Badge: `☕` (Top 2x2 tasting & smiling panels + bottom wide Arabic title banner).

### Visual Style & Authentic Vox Motion Design
- **Color Palette:** Warm newsprint beige (`#f5f1e8`), ink charcoal (`#1a1a1a`), crimson red (`#d62828`), mustard yellow (`#f4a261`), and coffee brown (`#3a2013`).
- **Typography:** Load Google Fonts `Amiri` (700/900) for editorial headlines and `Tajawal` (400/700/900) for subtitles, badges, and UI. Full `dir="rtl"` Arabic layout.
- **Virtual Vox Camera (CRITICAL):** Do NOT just show static full storyboard pages! For every scene, use a GSAP timeline to animate a **virtual camera** (`scale`, `xPercent`, `yPercent`) that zooms into 2–3 distinct panels on that sheet in sequence (Ken Burns + snappy Vox editorial whip-pans with `power3.inOut` easing), then pulls out briefly before transitioning to the next scene.
- **Tactile Paper-Collage Polish:**
  - Subtle **8fps stop-motion paper wiggle** (`steps(1)`) on overlays, badges, and SVG accents.
  - **Torn-paper wipe transition** (SVG jagged paper mask sliding across the stage) between scenes.
  - Animated Vox editorial overlay per scene: bold Arabic title sliding in from the right with a growing crimson red underline (`scaleX`), subtitle fading up, circular red/gold data badge popping in with `back.out(1.7)`, and animated dashed SVG accent lines.
  - Subtle film/paper grain overlay (`feTurbulence` SVG noise at low opacity) over the entire stage.

### Synthesized Web Audio API Sound Effects (Zero External Audio Files)
Build a lightweight Web Audio API SFX engine with a Mute/Unmute button:
- Scene 1: Soft mountain wind whoosh + warm chime.
- Scene 2: Crisp tactile paper-flip + subtle pluck tones.
- Scene 3: Warm sunny harmonic shimmer.
- Scene 4: Low roasting crackle/whoosh + deep warmth tone.
- Scene 5: Rhythmic mechanical grinder pulses.
- Scene 6: Sweeping travel whoosh + two-note arrival chime.
- Scene 7: Gentle liquid pour filtered noise + rising steam shimmer.
- Scene 8: Warm resolving major chord (`C5 - E5 - G5`).

### Mobile-Friendly Controls & Claude Artifacts Compatibility
- Clean dark control bar below the stage:
  - **▶ تشغيل / ❚❚ إيقاف (Play / Pause)**
  - **↻ إعادة (Replay)**
  - **Interactive Progress Bar** + Scene indicator (`1 / 8`) with clickable scene dots to jump to any stage.
  - **Aspect Ratio Switcher:** `16:9` (YouTube), `9:16` (TikTok/Reels/Shorts), `3:4` (Instagram).
  - **🔊 / 🔇 Audio Toggle**.
  - **📁 رفع الصور الـ 8 (Upload 8 Scenes):** Hidden `<input type="file" multiple accept="image/*">` button that accepts all 8 images at once, automatically sorts them alphabetically by filename (`scene-01` through `scene-08`), and loads them via `URL.createObjectURL()` immediately so the full video plays inside Claude Artifacts on mobile or desktop! (Default `<img src="scenes/scene-0X-....jpg">` paths should remain intact so it also works offline when saved locally).
  - **🎬 وضع التصوير (Clean Record Mode):** Hides the control bar and centers the stage full-screen for clean phone screen recording (tapping the stage exits Record Mode or plays/pauses).
- If images are not yet loaded inside Artifacts, display a sleek Vox-styled placeholder card for each scene with a clear prompt button to load the 8 images.

Keep all HTML, CSS, SVG, GSAP 3 animations, and Web Audio JS cleanly structured in a single `index.html` file.
```
