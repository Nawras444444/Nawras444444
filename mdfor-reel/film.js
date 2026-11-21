// mdfor.dev — Motion Reel (16:9, 30 s, 120 BPM, 4/4). Pure function of time: window.seek(t) paints frame t.
// Every picture is a real capture of mdfor.dev, cut into components (icons, panes, cards). Timing is in
// beats (u) on the measured grid in beats.json; the music is in audio/music.wav.
import * as M from './lib/motion.js';

const { W, H, E, prog, clamp, lerp, springU, SPRING, wobble, font, layout, glyph, text, fill, shake, rrect, mulberry32, TAU } = M;

// Brand tokens from assets/brand.json (the site's own palette). One accent: terracotta.
const PAPER = '#faf7f1', SURF = '#fffdf8', INK = '#2c2722', ACC = '#b25a37';
const DARK = '#1b1916';
const SHADOW = 'rgba(44,39,34,0.20)';
const DISP = 'Display', UI = 'UI';      // two faces: Fraunces for display, Hanken Grotesk for UI

const S = 1200 / 2880;                  // the desktop capture (2880 px wide) shown at 1200 px on stage
const WX = 360, WY = 170;               // window top-left on stage
const CY = 545;                         // stage centre line
const RY = CY - 25;                     // icon row centre (inside the component tray)

// [beat, label, sfx, opts] — every visual accent. sfx.mjs voices each one, so sound can't drift from picture.
const HITS = [
  [0, 'write slams in', 'impact'],
  [2, 'see slides in', 'thud'],
  [4, 'keep slams in', 'pop', { pitch: 'D6' }],
  [5, 'asterisks spring', 'tick'],
  [6.6, 'markdown renders bold', 'pop', { pitch: 'A5' }],
  [8, 'window pops', 'whoosh', { len: 0.4, from: 400, to: 2400 }],
  [12, 'window explodes', 'impact'],
  [14.5, 'icons detach', 'tick'],
  [16, 'tray lands', 'thud'],
  [22, 'components return', 'whoosh', { len: 0.4, from: 2400, to: 600 }],
  [24, 'the drop', 'impact'],
  [24.4, 'heading in', 'tick'],
  [25.2, 'tip in', 'pop'],
  [26.2, 'list in', 'pop', { pitch: 'A5' }],
  [28, 'shortcut chip', 'tick'],
  [31, 'export pill', 'pop'],
  [32, 'menu drops', 'thud'],
  [33, 'outline slides', 'tick'],
  [36, 'dark cut', 'whoosh', { len: 0.4, from: 600, to: 2400 }],
  [38.4, 'dark settles', 'thud'],
  [44, 'light again', 'whoosh', { len: 0.4, from: 2400, to: 600 }],
  [46.2, 'no account', 'thud'],
  [48.2, 'no server', 'thud'],
  [50.2, 'no tracking', 'impact'],
  [52.4, 'sub line', 'tick'],
  [56, 'end card', 'impact'],
  [57, 'logo lands', 'bell', { pitch: 'D6' }],
  [57.2, 'tagline in', 'tick'],
];

// Header controls: centre and width in capture pixels (2880 px wide), and their size in the icon row.
const ICONS = [
  { k: 'logo_lockup', cx: 161, cy: 60, cw: 252, ch: 80, row: 66 },
  { k: 'ic_sync', cx: 1878, cy: 60, cw: 80, ch: 80, row: 80 },
  { k: 'ic_lint', cx: 1976, cy: 60, cw: 84, ch: 80, row: 80 },
  { k: 'ic_outline', cx: 2074, cy: 60, cw: 80, ch: 80, row: 80 },
  { k: 'ic_images', cx: 2170, cy: 60, cw: 80, ch: 80, row: 80 },
  { k: 'pill_import_export', cx: 2388, cy: 60, cw: 312, ch: 80, row: 80 },
  { k: 'ic_theme', cx: 2608, cy: 60, cw: 80, ch: 80, row: 80 },
  { k: 'ic_help', cx: 2704, cy: 60, cw: 80, ch: 80, row: 80 },
  { k: 'ic_github', cx: 2800, cy: 60, cw: 80, ch: 80, row: 80 },
];
const ROW_GAP = 26;
const ROW = (() => {
  const widths = ICONS.map((ic) => (ic.row * ic.cw) / ic.ch);
  const total = widths.reduce((a, b) => a + b, 0) + ROW_GAP * (ICONS.length - 1);
  let x = W / 2 - total / 2;
  return ICONS.map((ic, i) => { const c = { cx: x + widths[i] / 2, w: widths[i] }; x += widths[i] + ROW_GAP; return c; });
})();

