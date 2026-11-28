// Generates index.html and compositions/*.html from the story data below.
// Edit the data (times, icons, captions) and run: node tools/build.mjs
// The output is plain HTML, so the files can also be edited by hand or in the desktop app.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const W = 1080, H = 1920, T = 198.27;
const r2 = (n) => Math.round(n * 100) / 100;

/* ------------------------------------------------------------------ */
/* Story data                                                          */
/* ------------------------------------------------------------------ */

const SCENES = [
  { id: "intro", start: 0, end: 22.3, badge: "AI DOCUMENTARY EDIT", col: "cyan" },
  { id: "pixar", start: 22.3, end: 78.8, badge: "CASE 01 • 1997 PIXAR", col: "gold", chap: ["01", "PIXAR"] },
  { id: "redbull", start: 78.8, end: 128.7, badge: "CASE 02 • RED BULL", col: "cyan", chap: ["02", "RED BULL"] },
  { id: "nokia", start: 128.7, end: 177.7, badge: "CASE 03 • NOKIA", col: "gold", chap: ["03", "NOKIA"] },
  { id: "outro", start: 177.7, end: T, badge: "MASTER AI EDITING", col: "cyan" },
];

// [absStart, absEnd, icon, fx, extra]
const VIS = [
  [0, 6.3, "crown", "trio", { minis: ["year-1997", "trash", "nokia-warm"] }],
  [6.3, 9.6, "warning", "glitch"],
  [9.6, 12.8, "chart-up", "rise"],
  [12.8, 22.3, "hud-dial", "cube3d", { tags: ["ROTO", "TRACK", "3D", "GRADE", "120 FPS", "AUDIO"] }],

  [23.5, 30.0, "year-1997", "light"],
  [30.0, 34.0, "pct-90", "glitch"],
  [34.0, 38.3, "cubes-break", "dissolve"],
  [38.3, 46.1, "house", "restore"],
  [46.1, 52.7, "shield", "light"],
  [52.7, 57.8, "progress", "progress"],
  [57.8, 64.2, "g-shards", "roto"],
  [64.2, 74.4, "panels", "expand"],
  [74.4, 78.6, "cubes", "light"],

  [80.0, 87.4, "globe", "orbit"],
  [87.4, 94.3, "g-magnifier", "scan"],
  [94.3, 100.9, "trash", "drop"],
  [100.9, 105.4, "network-gold", "rise"],
  [105.4, 112.2, "phone", "track"],
  [112.2, 118.7, "g-crosshair", "lock"],
  [118.7, 122.5, "g-gyro", "spin3d"],
  [122.5, 128.6, "phone", "light"],

  [130.0, 135.0, "nokia-warm", "light"],
  [135.0, 140.4, "gear-sync", "reject"],
  [140.4, 149.6, "crown", "fall"],
  [149.6, 164.8, "nokia-warm", "grade", { to: "nokia-frozen" }],
  [164.8, 172.7, "g-lightning", "fps"],
  [172.7, 177.6, "waveform", "wave"],

  [178.2, 181.1, "key", "light"],
  [181.1, 190.9, "globe-ring", "cube3d", { tags: ["STORY", "AI", "EDIT", "SOUND", "COLOR", "MOTION"] }],
  [190.9, T, "chevrons", "save"],
];

// [start, end, type, arabic (*word* = highlight, ~ = no-break space), english]
const CAPS = [
  [0, 6.25, "big", "أكبر *3* *شركات* في العالم", "THE WORLD'S 3 BIGGEST COMPANIES"],
  [6.4, 12.75, "t", "أخطاء *تنهي* *الوجود..* أو تصنع *إمبراطورية*", "MISTAKES THAT END EVERYTHING.. OR BUILD AN EMPIRE"],
  [12.9, 21.9, "t", "كيف تصنع هذا المونتاج *بالذكاء* *الاصطناعي؟*", "HOW TO CREATE THIS EDIT WITH AI?"],
  [23.5, 29.5, "t", "*1997* - شركة بيكسار", "1997 - PIXAR ANIMATION STUDIOS"],
  [30.2, 38.0, "warn", "حذف *90%* من فيلم Toy~Story~2 عن طريق الخطأ", "90% OF TOY STORY 2 ACCIDENTALLY DELETED"],
  [38.5, 46.05, "t", "نسخة احتياطية *واحدة* أنقذت الإمبراطورية", "ONE HOME BACKUP SAVED THE ENTIRE EMPIRE"],
  [46.2, 52.7, "lesson", "الدرس: الخطة البديلة *ضرورة* وليست رفاهية", "LESSON: A BACKUP PLAN IS A NECESSITY"],
  [57.8, 64.15, "skill", "المهارة: عزل العناصر عن الخلفية", "SKILL: ROTOSCOPING & SUBJECT ISOLATION"],
  [64.4, 74.35, "skill", "المهارة: التوليد التوسعي للمشاهد", "SKILL: GENERATIVE EXPAND & ENVIRONMENT BUILDING"],
  [74.5, 78.4, "t", "الأداء البصري: إضاءة *درامية* وتكوين عميق", "VISUAL PERFORMANCE: DRAMATIC LIGHTING & DEPTH"],
  [80.0, 94.2, "t", "خدعة ريد بول *التسويقية* في لندن", "RED BULL'S MARKETING TRICK IN LONDON"],
  [94.4, 100.8, "t", "علب *فارغة* في سلات المهملات", "EMPTY CANS PLACED IN STREET TRASH BINS"],
  [100.95, 105.1, "t", "وهم الانتشار يصنع *الطلب* *الحقيقي*", "THE ILLUSION OF POPULARITY CREATES REAL DEMAND"],
  [105.6, 118.65, "skill", "المهارة: تتبع حركة الكاميرا بدقة", "SKILL: CAMERA MOTION TRACKING"],
  [118.8, 122.45, "skill", "المهارة: دمج العناصر ثلاثية الأبعاد", "SKILL: 3D ELEMENT INTEGRATION"],
  [122.6, 128.4, "t", "الأداء البصري: محاكاة *الظلال* *والانعكاسات* الواقعية", "VISUAL PERFORMANCE: REALISTIC SHADOWS & REFLECTIONS"],
  [130.1, 134.85, "t", "سقوط عملاق الهواتف: *نوكيا*", "THE FALL OF A GIANT: NOKIA"],
  [135.0, 140.35, "t", "رفض *التطور* ونظام الأندرويد", "REFUSING INNOVATION & ANDROID OS"],
  [140.5, 149.55, "big", "من القمة إلى *التاريخ* في لحظة", "FROM THE TOP TO HISTORY IN A SECOND"],
  [149.7, 153.95, "skill", "المهارة: تصحيح الألوان السينمائي", "SKILL: CINEMATIC COLOR GRADING"],
  [154.1, 164.7, "t", "الأداء البصري: الانتقال من *الدفء* إلى *البرودة*", "VISUAL PERFORMANCE: WARM-TO-COLD MOOD SHIFT"],
  [165.4, 172.65, "skill", "المهارة: التباطؤ الزمني بالذكاء الاصطناعي", "SKILL: AI FRAME INTERPOLATION & SLOW MOTION"],
  [172.8, 177.4, "skill", "المهارة: هندسة الصوت والمؤثرات", "SKILL: SOUND DESIGN & SPATIAL AUDIO"],
  [178.4, 181.05, "big", "القصة القوية هي *الأساس*", "A STRONG STORY IS THE FOUNDATION"],
  [181.2, 190.85, "t", "الذكاء الاصطناعي والمونتاج *يصنعان* *التجربة*", "AI & EDITING CREATE THE EXPERIENCE"],
  [191.0, 198.2, "save", "احفظ الفيديو وطبق تقنية *واحدة* اليوم", "SAVE THIS VIDEO & APPLY ONE TECHNIQUE TODAY"],
];

