// Painted backgrounds: one road, three colour models (gold dusk, burgundy storm, afterglow). Each layer is painted once at load as a colour + emissive pair, then only slid.
import { canvas, W, H, TAU, rng, airbrush, vgrad, rgba, mix, cel, path, line } from './cel.js';

const HZ = 640;                 // horizon line on screen
const SKY_H = 1700, SKY_HZ = 1100;
const SET = {
  gold: {
    sky: [[0, '#2e1850'], [.3, '#7b2f62'], [.5, '#d8583f'], [.62, '#F7B538'], [.647, '#ffd980'], [1, '#F7B538']],
    cloudTop: '#7b2f62', cloudMid: '#d8583f', cloudLit: '#ffc761', cloudA: .85,
    city: '#4a2858', cityRim: '#e0795a', win: '#ffd66b', winN: 26,
    far: ['#d0705f', '#f0a05a'], near: ['#8a3f5c', '#c0584f'], ground: ['#8a4a4a', '#6a3550'], verge: ['#b87a50', '#8a5240'],
    road: '#5c3e5a', roadHi: '#8c5a66', edge: '#e2a35a', dash: '#ffe9b0', tree: ['#4a2548', '#2c1536', '#a8554f'], pole: '#2a1230',
    wet: 0, sun: 1,
  },
  storm: {
    sky: [[0, '#14020a'], [.3, '#3a0614'], [.5, '#780116'], [.62, '#9c2a28'], [.647, '#c4553a'], [1, '#780116']],
    cloudTop: '#1c0510', cloudMid: '#4a0a1a', cloudLit: '#a02a38', cloudA: .96,
    city: '#1a0610', cityRim: '#6a1626', win: '#ffd66b', winN: 14,
    far: ['#3a0a1e', '#5a1428'], near: ['#2a0713', '#3e0e1c'], ground: ['#33101e', '#220a14'], verge: ['#4a1a22', '#2c0f18'],
    road: '#2a1020', roadHi: '#5a2438', edge: '#6a3a38', dash: '#d8b890', tree: ['#1a0a14', '#0e050a', '#5a1e2a'], pole: '#12050c',
    wet: 1, sun: 0,
  },
  after: {
    sky: [[0, '#6f5fa8'], [.3, '#c0709a'], [.5, '#f09878'], [.62, '#F7B538'], [.647, '#ffe9ae'], [1, '#F7B538']],
    cloudTop: '#b98ab8', cloudMid: '#f3a58a', cloudLit: '#ffe29a', cloudA: .8,
    city: '#6a4a78', cityRim: '#f0a070', win: '#ffd66b', winN: 22,
    far: ['#e08c78', '#f5b98a'], near: ['#b66a78', '#d98a78'], ground: ['#a8606a', '#8a4a62'], verge: ['#d09870', '#a8706a'],
    road: '#6e506a', roadHi: '#a87880', edge: '#f0b878', dash: '#fff0c0', tree: ['#5a3560', '#3a2048', '#d07a7a'], pole: '#3a1c40',
    wet: .8, sun: .7,
  },
};
const mk = (w, h) => canvas(w, h);
const periodic = (R, n, amp) => { const a = []; for (let i = 0; i < n; i++) a.push({ f: 1 + Math.floor(R() * 5), p: R() * TAU, a: amp * (.35 + R() * .65) / (i + 1) ** .3 }); return a; };
const hillY = (arr, x, w) => arr.reduce((s, q) => s + q.a * Math.sin(q.f * TAU * x / w + q.p), 0);