// Stack of preview components for the drop (centre x, centre y, width on stage).
const STACK = [
  { img: 'welcome_heading', x: 960, y: 270, w: 760, t: 24.4, shadow: 0 },
  { img: 'tip_card', x: 960, y: 403, w: 760, t: 25.2, shadow: 36 },
  { img: 'getting_around', x: 960, y: 688, w: 760, t: 26.2, shadow: 36 },
];

// ------------------------------------------------------------------ helpers

const bigFill = (ctx, c) => { ctx.fillStyle = c; ctx.fillRect(-80, -80, W + 160, H + 160); };

// Place a captured image centred on (cx, cy) at width w (height follows its aspect).
function place(ctx, img, cx, cy, w, o = {}) {
  if (!img || w <= 0.5) return;
  const { rot = 0, sx = 1, sy = 1, shadow = 0, radius = 0 } = o;
  const h = (w * img.height) / img.width;
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(sx, sy);
  if (shadow) { ctx.shadowColor = SHADOW; ctx.shadowBlur = shadow; ctx.shadowOffsetY = shadow * 0.3; }
  if (radius) {
    rrect(ctx, -w / 2, -h / 2, w, h, radius);
    ctx.fillStyle = SURF; ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.clip();
  }
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

// A pane of the desktop capture, top-left at (x, y), rotated about its centre, with a drop shadow.
function panel(ctx, img, x, y, w, h, rot = 0) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2); ctx.rotate(rot);
  ctx.shadowColor = SHADOW; ctx.shadowBlur = 40; ctx.shadowOffsetY = 12;
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

// Display words built glyph by glyph: each letter springs in on its own offset, from direction dir.
function word(ctx, str, x, y, size, weight, color, u, u0, o = {}) {
  const { dir = [0, 1], dist = 300, stagger = 0.035, exit = null, track = -0.03, family = DISP } = o;
  const f = font(size, weight, family);
  const L = layout(ctx, str, f, track * size);
  const ex = exit === null ? 0 : E.inBack(prog(u, exit, exit + 0.5), 1.2);
  L.glyphs.forEach((g, j) => {
    const t0 = u0 + j * stagger;
    if (u < t0) return;
    const k = springU(u, t0, SPRING.bouncy);
    glyph(ctx, g.ch, x + g.cx + dir[0] * dist * (1 - k), y + dir[1] * dist * (1 - k) - ex * 900, f, color, k, k);
  });
}

// A line of text revealed by a wipe that also slides a little.
function wipe(ctx, str, x, y, size, weight, family, color, u, u0, dur, align = 'left', track = -0.02) {
  const p = E.outQuint(prog(u, u0, u0 + dur));
  if (p <= 0) return;
  const f = font(size, weight, family);
  const L = layout(ctx, str, f, track * size);
  const x0 = align === 'center' ? x - L.width / 2 : x;
  ctx.save();
  ctx.beginPath(); ctx.rect(x0 - size * 0.1, y - size * 1.1, (L.width + size * 0.2) * p, size * 1.7); ctx.clip();
  text(ctx, str, x0 + (1 - p) * size * 0.35, y, f, color, 'left', track * size);
  ctx.restore();
}

// ------------------------------------------------------------------ scene 1: the type (beats 0-8)