/* ------------------------------------------------------------------ */
/* Shared styles                                                       */
/* ------------------------------------------------------------------ */

const FONTS = `
@font-face{font-family:Cairo;font-weight:700;src:url('assets/fonts/cairo-arabic-700-normal.woff2') format('woff2');unicode-range:U+0600-06FF,U+0750-077F,U+FB50-FDFF,U+FE70-FEFF,U+200C-200E}
@font-face{font-family:Cairo;font-weight:900;src:url('assets/fonts/cairo-arabic-900-normal.woff2') format('woff2');unicode-range:U+0600-06FF,U+0750-077F,U+FB50-FDFF,U+FE70-FEFF,U+200C-200E}
@font-face{font-family:Cairo;font-weight:700;src:url('assets/fonts/cairo-latin-700-normal.woff2') format('woff2')}
@font-face{font-family:Cairo;font-weight:900;src:url('assets/fonts/cairo-latin-900-normal.woff2') format('woff2')}
@font-face{font-family:Mont;font-weight:700;src:url('assets/fonts/montserrat-latin-700-normal.woff2') format('woff2')}
@font-face{font-family:Mont;font-weight:800;src:url('assets/fonts/montserrat-latin-800-normal.woff2') format('woff2')}
@font-face{font-family:Mont;font-weight:900;src:url('assets/fonts/montserrat-latin-900-normal.woff2') format('woff2')}`;

// Shared JS helpers placed at the top of each scene script.
const HELPERS = `
  const E = { out: "power3.out", in: "power2.in", io: "power2.inOut", back: "back.out(1.5)", expo: "expo.out" };
  function mulberry32(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  // A yoyo loop that fits inside [at, at + span] with a finite repeat count.
  function loop(tl, target, from, to, cycle, at, span, ease) {
    const halves = Math.max(1, Math.floor(span / (cycle / 2)));
    tl.fromTo(target, from, { ...to, duration: cycle / 2, ease: ease || "sine.inOut", yoyo: true, repeat: halves - 1 }, at);
  }`;

/* ------------------------------------------------------------------ */
/* Visual (icon) markup                                                */
/* ------------------------------------------------------------------ */

const icon = (name) => `assets/icons/${name}.webp`;
const SPARKS = [
  [360, 40, 360, 0], [520, 90, 548, 62], [200, 90, 172, 62], [610, 230, 650, 230], [110, 230, 70, 230],
];

function fxMarkup(id, fx, extra) {
  switch (fx) {
    case "trio": {
      const pos = [[40, 300], [560, 300], [300, 400]];
      return extra.minis.map((m, i) => `
        <div class="mini" id="${id}-mini${i}" style="left:${pos[i][0]}px;top:${pos[i][1]}px"><img src="${icon(m)}" alt=""></div>`).join("") + `
        <svg class="draw" viewBox="0 0 720 470"><path d="M360 230 Q 250 260 130 360" pathLength="100"/><path d="M360 230 Q 470 260 610 360" pathLength="100"/><path d="M360 230 L 380 420" pathLength="100"/></svg>`;
    }
    case "glitch":
      return `<div class="gl gl-r"><img src="" alt=""></div><div class="gl gl-c"><img src="" alt=""></div><div class="redflash"></div>`;
    case "cube3d":
      return `
        <div class="cube-wrap" data-layout-ignore><div class="cube">
          ${["AI", "3D", "FX", "4K", "HDR", "FPS"].map((t, i) => `<div class="face f${i}"><span>${t}</span></div>`).join("")}
        </div></div>
        ${extra.tags.map((t, i) => `<div class="tagp tag${i}">${t}</div>`).join("")}`;
    case "roto":
      return `<svg class="draw roto" viewBox="0 0 720 470"><polygon points="250,40 470,30 560,200 520,420 230,440 160,230" pathLength="100"/></svg>
        <div class="lbl" style="left:150px;top:420px">MASK 01 • SUBJECT ISOLATED</div>`;
    case "expand":
      return `<div class="dash"></div><div class="cnt"><span>0</span><small>%</small></div><div class="lbl" style="left:420px;top:30px">GENERATIVE EXPAND</div>`;
    case "light":
      return `<div class="sweep"></div>`;
    case "track":
      return `<svg class="draw trail" viewBox="0 0 720 470"><path d="M200 330 C 300 200, 420 360, 520 160" pathLength="100"/></svg>`;
    case "lock":
      return `<div class="lbl" style="left:200px;top:440px">TRACK 01 • LOCKED</div>`;
    case "reject":
      return `<svg class="draw xmark" viewBox="0 0 720 470"><path d="M220 80 L 500 380" pathLength="100"/><path d="M500 80 L 220 380" pathLength="100"/></svg>`;
    case "grade":
      return `<div class="slider">
          <div class="row"><span class="t">TEMP</span><div class="bar temp"><i class="knob k1"></i></div><span class="v v1">+30</span></div>
          <div class="row"><span class="t">SAT</span><div class="bar sat"><i class="knob k2"></i></div><span class="v v2">100</span></div>
        </div>`;
    case "fps":
      return `<div class="fps"><span>24</span> <small>FPS</small></div>`;
    case "wave":
      return `<div class="eq">${Array.from({ length: 24 }, () => "<b></b>").join("")}</div>`;
    case "progress":
      return `<div class="pbar"><i></i></div><div class="pct"><span>0</span>%</div><div class="lbl" style="left:255px;top:40px">RESTORING BACKUP</div>`;
    case "restore":
      return `<div class="mini mini-undo" id="${id}-undo" style="left:470px;top:20px"><img src="${icon("undo")}" alt=""></div>`;
    case "rise":
      return `<div class="mini mini-arrow" id="${id}-arrow" style="left:420px;top:40px"><img src="${icon("g-arrow")}" alt=""></div>`;
    case "orbit":
      return `<svg class="draw route" viewBox="0 0 720 470"><path d="M150 300 C 260 120, 470 120, 570 260" pathLength="100"/><circle cx="570" cy="260" r="12"/></svg>
        <div class="lbl" style="left:500px;top:290px">LONDON</div>`;
    case "save":
      return `<div class="savepill">★ SAVE</div>`;
    default:
      return "";
  }
}