function skyPlate(S) {
  const [c, g] = mk(W, SKY_H), [ce, e] = mk(W, SKY_H);
  vgrad(g, 0, 0, W, SKY_H, S.sky);
  if (S.sun) {
    airbrush(g, 1440, SKY_HZ - 40, 520, 300, '#ffd98a', .5 * S.sun, 1);
    airbrush(g, 1440, SKY_HZ - 40, 200, 150, '#fff3c8', .9 * S.sun, .8);
    g.fillStyle = rgba('#fff8e0', .95 * S.sun); g.beginPath(); g.arc(1440, SKY_HZ - 20, 92, 0, TAU); g.fill();
    airbrush(e, 1440, SKY_HZ - 20, 340, 260, '#ffb940', .55 * S.sun, 1);
  }
  if (S === SET.after) {   // rainbow: faint double arc on the left
    for (const [r, a] of [[880, .34], [1000, .16]]) {
      const bands = ['#ff6a6a', '#ffb347', '#ffe66a', '#7be0a0', '#6ab8ff', '#9a7aff'];
      bands.forEach((col, i) => { g.strokeStyle = rgba(col, a); g.lineWidth = 12; g.beginPath(); g.arc(560, SKY_HZ + 360, r - i * 12 * (r > 900 ? -1 : 1), Math.PI * 1.02, Math.PI * 1.98); g.stroke(); });
    }
  }
  return [c, ce];
}
function cloudPlate(S, seed) {
  const CW = 2880, CH = 1000, [c, g] = mk(CW, CH), [ce, e] = mk(CW, CH), R = rng(seed);
  const storm = S === SET.storm;
  const n = storm ? 46 : 20;
  const draw = (x, y, rx, ry) => {
    for (const dx of [-CW, 0, CW]) {
      airbrush(g, x + dx, y, rx, ry, S.cloudTop, S.cloudA * (storm ? .95 : .7), .55);
      airbrush(g, x + dx, y + ry * .35, rx * .86, ry * .55, S.cloudMid, S.cloudA * (storm ? .8 : .85), .5);
      airbrush(g, x + dx - rx * .1, y + ry * .62, rx * .7, ry * .3, S.cloudLit, S.cloudA * (storm ? .5 : .9), .6);   // lit underside
    }
  };
  for (let i = 0; i < n; i++) {
    const row = R(), y = storm ? 80 + row * 520 : 240 + row * 600, rx = storm ? 260 + R() * 360 : 160 + R() * 380, ry = storm ? 90 + R() * 130 : 26 + R() * 46;
    draw(R() * CW, y, rx, ry);
  }
  return [c, ce];
}
function cityPlate(S, seed) {
  const PW = 2400, PH = 420, [c, g] = mk(PW, PH), [ce, e] = mk(PW, PH), R = rng(seed);
  let x = 120;
  const bs = [];
  while (x < 1280) { const w = 40 + R() * 70, h = 110 + R() * 200 + (R() < .12 ? 120 : 0); bs.push([x, w, h]); x += w + 4 + R() * 10; }
  for (const [x0, w, h] of bs) {
    cel(g, [[x0, PH, 1], [x0, PH - h, 1], [x0 + w, PH - h, 1], [x0 + w, PH, 1]], { f: S.city, s: mix(S.city, '#000000', .35), so: [-8, 0], rim: { c: S.cityRim, d: [-3, 0] } });
    if (R() < .3) { g.fillStyle = S.city; g.fillRect(x0 + w / 2 - 1.5, PH - h - 44, 3, 44); }
  }
  for (const [x0, w, h] of bs) for (let k = 0; k < S.winN * w / 90; k++) {
    const wx = x0 + 6 + R() * (w - 14), wy = PH - h + 10 + R() * (h - 24), a = .5 + R() * .5;
    g.fillStyle = rgba(S.win, .55 * a); g.fillRect(wx, wy, 5, 7); e.fillStyle = rgba(S.win, a); e.fillRect(wx - 1, wy - 1, 7, 9);
  }
  return [c, ce];
}
function hillPlate(S, which, seed) {
  const PW = 3840, PH = 330, [c, g] = mk(PW, PH), R = rng(seed);
  const arr = periodic(R, 4, which ? 34 : 60), base = which ? PH - 70 : PH - 90;
  const pts = []; for (let x = 0; x <= PW; x += 20) pts.push([x, base + hillY(arr, x, PW) - (which ? 0 : 40)]);
  g.beginPath(); g.moveTo(0, PH); for (const p of pts) g.lineTo(p[0], p[1]); g.lineTo(PW, PH); g.closePath();
  const cols = which ? S.near : S.far, gr = g.createLinearGradient(0, PH - 220, 0, PH); gr.addColorStop(0, cols[0]); gr.addColorStop(1, cols[1]);
  g.fillStyle = gr; g.fill();
  return c;
}
function midPlate(S, seed) {
  const PW = 3840, PH = 360, [c, g] = mk(PW, PH), R = rng(seed);
  vgrad(g, 0, 90, PW, PH - 90, [[0, S.ground[0]], [1, S.ground[1]]]);
  // field furrows
  g.strokeStyle = rgba('#000000', .1); g.lineWidth = 2; for (let i = 0; i < 30; i++) { const y = 110 + i * 8; g.beginPath(); g.moveTo(0, y); g.lineTo(PW, y); g.stroke(); }
  // tree clumps
  for (let i = 0; i < 26; i++) {
    const x = R() * PW, y = 100 + R() * 40, r = 38 + R() * 46;
    for (const dx of [-PW, 0, PW]) {
      cel(g, [[x + dx - r, y + 30, 1], [x + dx - r * .9, y - r * .4], [x + dx - r * .2, y - r], [x + dx + r * .6, y - r * .7], [x + dx + r, y - r * .1], [x + dx + r * .9, y + 30, 1]],
        { f: S.tree[0], s: S.tree[1], so: [r * .12, -r * .1], rim: { c: S.tree[2], d: [-2.5, 2] } });
      g.fillStyle = S.tree[1]; g.fillRect(x + dx - 3, y + 24, 6, 20);
    }
  }
  // fence posts (period 120) and wire
  g.strokeStyle = S.pole; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 150); g.lineTo(PW, 150); g.stroke();
  for (let x = 0; x < PW; x += 120) { g.fillStyle = S.pole; g.fillRect(x - 3, 126, 6, 54); }
  // telegraph poles + sagging wires (period 1280)
  for (let i = -1; i < 4; i++) {
    const x = 500 + i * 1280;
    g.fillStyle = S.pole; g.fillRect(x - 6, -60, 12, 240); g.fillRect(x - 40, -48, 80, 7); g.fillRect(x - 32, -22, 64, 6);
    for (const [dy, off] of [[-46, -34], [-46, 34], [-20, -26], [-20, 26]]) {
      g.strokeStyle = S.pole; g.lineWidth = 1.8; g.beginPath(); g.moveTo(x + off, dy); g.quadraticCurveTo(x + off + 640, dy + 88, x + off + 1280, dy); g.stroke();
    }
  }
  return c;
}
function roadPlate(S, seed) {
  const PW = 3840, PH = 440, [c, g] = mk(PW, PH), [ce, e] = mk(PW, PH), R = rng(seed);
  vgrad(g, 0, 0, PW, 60, [[0, S.verge[0]], [1, S.verge[1]]]);
  g.fillStyle = S.edge; g.fillRect(0, 56, PW, 14);                       // gravel shoulder line
  vgrad(g, 0, 70, PW, 190, [[0, S.road], [1, mix(S.road, '#000000', .25)]]);
  g.fillStyle = S.roadHi; g.fillRect(0, 70, PW, 5);
  g.fillStyle = S.edge; g.fillRect(0, 258, PW, 12);
  vgrad(g, 0, 270, PW, PH - 270, [[0, S.verge[1]], [1, mix(S.verge[1], '#000000', .35)]]);
  for (let x = 0; x < PW; x += 240) { g.fillStyle = S.dash; g.fillRect(x + 40, 160, 120, 11); }
  // asphalt flecks
  for (let i = 0; i < 500; i++) { g.fillStyle = rgba('#000000', .08 + R() * .1); g.fillRect(R() * PW, 80 + R() * 170, 3 + R() * 6, 2); }
  if (S.wet) {   // wet road: sky colours streaked down the asphalt + puddles
    const stripes = S === SET.storm ? ['#c4553a', '#9c2a28'] : ['#F7B538', '#f09878'];
    for (let i = 0; i < 70; i++) { const x = R() * PW, w = 30 + R() * 160; airbrush(g, x, 90 + R() * 150, w, 8 + R() * 10, stripes[i % 2], .3 * S.wet, .8); }
    for (let i = 0; i < 12; i++) {
      const x = i * (PW / 12) + R() * 200, y = 205 + R() * 40, rx = 70 + R() * 90;
      for (const dx of [-PW, 0, PW]) { g.fillStyle = rgba(S === SET.storm ? '#5a2438' : '#ffd9a0', .55); g.beginPath(); g.ellipse(x + dx, y, rx, 12, 0, 0, TAU); g.fill();
        g.strokeStyle = rgba('#ffffff', .25); g.lineWidth = 2; g.beginPath(); g.ellipse(x + dx, y, rx, 12, 0, 0, TAU); g.stroke(); }
    }
  }
  return c;
}
function grassPlate(S, seed) {
  const PW = 3840, PH = 180, [c, g] = mk(PW, PH), R = rng(seed), col = S.tree[1];
  g.fillStyle = col; g.fillRect(0, 120, PW, 60);
  for (let i = 0; i < 520; i++) {
    const x = R() * PW, h = 40 + R() * 90, lean = (R() - .5) * 40;
    for (const dx of [-PW, 0, PW]) { g.fillStyle = R() < .25 ? S.tree[0] : col; g.beginPath(); g.moveTo(x + dx - 7, 150); g.quadraticCurveTo(x + dx - 2, 150 - h * .6, x + dx + lean, 150 - h); g.quadraticCurveTo(x + dx + 3, 150 - h * .5, x + dx + 8, 150); g.fill(); }
  }
  return c;
}