function sceneOpen(ctx, u) {
  bigFill(ctx, PAPER);
  const x = 150, size = 250;
  word(ctx, 'Write it.', x, 430, size, 600, INK, u, 0, { dir: [0, 1], dist: 340, exit: 7.4 });
  word(ctx, 'See it.', x, 660, size, 600, INK, u, 2, { dir: [1, 0], dist: 720, exit: 7.4 });
  // "Keep it." gets markdown asterisks that spring in, then the text renders bold as they collapse.
  const rendered = u >= 6.6;
  word(ctx, 'Keep it.', x, 890, size, rendered ? 800 : 600, ACC, u, 4, { dir: [0, 1], dist: 380, exit: 7.4 });
  const wKeep = layout(ctx, 'Keep it.', font(size, 600, DISP), -0.03 * size).width;
  const collapse = clamp(springU(u, 6.6, SPRING.snappy));
  const ka = springU(u, 5, SPRING.bouncy) * (1 - collapse);
  const kb = springU(u, 5.4, SPRING.bouncy) * (1 - collapse);
  if (ka > 0.02) glyph(ctx, '**', x - 95, 890 - 150, font(180, 600, UI), ACC, ka, ka);
  if (kb > 0.02) glyph(ctx, '**', x + wKeep + 95, 890 - 150, font(180, 600, UI), ACC, kb, kb);
}

// ------------------------------------------------------------------ scene 2-3: the product in parts (beats 8-24)

// Eased in and out of "exploded": 0 = assembled, 1 = the header and panes split apart.
function explode(u) { return clamp(springU(u, 12, SPRING.bouncy) - springU(u, 22, SPRING.snappy)); }

function drawWindow(ctx, u, IMG) {
  const e = explode(u);
  const pop = springU(u, 8, SPRING.bouncy);
  const sc = 0.82 + 0.18 * pop + 0.02 * wobble(u - 8, 2.2, 6);
  const fall = springU(u, 23.4, SPRING.snappy) * 1200;
  ctx.save();
  ctx.translate(W / 2, CY + fall); ctx.scale(sc, sc); ctx.translate(-W / 2, -CY);
  const dyH = -90 * e;
  ctx.drawImage(IMG.header_bg, WX, WY + dyH, 1200, 71);
  panel(ctx, IMG.editor_pane, WX - 120 * e, WY + 71 + 30 * e, 600, 680, -0.05 * e);
  panel(ctx, IMG.preview_pane, WX + 600 + 120 * e, WY + 71 + 30 * e, 600, 680, 0.05 * e);
  drawTray(ctx, u);
  drawIcons(ctx, u, IMG, dyH);
  ctx.restore();
}

// The component tray the icons land on: a card that springs in at beat 15.5 and leaves at 22.4.
function drawTray(ctx, u) {
  const k = clamp(springU(u, 15.5, SPRING.bouncy) - springU(u, 22.4, SPRING.snappy));
  if (k <= 0.001) return;
  const w = 1600 * k, h = 300 * k;
  ctx.save();
  ctx.shadowColor = SHADOW; ctx.shadowBlur = 60; ctx.shadowOffsetY = 20;
  rrect(ctx, W / 2 - w / 2, CY - h / 2, w, h, 36 * k);
  ctx.fillStyle = SURF; ctx.fill();
  ctx.restore();
  wipe(ctx, 'Every control, its own component.', W / 2, CY + 112, 34, 500, UI, 'rgba(44,39,34,0.72)', u, 16.4, 0.8, 'center');
}

// The header controls, each one lifted out of the bar and into the row. They bob on every beat once set.
function drawIcons(ctx, u, IMG, dyH) {
  const frac = u - Math.floor(u);
  ICONS.forEach((ic, i) => {
    const p = clamp(springU(u, 14.5 + i * 0.2, SPRING.bouncy) - springU(u, 22 + i * 0.12, SPRING.snappy));
    const hx = WX + ic.cx * S, hy = WY + ic.cy * S + dyH, hw = ic.cw * S;
    const bob = 1 + 0.045 * (u >= 16 ? wobble(frac, 1, 4) : 0) * p;
    place(ctx, IMG[ic.k], lerp(hx, ROW[i].cx, p), lerp(hy, RY, p), lerp(hw, ROW[i].w, p),
      { sx: bob, sy: bob, shadow: p > 0.5 ? 14 : 0 });
  });
}