function visMarkup(sceneId, idx, v, scene) {
  const [a, b, name, fx, extra = {}] = v;
  const id = `${sceneId}-v${idx + 1}`;
  const start = r2(a - scene.start), dur = r2(Math.min(b, scene.end) - a);
  const glyph = name.startsWith("g-") ? " glyph" : "";
  const second = extra.to ? `<img class="v-img2" src="${icon(extra.to)}" alt="">` : "";
  return `
    <div id="${id}" class="vis clip" data-start="${start}" data-duration="${dur}" data-track-index="1" data-fx="${fx}" data-layout-allow-overlap>
      <div class="v-in">
        <div class="v-float">
          <div class="v-glow"></div>
          <svg class="v-orbit" viewBox="0 0 720 470"><ellipse cx="360" cy="250" rx="320" ry="110" pathLength="100"/></svg>
          <div class="v-refl${glyph}"><img src="${icon(name)}" alt=""></div>
          <div class="v-icon${glyph}"><img class="v-img" src="${icon(name)}" alt="">${second}</div>
          <svg class="v-spark" viewBox="0 0 720 470">${SPARKS.map((s) => `<line x1="${s[0]}" y1="${s[1]}" x2="${s[2]}" y2="${s[3]}" pathLength="100"/>`).join("")}</svg>
          ${fxMarkup(id, fx, extra)}
        </div>
      </div>
    </div>`;
}

/* ------------------------------------------------------------------ */
/* Chapter scene                                                       */
/* ------------------------------------------------------------------ */

const SCENE_CSS = `
${FONTS}
#root{position:absolute;inset:0;overflow:hidden;--gold:#F5B544;--cyan:#38C6F4;--red:#FF4545;--ink:#EAF2FF}
.badge{position:absolute;left:184px;top:296px;width:640px;height:60px;z-index:5}
.badge .b-in{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font:800 28px Mont;letter-spacing:4px;border:2px solid;border-radius:40px;background:rgba(6,14,28,.72);white-space:nowrap}
.chap{position:absolute;left:120px;top:400px;width:768px;height:420px;z-index:6}
.chap .c-in{position:absolute;inset:0;text-align:center}
.chap .num{font:900 300px/1 Mont;color:transparent;-webkit-text-stroke:5px var(--gold);text-shadow:0 0 60px rgba(245,181,68,.35)}
.chap .nm{font:900 52px Mont;letter-spacing:18px;color:var(--ink);margin-top:10px}
.chap svg{position:absolute;left:84px;top:330px;width:600px;height:40px;overflow:visible}
.chap svg path{fill:none;stroke:var(--gold);stroke-width:6;stroke-linecap:round;stroke-dasharray:100;stroke-dashoffset:100}
.vis{position:absolute;left:144px;top:370px;width:720px;height:470px;perspective:1400px;z-index:3}
.v-in,.v-float{position:absolute;inset:0;transform-style:preserve-3d}
.v-glow{position:absolute;left:110px;top:-10px;width:500px;height:500px;border-radius:50%;background:radial-gradient(circle,rgba(56,198,244,.34),rgba(245,181,68,.12) 45%,transparent 70%)}
.v-icon,.v-refl{position:absolute;left:160px;top:20px;width:400px;height:400px}
.v-icon img,.v-refl img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}
.v-icon .v-img2{opacity:0}
.v-refl{top:400px;height:180px;overflow:hidden;opacity:.28;-webkit-mask-image:linear-gradient(180deg,#000,transparent 80%);mask-image:linear-gradient(180deg,#000,transparent 80%)}
.v-refl img{height:400px;top:auto;bottom:0;transform:scaleY(-1);transform-origin:50% 50%;top:-220px}
.v-orbit,.v-spark,.draw{position:absolute;left:0;top:0;width:720px;height:470px;overflow:visible}
.v-orbit ellipse{fill:none;stroke:url(#none);stroke:rgba(56,198,244,.55);stroke-width:2.5;stroke-dasharray:100;stroke-dashoffset:100}
.v-spark line{stroke:var(--gold);stroke-width:5;stroke-linecap:round;stroke-dasharray:100;stroke-dashoffset:100}
.draw path,.draw polygon{fill:none;stroke:var(--gold);stroke-width:5;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:100;stroke-dashoffset:100}
.draw.roto polygon{stroke:var(--cyan);fill:rgba(56,198,244,.08);stroke-dasharray:100}
.draw.xmark path{stroke:var(--red);stroke-width:16}
.draw.trail path{stroke:var(--cyan);stroke-width:4}
.draw.route path{stroke:var(--gold);stroke-width:5}
.draw.route circle{fill:var(--red);opacity:0}
.mini{position:absolute;width:150px;height:150px}
.mini img{width:100%;height:100%;object-fit:contain}
.gl{position:absolute;left:160px;top:20px;width:400px;height:400px;opacity:0}
.gl img{width:100%;height:100%;object-fit:contain}
.gl-r img{filter:sepia(1) saturate(8) hue-rotate(-40deg)}
.gl-c img{filter:sepia(1) saturate(8) hue-rotate(160deg)}
.redflash{position:absolute;inset:-200px;background:radial-gradient(circle,rgba(255,69,69,.45),transparent 60%);opacity:0}
.cube-wrap{position:absolute;left:250px;top:110px;width:220px;height:220px;perspective:900px}
.cube{position:absolute;inset:0;transform-style:preserve-3d}
.face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;border:3px solid rgba(56,198,244,.9);background:linear-gradient(135deg,rgba(56,198,244,.22),rgba(245,181,68,.18));box-shadow:inset 0 0 40px rgba(56,198,244,.35);display:flex;align-items:center;justify-content:center;font:900 54px Mont;color:#fff;text-shadow:0 0 20px rgba(56,198,244,.9)}
.f0{transform:translateZ(110px)}.f1{transform:rotateY(180deg) translateZ(110px)}.f2{transform:rotateY(90deg) translateZ(110px)}
.f3{transform:rotateY(-90deg) translateZ(110px)}.f4{transform:rotateX(90deg) translateZ(110px);border-color:rgba(245,181,68,.9)}.f5{transform:rotateX(-90deg) translateZ(110px);border-color:rgba(245,181,68,.9)}
.tagp{position:absolute;font:800 28px Mont;letter-spacing:3px;color:var(--ink);padding:8px 18px;border-radius:30px;border:2px solid var(--cyan);background:rgba(6,14,28,.8);white-space:nowrap}
.tag0{left:20px;top:40px}.tag1{left:530px;top:30px;border-color:var(--gold)}.tag2{left:0;top:230px;border-color:var(--gold)}
.tag3{left:580px;top:220px}.tag4{left:60px;top:390px}.tag5{left:520px;top:400px;border-color:var(--gold)}
.lbl{position:absolute;font:800 28px Mont;letter-spacing:3px;color:var(--cyan);background:rgba(6,14,28,.85);padding:8px 14px;border:2px solid var(--cyan);white-space:nowrap;opacity:0}
.dash{position:absolute;left:120px;top:0;width:480px;height:440px;border:4px dashed var(--cyan);border-radius:12px}
.cnt,.fps,.pct{position:absolute;left:150px;top:30px;font:900 76px/1 Mont;color:var(--gold);text-shadow:0 0 30px rgba(245,181,68,.5)}
.cnt small,.fps small{font-size:32px;color:var(--cyan);letter-spacing:3px}
.pct{left:280px;top:330px;font-size:64px}
.pbar{position:absolute;left:160px;top:420px;width:400px;height:14px;border-radius:8px;background:rgba(255,255,255,.1);overflow:hidden}
.pbar i{position:absolute;inset:0;background:linear-gradient(90deg,var(--cyan),var(--gold));transform-origin:0 50%}
.sweep{position:absolute;left:160px;top:20px;width:160px;height:400px;background:linear-gradient(100deg,transparent,rgba(255,255,255,.55),transparent);mix-blend-mode:overlay;opacity:0}
.slider{position:absolute;left:60px;top:370px;width:600px;padding:16px 22px;border-radius:18px;background:rgba(6,14,28,.85);border:2px solid rgba(255,255,255,.14)}
.slider .row{display:flex;align-items:center;gap:16px;margin:8px 0;font:800 28px Mont;color:var(--ink);letter-spacing:2px}
.slider .t{width:96px}.slider .v{width:80px;text-align:right}
.slider .bar{flex:1;height:10px;border-radius:6px;position:relative}
.slider .temp{background:linear-gradient(90deg,#3A8DFF,#ddd,#FF8A2A)}
.slider .sat{background:linear-gradient(90deg,#777,var(--gold))}
.slider .knob{position:absolute;right:-11px;top:50%;width:22px;height:22px;margin-top:-11px;border-radius:50%;background:#fff;border:3px solid #0B1A2E}
.eq{position:absolute;left:150px;top:400px;width:420px;height:80px;display:flex;align-items:flex-end;justify-content:center;gap:7px}
.eq b{width:10px;height:100%;border-radius:5px;background:linear-gradient(180deg,var(--cyan),var(--gold));transform-origin:50% 100%}
.savepill{position:absolute;left:270px;top:20px;font:900 28px Mont;letter-spacing:4px;color:#0B1A2E;background:#D8F65A;padding:12px 28px;border-radius:40px;box-shadow:0 0 40px rgba(216,246,90,.45)}
`;