export const WORLD = {};
for (const [name, S] of Object.entries(SET)) {
  const [sk, ske] = skyPlate(S), [cl, cle] = cloudPlate(S, 7), [ci, cie] = cityPlate(S, 5);
  WORLD[name] = { S, sky: sk, skyE: ske, cloud: cl, city: ci, cityE: cie, far: hillPlate(S, 0, 3), near: hillPlate(S, 1, 9), mid: midPlate(S, 11), road: roadPlate(S, 13), grass: grassPlate(S, 17) };
}
const sil = p => { const [c, x] = canvas(p.width, p.height); x.drawImage(p, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#000'; x.fillRect(0, 0, p.width, p.height); return c; };
for (const w of Object.values(WORLD)) { w.farS = sil(w.far); w.nearS = sil(w.near); w.midS = sil(w.mid); w.roadS = sil(w.road); }
const wrap = (g, p, x, y, par, camX, w = 3840) => { const x0 = -((camX * par) % w + w) % w; for (let k = 0; k < 2; k++) g.drawImage(p, x0 + k * w, y); };
const wrapW = (g, p, x, y, par, camX) => wrap(g, p, x, y, par, camX, p.width);

// camera: camX (world scroll), camY (tilt up, px), t (seconds, for cloud drift). o.noRoad draws only the backdrop. o.flash: 0..1 lightning wash.
export function drawWorld(g, e, set, o = {}) {
  const w = WORLD[set], camX = o.camX || 0, camY = o.camY || 0, t = o.t || 0;
  const sky = HZ - SKY_HZ + camY * .6;
  g.drawImage(w.sky, 0, sky); e.drawImage(w.skyE, 0, sky);
  const cy = HZ - 840 + camY * .78 + (set === 'storm' ? 40 : 0);
  wrapW(g, w.cloud, 0, cy, 1, t * 16 + camX * .03);
  const cs = .62, cyy = HZ - 420 * cs + 40 + camY * .94, cx0 = -((camX * .06 - (o.cityX || 0)) % w.city.width + w.city.width) % w.city.width;
  for (const [ctx, pl] of [[g, w.city], [e, w.cityE]]) for (let k = 0; k < 2; k++) ctx.drawImage(pl, cx0 * cs + k * pl.width * cs * 2, cyy, pl.width * cs, pl.height * cs);
  wrap(g, w.far, 0, HZ - 250 + camY * .96, .12, camX); wrap(e, w.farS, 0, HZ - 250 + camY * .96, .12, camX);
  wrap(g, w.near, 0, HZ - 250 + 40 + camY, .26, camX); wrap(e, w.nearS, 0, HZ - 250 + 40 + camY, .26, camX);
  wrap(g, w.mid, 0, HZ + 20 + camY, .55, camX); wrap(e, w.midS, 0, HZ + 20 + camY, .55, camX);
  if (!o.noRoad) { wrap(g, w.road, 0, 700 + camY, 1, camX); wrap(e, w.roadS, 0, 700 + camY, 1, camX); }
  if (o.grass) wrap(g, w.grass, 0, 930 + camY, 1.6, camX);
  if (o.flash) { g.fillStyle = rgba('#e8dcff', o.flash * .8); g.fillRect(0, 0, W, H); e.fillStyle = rgba('#ffffff', o.flash * .5); e.fillRect(0, 0, W, H); }
}

// A soft, out-of-focus version of the world for close-ups: painted at quarter size and drawn up with smoothing
const [bc, bg] = canvas(480, 270), [bce, be] = canvas(480, 270);
export function drawBokeh(g, e, set, o = {}) {
  for (const x of [bg, be]) { x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, 480, 270); x.fillStyle = '#000'; x.fillRect(0, 0, 480, 270); x.scale(.25, .25); }
  drawWorld(bg, be, set, { ...o, noRoad: false });
  g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.filter = 'blur(10px)';
  g.drawImage(bc, -140, -70, W + 280, H + 140); g.restore();
  e.save(); e.filter = 'blur(10px)'; e.drawImage(bce, -140, -70, W + 280, H + 140); e.restore();
}

// roadside leaf plant: three huge leaves on stems. Drawn in world space at screen position (x, y = ground)
import { leaf } from './hero.js';
import { pal } from './hero.js';
export function plant(g, e, set, x, y, k = 1, o = {}) {
  const P = pal(set === 'after' ? 'after' : set === 'storm' ? 'storm' : 'gold');
  g.save(); g.translate(x, y); g.scale(k, k);
  const sway = (o.sway || 0);
  const L = [[-70, -420, -2.0, 360, 270, 0], [30, -520, -1.15, 420, 300, 1], [-10, -330, -1.62, 300, 230, 2]];
  for (const [bx, by, ang, w, h, i] of L) {
    const a = ang + Math.sin((o.t || 0) * 3 + i) * .03 * sway;
    g.strokeStyle = P.leaf.l; g.lineWidth = 16; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(bx * .25, by * .6, bx, by); g.stroke();
    g.strokeStyle = P.leaf.s; g.lineWidth = 9; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(bx * .25, by * .6, bx, by); g.stroke();
    leaf(g, P, bx, by, w, h, a, { rim: true });
  }
  g.restore();
}