// ------------------------------------------------------------------ scene 4-5: the drop, then the export fan (beats 24-36)

function drawStack(ctx, u, IMG) {
  const out = springU(u, 31, SPRING.snappy) * 1200;      // the stack drops off the bottom on the export hit
  STACK.forEach((s) => {
    const p = springU(u, s.t, SPRING.bouncy);
    const sq = 1 + 0.03 * wobble(u - s.t, 1, 4);
    const y = lerp(s.y + 900, s.y, p) + out;
    place(ctx, IMG[s.img], s.x, y, s.w, { sx: sq, sy: sq, shadow: s.shadow, radius: s.shadow ? 18 : 0 });
  });
  const k = clamp(springU(u, 28, SPRING.bouncy));
  place(ctx, IMG.kbd_save, 1560, 300 + out, 200 * k, { shadow: 24 });
}

function drawFan(ctx, u, IMG) {
  const out = springU(u, 35.4, SPRING.snappy) * -1200;
  const pill = clamp(springU(u, 31, SPRING.bouncy));
  place(ctx, IMG.pill_import_export, W / 2, 232 + out, 540 * pill, { shadow: 24 });
  const menu = springU(u, 32, SPRING.bouncy);
  place(ctx, IMG.export_menu, W / 2, lerp(300, 580, menu) + out, 480, { shadow: 40, radius: 18 });
  const ol = springU(u, 33, SPRING.bouncy);
  place(ctx, IMG.outline_panel, lerp(W + 300, 1480, ol), 580 + out, 330, { shadow: 40, radius: 18 });
}

// ------------------------------------------------------------------ scene 6: light to dark (beats 36-44)

// The real light capture, then the real dark capture revealed as a circle from the theme button.
function drawDark(ctx, u, IMG) {
  const z = 1.05 ** prog(u, 38.4, 44);
  ctx.save();
  ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
  bigFill(ctx, PAPER);
  ctx.drawImage(IMG.lightWin, 0, 0, W, 1200);
  const r = 2300 * E.inOutCubic(prog(u, 36, 38.4));
  ctx.save();
  ctx.beginPath(); ctx.arc(1739, 40, r, 0, TAU); ctx.clip();
  ctx.drawImage(IMG.darkWin, 0, 0, W, 1200);
  ctx.restore();
  ctx.restore();
}

// Dark collapses into the centre (beats 44-46), leaving the paper.
function drawDarkOut(ctx, u, IMG) {
  const r = 2300 * (1 - E.inOutCubic(prog(u, 44, 46)));
  if (r <= 0) return;
  ctx.save();
  ctx.translate(W / 2, H / 2); ctx.scale(1.05, 1.05); ctx.translate(-W / 2, -H / 2);
  ctx.beginPath(); ctx.arc(W / 2, H / 2, r, 0, TAU); ctx.clip();
  ctx.drawImage(IMG.darkWin, 0, 0, W, 1200);
  ctx.restore();
}

// ------------------------------------------------------------------ scene 7: the claims (beats 44-56)

function sceneWords(ctx, u) {
  wipe(ctx, 'No account.', 170, 430, 230, 600, DISP, INK, u, 46.2, 0.9);
  wipe(ctx, 'No server.', 170, 650, 230, 600, DISP, INK, u, 48.2, 0.9);
  wipe(ctx, 'No tracking.', 170, 870, 230, 600, DISP, ACC, u, 50.2, 0.9);
  const tw = layout(ctx, 'No tracking.', font(230, 600, DISP), -0.02 * 230).width;
  const p = E.outQuint(prog(u, 51.4, 52.2));
  if (p > 0) {
    ctx.save();
    ctx.strokeStyle = ACC; ctx.lineWidth = 14; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(176, 912); ctx.lineTo(176 + (tw - 12) * p, 912); ctx.stroke();
    ctx.restore();
  }
  wipe(ctx, 'Everything stays in this browser.', 170, 985, 44, 500, UI, INK, u, 52.4, 0.8);
}