const SCENE_JS = `
  const FX = {
    trio(el, s, d) {
      const minis = el.querySelectorAll(".mini");
      tl.fromTo(minis, { scale: 0, opacity: 0, rotationY: -90 }, { scale: 1, opacity: 1, rotationY: 0, duration: 0.6, ease: E.back, stagger: 0.25 }, s + 0.9);
      tl.fromTo(el.querySelectorAll(".draw path"), { strokeDashoffset: 100 }, { strokeDashoffset: 0, duration: 0.6, ease: E.io, stagger: 0.25 }, s + 0.7);
      minis.forEach((m, i) => loop(tl, m, { y: 0 }, { y: -14 }, 2 + i * 0.3, s + 1.6, d - 2.2));
    },
    glitch(el, s, d) {
      const src = el.querySelector(".v-img").getAttribute("src");
      el.querySelectorAll(".gl img").forEach((g) => g.setAttribute("src", src));
      const ic = el.querySelector(".v-icon"), r = el.querySelector(".gl-r"), c = el.querySelector(".gl-c"), f = el.querySelector(".redflash");
      const rnd = mulberry32(7);
      for (let k = 0; k < 2; k++) {
        const t0 = s + 0.7 + k * 1.3;
        tl.fromTo(f, { opacity: 0 }, { opacity: 1, duration: 0.08, yoyo: true, repeat: 1 }, t0);
        tl.fromTo([r, c], { opacity: 0 }, { opacity: 0.7, duration: 0.05 }, t0);
        for (let j = 0; j < 6; j++) {
          const dx = (rnd() - 0.5) * 40;
          tl.to(ic, { x: dx, duration: 0.04, ease: "none" }, t0 + j * 0.05);
          tl.to(r, { x: dx - 14, duration: 0.04, ease: "none" }, t0 + j * 0.05);
          tl.to(c, { x: dx + 14, duration: 0.04, ease: "none" }, t0 + j * 0.05);
        }
        tl.to([ic, r, c], { x: 0, duration: 0.05 }, t0 + 0.32);
        tl.to([r, c], { opacity: 0, duration: 0.1 }, t0 + 0.34);
      }
    },
    cube3d(el, s, d) {
      const cube = el.querySelector(".cube"), ic = el.querySelector(".v-icon"), tags = el.querySelectorAll(".tagp");
      tl.fromTo(ic, { opacity: 1, scale: 1 }, { opacity: 0.45, scale: 1.18, duration: 0.8, ease: E.out }, s + 0.6);
      tl.fromTo(cube, { rotationX: -25, rotationY: -40, scale: 0 }, { scale: 1, duration: 0.8, ease: E.back }, s + 0.5);
      tl.to(cube, { rotationY: 320, rotationX: 335, duration: d - 1.3, ease: "power1.inOut" }, s + 0.6);
      tl.fromTo(tags, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, ease: E.back, stagger: 0.35 }, s + 1.2);
      tags.forEach((t, i) => loop(tl, t, { y: 0 }, { y: i % 2 ? 12 : -12 }, 2.4 + i * 0.2, s + 3.5, d - 4));
    },
    roto(el, s) {
      tl.fromTo(el.querySelector(".roto polygon"), { strokeDashoffset: 100 }, { strokeDashoffset: 0, duration: 1.6, ease: E.io }, s + 0.7);
      tl.fromTo(el.querySelector(".lbl"), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.35 }, s + 2.2);
    },
    expand(el, s) {
      const img = el.querySelector(".v-img"), o = { v: 0 }, cnt = el.querySelector(".cnt span");
      tl.fromTo(img, { scale: 0.5, filter: "blur(10px)" }, { scale: 1, filter: "blur(0px)", duration: 2.2, ease: "power3.inOut" }, s + 0.5);
      tl.fromTo(el.querySelector(".dash"), { scale: 0.5, opacity: 1 }, { scale: 1.05, opacity: 0, duration: 2.6, ease: "power3.inOut" }, s + 0.5);
      tl.fromTo(o, { v: 0 }, { v: 100, duration: 3, ease: "power1.out", onUpdate: () => { cnt.textContent = Math.round(o.v); } }, s + 0.4);
      tl.fromTo(el.querySelector(".lbl"), { opacity: 0 }, { opacity: 1, duration: 0.3 }, s + 1);
    },
    light(el, s, d) {
      const sw = el.querySelector(".sweep");
      tl.fromTo(sw, { x: -160, opacity: 0 }, { x: 400, opacity: 1, duration: 1.1, ease: E.io }, s + 0.9);
      if (d > 4) tl.fromTo(sw, { x: -160 }, { x: 400, duration: 1.1, ease: E.io, immediateRender: false }, s + d - 2);
    },
    dissolve(el, s, d) {
      tl.fromTo(el.querySelector(".v-icon"), { x: 0, scale: 1, opacity: 1 }, { x: 60, scale: 1.12, opacity: 0.35, filter: "blur(4px)", duration: d - 0.8, ease: "power1.in" }, s + 0.6);
    },
    restore(el, s) {
      const u = el.querySelector(".mini-undo");
      tl.fromTo(u, { scale: 0, rotation: 0 }, { scale: 1, rotation: -360, duration: 1.2, ease: E.out }, s + 1);
    },
    progress(el, s, d) {
      const o = { v: 0 }, p = el.querySelector(".pct span");
      tl.fromTo(el.querySelector(".pbar i"), { scaleX: 0 }, { scaleX: 1, duration: d - 1.4, ease: "power2.inOut" }, s + 0.6);
      tl.fromTo(o, { v: 0 }, { v: 100, duration: d - 1.4, ease: "power2.inOut", onUpdate: () => { p.textContent = Math.round(o.v); } }, s + 0.6);
      tl.fromTo(el.querySelector(".lbl"), { opacity: 0 }, { opacity: 1, duration: 0.3 }, s + 0.8);
    },
    track(el, s, d) {
      const ic = el.querySelector(".v-icon");
      tl.fromTo(el.querySelector(".trail path"), { strokeDashoffset: 100 }, { strokeDashoffset: 0, duration: d - 1.5, ease: "sine.inOut" }, s + 0.6);
      tl.fromTo(ic, { x: -150, y: 90, rotation: -6 }, { x: 150, y: -80, rotation: 6, duration: d - 1.5, ease: "sine.inOut" }, s + 0.6);
    },
    lock(el, s, d) {
      const ic = el.querySelector(".v-icon");
      tl.fromTo(ic, { scale: 1.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: E.expo }, s + 0.3);
      loop(tl, ic, { scale: 1 }, { scale: 1.06 }, 0.9, s + 1, d - 1.6);
      tl.fromTo(el.querySelector(".lbl"), { opacity: 0 }, { opacity: 1, duration: 0.3 }, s + 1);
    },
    spin3d(el, s, d) {
      tl.fromTo(el.querySelector(".v-icon"), { rotationY: 0 }, { rotationY: 720, duration: d - 0.8, ease: "power2.inOut" }, s + 0.3);
    },
    reject(el, s) {
      tl.fromTo(el.querySelectorAll(".xmark path"), { strokeDashoffset: 100 }, { strokeDashoffset: 0, duration: 0.35, ease: E.out, stagger: 0.25 }, s + 1.4);
      tl.fromTo(el.querySelector(".v-img"), { filter: "grayscale(0)" }, { filter: "grayscale(0.85)", duration: 0.6 }, s + 1.4);
    },
    fall(el, s, d) {
      const ic = el.querySelector(".v-icon");
      tl.fromTo(ic, { rotation: 0, y: 0 }, { rotation: -22, y: 70, duration: 1.4, ease: "bounce.out" }, s + 2.2);
      tl.fromTo(el.querySelector(".v-img"), { filter: "grayscale(0) sepia(0)" }, { filter: "grayscale(0.7) sepia(0.6)", duration: 2.5 }, s + 3.4);
    },
    grade(el, s, d) {
      const g = { v: 0 }, v1 = el.querySelector(".v1"), v2 = el.querySelector(".v2");
      const a0 = s + 1.2, len = Math.min(8, d - 3);
      tl.fromTo(el.querySelector(".v-img2"), { opacity: 0 }, { opacity: 1, duration: len, ease: E.io }, a0);
      tl.fromTo(el.querySelector(".k1"), { x: 0 }, { x: -340, duration: len, ease: E.io }, a0);
      tl.fromTo(el.querySelector(".k2"), { x: 0 }, { x: -190, duration: len, ease: E.io }, a0);
      tl.fromTo(g, { v: 0 }, { v: 1, duration: len, ease: E.io, onUpdate: () => {
        const t = Math.round(30 - 70 * g.v); v1.textContent = (t > 0 ? "+" : "") + t; v2.textContent = Math.round(100 - 55 * g.v);
      } }, a0);
      tl.fromTo(el.querySelector(".slider"), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5, ease: E.out }, s + 0.7);
    },
    fps(el, s, d) {
      const o = { v: 24 }, n = el.querySelector(".fps span");
      tl.fromTo(o, { v: 24 }, { v: 120, duration: 2.4, ease: E.out, onUpdate: () => { n.textContent = Math.round(o.v); } }, s + 0.8);
      tl.fromTo(el.querySelector(".fps"), { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.4 }, s + 0.6);
      loop(tl, el.querySelector(".v-icon"), { y: -10 }, { y: 10 }, 0.5, s + 1, d - 1.6);
    },
    wave(el, s, d) {
      const rnd = mulberry32(42);
      el.querySelectorAll(".eq b").forEach((b, i) => loop(tl, b, { scaleY: 0.15 }, { scaleY: 0.35 + rnd() * 0.65 }, 0.36 + rnd() * 0.3, s + 0.4 + i * 0.02, d - 1));
    },
    rise(el, s) {
      tl.fromTo(el.querySelector(".mini-arrow"), { x: -260, y: 260, opacity: 0, scale: 0.6 }, { x: 0, y: 0, opacity: 1, scale: 1, duration: 0.9, ease: E.expo }, s + 0.8);
    },
    orbit(el, s, d) {
      tl.fromTo(el.querySelector(".route path"), { strokeDashoffset: 100 }, { strokeDashoffset: 0, duration: 1.6, ease: E.io }, s + 1);
      tl.fromTo(el.querySelector(".route circle"), { opacity: 0, scale: 0 }, { opacity: 1, scale: 1, transformOrigin: "50% 50%", duration: 0.4, ease: E.back }, s + 2.5);
      tl.fromTo(el.querySelector(".lbl"), { opacity: 0 }, { opacity: 1, duration: 0.3 }, s + 2.7);
    },
    scan(el, s, d) {
      loop(tl, el.querySelector(".v-icon"), { x: -140, rotation: -8 }, { x: 140, rotation: 8 }, 2.4, s + 0.6, d - 1.2);
    },
    drop(el, s) {
      tl.fromTo(el.querySelector(".v-icon"), { y: -320 }, { y: 0, duration: 1.1, ease: "bounce.out" }, s + 0.2);
    },
    save(el, s, d) {
      const p = el.querySelector(".savepill");
      tl.fromTo(p, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: E.back }, s + 0.8);
      loop(tl, p, { scale: 1 }, { scale: 1.1 }, 1, s + 1.4, d - 2);
    },
  };

  function vis(el) {
    const s = +el.dataset.start, d = +el.dataset.duration, e = s + d;
    const q = (c) => el.querySelector(c);
    if (s < 0.05) tl.set(q(".v-in"), { opacity: 1, rotationY: 0, scale: 1, y: 0 }, 0); else tl.fromTo(q(".v-in"), { opacity: 0, rotationY: -75, scale: 0.6, y: 60 }, { opacity: 1, rotationY: 0, scale: 1, y: 0, duration: 0.8, ease: E.back }, s);
    tl.fromTo(q(".v-glow"), { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 1, ease: E.out }, s + 0.1);
    tl.fromTo(q(".v-orbit ellipse"), { strokeDashoffset: 100 }, { strokeDashoffset: 0, duration: 1.3, ease: E.io }, s + 0.3);
    tl.fromTo(q(".v-orbit"), { rotation: -12 }, { rotation: 12, duration: d, ease: "none" }, s);
    const sp = el.querySelectorAll(".v-spark line");
    tl.fromTo(sp, { strokeDashoffset: 100, opacity: 1 }, { strokeDashoffset: 0, duration: 0.45, ease: E.out, stagger: 0.06 }, s + 0.55);
    tl.to(sp, { opacity: 0, duration: 0.4 }, s + 1.25);
    loop(tl, q(".v-float"), { y: 0, rotationY: -9 }, { y: -18, rotationY: 9 }, 3.4, s + 0.8, d - 1.4);
    const f = FX[el.dataset.fx];
    if (f) f(el, s, d, e);
    tl.to(q(".v-in"), { opacity: 0, rotationY: 65, scale: 0.8, y: -40, duration: 0.45, ease: E.in }, e - 0.5);
  }`;

function chapterScene(sc) {
  const dur = r2(sc.end - sc.start);
  const col = sc.col === "gold" ? "#F5B544" : "#38C6F4";
  const vis = VIS.filter((v) => v[0] >= sc.start && v[0] < sc.end);
  const chap = sc.chap
    ? `
    <div id="${sc.id}-chap" class="chap clip" data-start="0" data-duration="1.95" data-track-index="2" data-layout-allow-overlap>
      <div class="c-in">
        <div class="num" style="-webkit-text-stroke-color:${col}">${sc.chap[0]}</div>
        <div class="nm">${sc.chap[1]}</div>
        <svg viewBox="0 0 600 40"><path d="M10 25 Q 150 5 300 22 T 590 15" pathLength="100" style="stroke:${col}"/></svg>
      </div>
    </div>`
    : "";
  const badgeStart = sc.chap ? 1.4 : 0.3;
  return `<template>
  <style>${SCENE_CSS}</style>
  <div id="root" data-composition-id="${sc.id}" data-width="${W}" data-height="${H}">
    <div id="${sc.id}-badge" class="badge clip" data-start="${badgeStart}" data-duration="${r2(dur - badgeStart - 0.1)}" data-track-index="3">
      <div class="b-in" style="color:${col};border-color:${col}">${sc.badge}</div>
    </div>${chap}
    ${vis.map((v, i) => visMarkup(sc.id, i, v, sc)).join("\n")}
  </div>
  <script>
  (function () {
  ${HELPERS}
  const tl = gsap.timeline({ paused: true });
  ${SCENE_JS}
  document.querySelectorAll('.vis[id^="${sc.id}-v"]').forEach(vis);
  const badge = document.querySelector("#${sc.id}-badge .b-in");
  tl.fromTo(badge, { opacity: 0, y: -16, scale: 0.8 }, { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: E.back }, ${badgeStart});
  tl.to(badge, { opacity: 0, y: -12, duration: 0.3, ease: E.in }, ${r2(dur - 0.5)});
  const chap = document.querySelector("#${sc.id}-chap .c-in");
  if (chap) {
    tl.fromTo(chap.querySelector(".num"), { x: 220, opacity: 0, scale: 1.25 }, { x: 0, opacity: 1, scale: 1, duration: 0.6, ease: E.expo }, 0.05);
    tl.fromTo(chap.querySelector(".nm"), { y: 30, opacity: 0, scale: 1.3 }, { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: E.out }, 0.25);
    tl.fromTo(chap.querySelector("path"), { strokeDashoffset: 100 }, { strokeDashoffset: 0, duration: 0.7, ease: E.io }, 0.45);
    tl.to(chap, { opacity: 0, scale: 0.9, duration: 0.35, ease: E.in }, 1.5);
  }
  tl.to({}, { duration: 0.01 }, ${dur});
  window.__timelines["${sc.id}"] = tl;
  })();
  </script>
</template>
`;
}