// ------------------------------------------------------------------ scene 8: end card (beats 56-60)

function sceneEnd(ctx, u, IMG) {
  bigFill(ctx, PAPER);
  const k = springU(u, 56, SPRING.bouncy);
  if (k > 0) place(ctx, IMG.logo_lockup, W / 2, 440, 760 * Math.max(0.001, k), { rot: (1 - clamp(k)) * -0.12 });
  const r = E.outQuint(prog(u, 58.4, 59.2));
  if (r > 0) { ctx.fillStyle = ACC; ctx.fillRect(W / 2 - 150 * r, 620, 300 * r, 6); }
  wipe(ctx, 'A fast, private markdown editor', W / 2, 728, 56, 500, UI, INK, u, 57.2, 0.7, 'center');
  wipe(ctx, 'with instant live preview.', W / 2, 806, 56, 500, UI, INK, u, 57.8, 0.7, 'center');
}

// ------------------------------------------------------------------ harness hooks

let grain = null;
// Once: a seeded noise tile for film grain (never Math.random).
function init(ctx) {
  const nc = document.createElement('canvas');
  nc.width = nc.height = 256;
  const nx = nc.getContext('2d');
  const id = nx.createImageData(256, 256);
  const rnd = mulberry32(7);
  for (let i = 0; i < id.data.length; i += 4) {
    const v = Math.floor(rnd() * 255);
    id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255;
  }
  nx.putImageData(id, 0, 0);
  grain = ctx.createPattern(nc, 'repeat');
}

// After motion blur: the two full-frame flashes (drop and end card) and the grain.
function post(ctx, u) {
  for (const [u0, a] of [[24, 0.55], [56, 0.9]]) {
    if (u >= u0 && u < u0 + 1) {
      ctx.save(); ctx.globalAlpha = a * Math.exp(-(u - u0) * 7); ctx.fillStyle = ACC; ctx.fillRect(0, 0, W, H); ctx.restore();
    }
  }
  if (grain) {
    const k = Math.floor(u * 48);
    const ox = (k * 53) % 256, oy = (k * 97) % 256;
    ctx.save(); ctx.globalAlpha = 0.07; ctx.globalCompositeOperation = 'overlay';
    ctx.translate(ox, oy); ctx.fillStyle = grain; ctx.fillRect(-ox, -oy, W + 256, H + 256);
    ctx.restore();
  }
}

const part = (n) => `assets/parts/${n}.png`;
const images = Object.fromEntries([
  'header_bg', 'editor_pane', 'preview_pane', 'logo_lockup', 'ic_sync', 'ic_lint', 'ic_outline', 'ic_images',
  'pill_import_export', 'ic_theme', 'ic_help', 'ic_github', 'welcome_heading', 'tip_card', 'getting_around',
  'kbd_save', 'export_menu', 'outline_panel',
].map((n) => [n, part(n)]));
images.lightWin = 'assets/shots/desktop_viewport.png';
images.darkWin = 'assets/shots/dark_clean.png';

M.film({
  fonts: [font(100, 600, DISP), font(100, 800, DISP), font(40, 500, UI), font(40, 600, UI)],
  images,
  hits: HITS,
  init,
  post,
  draw(ctx, u, t, IMG) {
    shake(ctx, u, 12, 12);
    shake(ctx, u, 24, 18);
    shake(ctx, u, 56, 10);
    if (u < 8) return sceneOpen(ctx, u);
    if (u < 24) { bigFill(ctx, PAPER); return drawWindow(ctx, u, IMG); }
    if (u < 36) { bigFill(ctx, PAPER); drawStack(ctx, u, IMG); if (u >= 31) drawFan(ctx, u, IMG); return; }
    if (u < 44) return drawDark(ctx, u, IMG);
    if (u < 56) { bigFill(ctx, PAPER); drawDarkOut(ctx, u, IMG); return sceneWords(ctx, u); }
    return sceneEnd(ctx, u, IMG);
  },
});