/* ------------------------------------------------------------------ */
/* Captions                                                            */
/* ------------------------------------------------------------------ */

const PILLS = { skill: "⚡ SKILL", warn: "⚠ WARNING", lesson: "◆ LESSON", save: "★ SAVE" };
const UL = `<svg class="ul" viewBox="0 0 100 14" preserveAspectRatio="none"><path d="M2 9 Q 25 3 50 8 T 98 6" pathLength="100"/></svg>`;

function captionsScene() {
  const caps = CAPS.map(([a, b, type, ar, en], i) => {
    const words = ar.split(" ").map((w) => {
      const hl = /^\*.*\*$/.test(w);
      const txt = w.replace(/\*/g, "").replace(/~/g, " ");
      return hl ? `<span class="w hl">${txt}${UL}</span>` : `<span class="w">${txt}</span>`;
    }).join(" ");
    const pill = PILLS[type] ? `<div class="pill">${PILLS[type]}</div>` : "";
    const id = `cap-${String(i + 1).padStart(2, "0")}`;
    return `
    <div id="${id}" class="cap clip ${type}" data-start="${a}" data-duration="${r2(b - a)}" data-track-index="1">
      <div class="card">${pill}<div class="ar" dir="rtl">${words}</div><div class="en">${en}</div></div>
    </div>`;
  }).join("");
  return `<template>
  <style>${FONTS}
#root{position:absolute;inset:0;--gold:#F5B544;--cyan:#38C6F4;--red:#FF4545;--lime:#D8F65A;--ink:#EAF2FF}
.cap{position:absolute;left:120px;bottom:690px;width:660px}
.card{padding:26px 32px;border-radius:28px;background:rgba(10,22,40,.72);border:2px solid rgba(255,255,255,.12);box-shadow:0 30px 60px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.12);text-align:center}
.big .card{background:none;border:none;box-shadow:none}
.warn .card{border-color:rgba(255,69,69,.7);box-shadow:0 0 50px rgba(255,69,69,.25)}
.lesson .card{border-color:rgba(245,181,68,.7)}
.skill .card,.save .card{background:#F4F5F0;border:none;text-align:right}
.ar{font:900 54px/1.38 Cairo;color:var(--ink)}
.big .ar{font-size:72px;text-shadow:0 6px 30px rgba(0,0,0,.6)}
.skill .ar,.save .ar{color:#0B1220}
.w{display:inline-block;margin:0 .1em;position:relative;unicode-bidi:isolate}
.hl{color:var(--gold)}
.skill .hl,.save .hl{color:#6B4EF6}
.ul{position:absolute;left:0;right:0;bottom:-6px;width:100%;height:16px;overflow:visible}
.ul path{fill:none;stroke:var(--gold);stroke-width:6;stroke-linecap:round;stroke-dasharray:100;stroke-dashoffset:100}
.skill .ul path,.save .ul path{stroke:#6B4EF6}
.en{font:800 28px/1.35 Mont;color:#9FB2CC;letter-spacing:2px;margin-top:12px;direction:ltr;text-transform:uppercase}
.skill .en,.save .en{color:#4A5568;text-align:left}
.pill{display:inline-block;direction:ltr;font:900 22px Mont;letter-spacing:3px;padding:8px 20px;border-radius:30px;margin-bottom:14px}
.skill .pill{background:var(--lime);color:#0B1220}
.save .pill{background:#6B4EF6;color:#fff}
.warn .pill{background:var(--red);color:#fff}
.lesson .pill{background:var(--gold);color:#0B1220}
</style>
  <div id="root" data-composition-id="captions" data-width="${W}" data-height="${H}">${caps}
  </div>
  <script>
  (function () {
  ${HELPERS}
  const tl = gsap.timeline({ paused: true });
  document.querySelectorAll(".cap[id^='cap-']").forEach((c) => {
    const s = +c.dataset.start, e = s + +c.dataset.duration;
    const card = c.querySelector(".card"), ws = c.querySelectorAll(".w"), en = c.querySelector(".en"), pill = c.querySelector(".pill");
    const side = c.classList.contains("skill") || c.classList.contains("save");
    if (s < 0.05) { tl.set([card, ...ws, en], { opacity: 1 }, 0); tl.to(card, { opacity: 0, y: -16, duration: 0.28, ease: E.in }, e - 0.3); return; }
    tl.fromTo(card, side ? { opacity: 0, x: 80, rotationY: -25 } : { opacity: 0, y: 40, scale: 0.94 },
      { opacity: 1, x: 0, y: 0, scale: 1, rotationY: 0, transformPerspective: 900, duration: 0.5, ease: E.out }, s);
    if (pill) tl.fromTo(pill, { scale: 0.3, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, ease: E.back }, s + 0.1);
    tl.fromTo(ws, { opacity: 0, y: 24, filter: "blur(8px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.4, ease: E.out, stagger: Math.min(0.08, 0.5 / ws.length) }, s + 0.15);
    tl.fromTo(en, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" }, s + 0.4);
    c.querySelectorAll(".ul path").forEach((p) => tl.fromTo(p, { strokeDashoffset: 100 }, { strokeDashoffset: 0, duration: 0.5, ease: E.io }, s + 0.75));
    c.querySelectorAll(".hl").forEach((h) => tl.fromTo(h, { scale: 1 }, { scale: 1.1, duration: 0.18, yoyo: true, repeat: 1, ease: "sine.inOut" }, s + 0.7));
    tl.to(card, { opacity: 0, y: -16, duration: 0.28, ease: E.in }, e - 0.3);
  });
  tl.to({}, { duration: 0.01 }, ${T});
  window.__timelines["captions"] = tl;
  })();
  </script>
</template>
`;
}

/* ------------------------------------------------------------------ */
/* Background: 3D floor, particles, floating glass, chapter flashes    */
/* ------------------------------------------------------------------ */

function bgScene() {
  let seed = 1234;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const dust = Array.from({ length: 46 }, (_, i) => {
    const sz = 3 + Math.round(rnd() * 7), x = Math.round(rnd() * W), y = Math.round(rnd() * H);
    const c = i % 3 === 0 ? "#F5B544" : "#38C6F4";
    return `<i class="dust" style="left:${x}px;top:${y}px;width:${sz}px;height:${sz}px;background:${c};box-shadow:0 0 ${sz * 3}px ${c}"></i>`;
  }).join("");
  const floaters = [
    ["g-atom", 20, 120, 220], ["g-pyramid", 840, 160, 200], ["g-rings", -30, 1300, 260],
    ["g-plus", 860, 1420, 180], ["g-hex", 880, 900, 170], ["g-cube", 10, 760, 170],
  ].map(([n, x, y, s], i) => `<div class="fl" data-layout-allow-overflow id="bg-fl${i}" style="left:${x}px;top:${y}px;width:${s}px;height:${s}px"><img src="${icon(n)}" alt=""></div>`).join("");
  const flashes = SCENES.slice(1).map((sc, i) => `
    <div id="bg-flash${i + 1}" class="flash clip" data-start="${r2(sc.start - 0.3)}" data-duration="1" data-track-index="1"><div class="burst"></div><div class="beam"></div></div>`).join("");
  return `<template>
  <style>
#root{position:absolute;inset:0;overflow:hidden;background:#050A14}
.grad{position:absolute;inset:0;background:radial-gradient(ellipse 80% 45% at 50% 32%,#123058 0%,#0A1A33 45%,#050A14 80%)}
.floorw{position:absolute;left:-540px;right:-540px;bottom:-200px;height:1100px;perspective:700px;perspective-origin:50% 0%}
.floor{position:absolute;inset:0;transform:rotateX(72deg);transform-origin:50% 0%;background-image:linear-gradient(rgba(56,198,244,.35) 2px,transparent 2px),linear-gradient(90deg,rgba(56,198,244,.35) 2px,transparent 2px);background-size:90px 90px;-webkit-mask-image:linear-gradient(180deg,transparent,#000 35%,#000);mask-image:linear-gradient(180deg,transparent,#000 35%,#000)}
.horizon{position:absolute;left:0;right:0;top:1150px;height:4px;background:linear-gradient(90deg,transparent,#38C6F4,#F5B544,#38C6F4,transparent);box-shadow:0 0 40px #38C6F4;opacity:.6}
.dust{position:absolute;border-radius:50%;opacity:.7}
.fl{position:absolute;opacity:.22;filter:blur(1.5px)}
.fl img{width:100%;height:100%;object-fit:contain}
.vign{position:absolute;inset:0;background:radial-gradient(ellipse 75% 60% at 50% 45%,transparent 55%,rgba(0,0,0,.75))}
.prog{position:absolute;left:0;top:0;width:${W}px;height:8px;background:linear-gradient(90deg,#38C6F4,#F5B544);transform-origin:0 50%;box-shadow:0 0 20px #38C6F4}
.flash{position:absolute;inset:0}
.burst{position:absolute;left:40px;top:300px;width:1000px;height:1000px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.9),rgba(56,198,244,.5) 25%,transparent 60%);opacity:0}
.beam{position:absolute;left:0;top:780px;width:${W}px;height:6px;background:linear-gradient(90deg,transparent,#fff,transparent);opacity:0}
</style>
  <div id="root" data-composition-id="bg" data-width="${W}" data-height="${H}">
    <div class="grad"></div>
    <div class="floorw" data-layout-allow-overflow><div class="floor" id="bg-floor"></div></div>
    <div class="horizon" id="bg-horizon"></div>
    ${dust}
    ${floaters}
    <div class="vign"></div>
    <div class="prog" id="bg-prog"></div>
    ${flashes}
  </div>
  <script>
  (function () {
  ${HELPERS}
  const tl = gsap.timeline({ paused: true });
  const D = ${T};
  tl.fromTo("#bg-floor", { backgroundPosition: "0px 0px" }, { backgroundPosition: "0px " + Math.round(D * 60) + "px", duration: D, ease: "none" }, 0);
  loop(tl, "#bg-horizon", { opacity: 0.35 }, { opacity: 0.8 }, 4, 0, D);
  tl.fromTo("#bg-prog", { scaleX: 0 }, { scaleX: 1, duration: D, ease: "none" }, 0);
  const rnd = mulberry32(99);
  document.querySelectorAll(".dust").forEach((p) => {
    const rise = 200 + rnd() * 500;
    tl.fromTo(p, { y: 0 }, { y: -rise, duration: D, ease: "none" }, 0);
    loop(tl, p, { x: -12, opacity: 0.25 }, { x: 12, opacity: 0.9 }, 3 + rnd() * 4, 0, D);
  });
  document.querySelectorAll(".fl").forEach((f, i) => {
    tl.fromTo(f, { rotation: 0, rotationY: 0 }, { rotation: i % 2 ? 140 : -140, rotationY: 360, transformPerspective: 800, duration: D, ease: "none" }, 0);
    loop(tl, f, { y: 0 }, { y: -40 }, 6 + i, 0, D);
  });
  document.querySelectorAll(".flash").forEach((f) => {
    const s = +f.dataset.start;
    tl.fromTo(f.querySelector(".burst"), { opacity: 0, scale: 0.3 }, { opacity: 1, scale: 1.2, duration: 0.3, ease: E.out }, s);
    tl.to(f.querySelector(".burst"), { opacity: 0, duration: 0.5, ease: E.in }, s + 0.35);
    tl.fromTo(f.querySelector(".beam"), { opacity: 1, scaleX: 0 }, { scaleX: 1, opacity: 0, duration: 0.8, ease: E.out }, s + 0.1);
  });
  window.__timelines["bg"] = tl;
  })();
  </script>
</template>
`;
}

/* ------------------------------------------------------------------ */
/* Root                                                                */
/* ------------------------------------------------------------------ */

function host(id, start, dur, track, kind, z) {
  return `
      <div id="${id}" data-composition-id="${id}" data-composition-src="compositions/${id}.html"
        data-start="${start}" data-duration="${dur}" data-track-index="${track}" data-track-kind="${kind}"
        data-width="${W}" data-height="${H}" style="z-index:${z}"></div>`;
}

const index = `<!doctype html>
<html lang="ar" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <script src="assets/lib/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; background: #050A14; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${T}" data-width="${W}" data-height="${H}">
      ${host("bg", 0, T, 0, "graphics", 1)}
      ${SCENES.map((sc) => host(sc.id, sc.start, r2(sc.end - sc.start), 1, "graphics", 2)).join("")}
      ${host("captions", 0, T, 2, "captions", 3)}
      <audio id="voice" src="assets/audio/voice.mp3" data-start="0" data-duration="${T}" data-track-index="3" data-volume="1"></audio>
    </div>
    <script>
      window.__timelines["main"] = gsap.timeline({ paused: true });
    </script>
  </body>
</html>
`;

function out(rel, text) {
  const p = join(ROOT, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, text);
}
out("index.html", index);
out("compositions/bg.html", bgScene());
out("compositions/captions.html", captionsScene());
SCENES.forEach((sc) => out(`compositions/${sc.id}.html`, chapterScene(sc)));
console.log("built", 2 + SCENES.length + 1, "files");
