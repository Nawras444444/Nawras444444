// Rain Check: one function per shot. Every function draws the colour canvas g and the emissive canvas e, and may return CRT overrides.
import { W, H, TAU, rng, rgba, mix, airbrush, cel, line, LWK } from './cel.js';
import { clamp, lerp, seg, ss, eio, eo, ei, back } from '/core/lib.js';
import { rain, splashes, speedLines, flare } from './fx.js';
import { man, head, pal, briefcase, paper, leaf } from './hero.js';
import { drawWorld, drawBokeh, plant } from './world.js';
import { q12, q8, T, XAN, BUR } from './story.js';

const OMEGA = 7;                       // walk cycle rad/s (one full cycle = 0.9 s, matched to the 360 px/s ground)
const CAM_V = 360;
const GY = 880;                        // ground line of the wide shots

// ------------------------------------------------------------ small helpers
function rainLayer(g, e, fr, amt, o = {}) {
  if (amt <= 0) return;
  const sd = (fr % 5) * 17;
  rain(g, e, fr, { n: Math.round(170 * amt), ang: o.ang ?? -.3, len: [34, 74], a: .26, w: .9, seed: sd, col: '#e6d6ff' });
}
function rainNear(g, e, fr, amt, o = {}) {
  if (amt <= 0) return;
  rain(g, e, fr + 1, { n: Math.round(46 * amt), ang: o.ang ?? -.3, len: [110, 210], a: .42, w: 2.6, seed: 400 + (fr % 7) * 11, col: '#f3e8ff' });
}
function flashWash(g, e, a) { if (a <= 0) return; g.fillStyle = rgba('#e4d6ff', a * .55); g.fillRect(0, 0, W, H); e.fillStyle = rgba('#ffffff', a * .35); e.fillRect(0, 0, W, H); }
function bolt(g, e, x, y0, y1, seed, w = 1) {
  const R = rng(seed); const pts = [[x, y0]]; let cx = x;
  for (let y = y0; y < y1; y += 28 + R() * 30) { cx += (R() - .5) * 70; pts.push([cx, y]); }
  pts.push([cx + (R() - .5) * 40, y1]);
  for (const [ctx, lw, col] of [[e, 26 * w, rgba('#b9a0ff', .55)], [e, 9 * w, rgba('#ffffff', .95)], [g, 5 * w, '#ffffff']]) {
    ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const p of pts) ctx.lineTo(p[0], p[1]); ctx.stroke(); ctx.restore();
  }
}
function leavesBlowing(g, t, a, b, amt = 1) {   // dry leaves tumbling across in the wind
  const R = rng(55);
  for (let i = 0; i < 9; i++) {
    const t0 = a + R() * (b - a - .8), sp = 900 + R() * 700, y0 = 640 + R() * 300, ph = R() * 6;
    const u = t - t0; if (u < 0 || u > 2.2) continue;
    const x = W + 80 - u * sp, y = y0 - Math.abs(Math.sin(u * 5 + ph)) * 120 * amt, r = u * 9 + ph;
    g.save(); g.translate(x, y); g.rotate(r); g.fillStyle = i % 2 ? '#a8602c' : '#6a8a3a'; g.strokeStyle = '#2a1230'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(-14, 0); g.quadraticCurveTo(0, -9, 15, 0); g.quadraticCurveTo(0, 9, -14, 0); g.fill(); g.stroke(); g.restore();
  }
}
const lookAt = (x, y) => ({ look: [x, y] });
function blinkOpen(t, period, off = 0) { const p = (t + off) % period; return p < .125 ? 0 : 1; }
function zoom(g, e, s, cx = W / 2, cy = H / 2, dx = 0, dy = 0) { for (const c of [g, e]) { c.translate(cx + dx, cy + dy); c.scale(s, s); c.translate(-cx, -cy); } }

// ------------------------------------------------------------ 1. walk (0-3): gold road, hero small, city far behind
export function walk(S) {
  const { g, e, t, fr } = S;
  const camX = CAM_V * t, ph = OMEGA * q12(t);
  drawWorld(g, e, 'gold', { camX, t, grass: false });
  flare(e, 1440, 622, .75, '#ffd28a', { ghosts: false, streak: 700 });
  heroWalk(g, 'gold', 820, GY, ph, t, { case: true, wind: .12 });
  drawWorld.grass && 0;
  leavesBlowing(g, t, 0, 3, .4);
  return { bloom: .95 };
}
function heroWalk(g, set, x, y, ph, t, o = {}) {
  const k = o.k ?? .4;
  return man(g, {
    k, x, y, set, phase: ph, t, wind: o.wind ?? .1, wet: o.wet || 0, run: o.run || 0, shirt: o.shirt,
    armN: o.carryLeaf ? [2.2, .9] : [.1 + .14 * Math.sin(ph + Math.PI), .1], armF: o.carryLeaf ? [.3 * Math.sin(ph) + .15, .9] : [.5 * Math.sin(ph), .25 + .2 * Math.max(0, Math.sin(ph))],
    head: { E: { open: o.eyesOpen ?? 1, brow: [0, 0], mouth: o.mouth || 'closed', look: o.look }, tilt: o.tilt || 0, dx: 0 },
    props: (gg, H, P) => {
      if (o.case) briefcase(gg, P, H.N[0] + 4, H.N[1] + 14, -.12 * Math.sin(ph - .6), 1);
      if (o.carryLeaf) { leaf(gg, P, H.N[0] - 250, H.N[1] - 60, 640, 420, -.18 + .03 * Math.sin(t * 3), {}); }
    },
  });
}

// ------------------------------------------------------------ 2. pat (3-4): medium, hero stops, pats his side, finds the crook empty
export function pat(S) {
  const { g, e, t, lt } = S;
  drawBokeh(g, e, 'gold', { camX: 1080, t, cityX: 0 });
  const k = .85, x = 860, y = 1260;
  const pt = (t0) => { const u = (t - t0) * 12; return u < 0 || u > 3 ? 0 : Math.sin(Math.min(u, 3) / 3 * Math.PI); };
  const pats = Math.max(pt(T.pat), pt(T.pat + .25));
  const surprised = seg(t, 3.28, 3.38);
  const up = ss(seg(t, 3.55, 3.85));
  const armPat = lerp(.35, .8, pats);
  man(g, {
    k, x, y, set: 'gold', phase: null, t, wind: .2 + .3 * up, lean: .04 - .05 * up,
    thN: .02, thF: -.03, flN: .05, flF: .05,
    armN: [.1, .12], armF: [armPat, 1.55 - .25 * pats],
    head: { E: { open: blinkOpen(t, 5, -.2) ? 1 : 0, brow: [-8 * surprised + 6 * (1 - surprised) * (t < 3.28 ? 1 : 0), 0], mouth: surprised > .5 ? 'oh' : 'closed', lid: t < 3.28 ? .3 : 0, look: [(.35 * (1 - up) + .1 * up), .5 * (1 - up) - .9 * up], iris: surprised > .5 ? .84 : 1 }, tilt: -.14 * up, dx: 6 * up },
    props: (gg, H, P) => briefcase(gg, P, H.N[0] + 4, H.N[1] + 14, 0, 1),
  });
  return {};
}

// ------------------------------------------------------------ 3. crane (4-6): tilt up, the burgundy front sweeps in
function sceneSet(g, e, set, camX, camY, t, heroSet, drop) {
  drawWorld(g, e, set, { camX, camY, t });
  if (set === 'gold') flare(e, 1440, 622 + camY * .6, .75, '#ffd28a', { ghosts: false, streak: 700 });
  man(g, { k: .4, x: 820, y: GY + camY, set: heroSet, phase: null, t, wind: .5, lean: -.04, armN: [.1, .12], armF: [.2, .3], thN: .02, thF: -.03,
    head: { E: { open: 1, mouth: 'oh', brow: [-8, -5], look: [.2, -.9] }, tilt: -.14, dx: 6 },
    props: (gg, H, P) => briefcase(gg, P, H.N[0] + 4, H.N[1] + 14, .12, 1) });
}
export function crane(S) {
  const { g, e, t, fr } = S;
  const camY = 520 * eio(seg(t, 4.0, 5.6)) + 30 * seg(t, 5.6, 6);
  const camX = 1080 + 40 * (t - 4);
  sceneSet(g, e, 'gold', camX, camY, t, 'gold');
  // the front: a painted cloud edge sweeping from the right over the sky and the hero
  const fx = lerp(2300, -500, eio(seg(t, 4.3, 5.6)));
  const edge = y => fx + 140 * Math.sin(y * .008 + 1) + 90 * Math.sin(y * .021) + (y - 540) * .4;
  const clip = () => { const P = new Path2D(); P.moveTo(W + 400, -600); for (let y = -600; y <= 1700; y += 40) P.lineTo(edge(y), y); P.lineTo(W + 400, 1700); P.closePath(); return P; };
  if (fx < W + 300) {
    const P = clip();
    g.save(); g.clip(P); e.save(); e.clip(P); e.fillStyle = '#000'; e.fillRect(0, 0, W, H);
    sceneSet(g, e, 'storm', camX, camY, t, 'storm');
    g.restore(); e.restore();
    // edge shading: a lit lip on the front of the storm
    g.save(); g.strokeStyle = rgba('#ffc761', .55); g.lineWidth = 8; g.lineJoin = 'round'; g.beginPath(); let first = true;
    for (let y = -600; y <= 1700; y += 40) { if (first) { g.moveTo(edge(y) - 6, y); first = false; } else g.lineTo(edge(y) - 6, y); } g.stroke(); g.restore();
  }
  leavesBlowing(g, t, 4, 6, 1.4);
  // a single streak falls to camera at 5.92
  if (t > 5.9) { const u = seg(t, 5.9, 6); g.strokeStyle = rgba('#fff3ff', .9); g.lineWidth = 3; g.beginPath(); g.moveTo(960 + 30, 100 + u * 600); g.lineTo(960 + 30, 220 + u * 700); g.stroke(); }
  // distant sheet lightning on the horizon at 4.0
  const fl = Math.max(0, 1 - (t - 4.0) * 7) * (t >= 4.0 ? 1 : 0);
  if (fl > 0) { airbrush(e, 300, 700 + camY * .8, 600, 200, '#c9b0ff', .5 * fl, 1); }
  return {};
}

// ------------------------------------------------------------ 4. drop (6-8): close-up, the first drop on the nose
export function drop(S) {
  const { g, e, t, lt, fr } = S;
  drawBokeh(g, e, 'storm', { camX: 1160, camY: 360, t });
  g.save(); e.save();
  zoom(g, e, 1 + .06 * (lt / 2));
  const wet = .15 + .35 * seg(t, 6.5, 8);
  const upl = 1 - seg(t, 6.3, 6.6);
  const closed = (t >= 6.0 && t < 6.125) || (t >= 7.1 && t < 7.2);
  const dropT = seg(t, 6.0, 7.4);
  g.translate(870, 600); g.rotate(-.1 * upl - .02); g.scale(4.2, 4.2);
  head(g, pal('storm'), {
    E: { open: closed ? 0 : 1, lid: .1 + .3 * (1 - upl), brow: [-8 * upl + 6 * (1 - upl), -6 * upl + 0], mouth: upl > .5 ? 'closed' : 'frown', look: [.15, -.8 * upl + .2 * (1 - upl)] },
    wet, t, blow: .3, drop: t >= 6.0 ? { x: 88 - 4 * dropT, y: 20 + 66 * ei(dropT) } : null,
  });
  g.restore(); e.restore();
  rainLayer(g, e, fr, seg(t, 6.5, 8) * .5);
  rainNear(g, e, fr, seg(t, 7, 8) * .4);
  return {};
}

// ------------------------------------------------------------ 5. case (8-10): the briefcase umbrella that is not
function heroRain(S, set, o) {
  const { g, t } = S;
  man(g, {
    k: .74, x: o.x ?? 840, y: 1240, set, phase: null, t, wind: .7, wet: o.wet, lean: o.lean ?? .05, hipDrop: o.hipDrop || 0,
    thN: .05, thF: -.05, flN: .1 + (o.crouch || 0), flF: .1 + (o.crouch || 0),
    armN: o.armN, armF: o.armF, shirt: o.shirt,
    head: { E: o.E, tilt: o.tilt || 0, dx: o.dx || 0, dy: o.dy || 0 }, props: o.props,
  });
}
export function caseShot(S) {
  const { g, e, t, lt, fr } = S;
  drawBokeh(g, e, 'storm', { camX: 1200, camY: 0, t });
  const up = ss(seg(t, 8.0, 8.3)), blown = ss(seg(t, 9.25, 9.6)), down = ss(seg(t, 9.7, 9.95));
  const wet = .3 + .6 * seg(t, 8.5, 9.8);
  const a = 2.55 * up * (1 - down) + .1 * (1 - up), shake = Math.sin(t * 40) * .02 * up * (1 - blown);
  heroRain(S, 'storm', {
    wet, lean: .06 + .06 * blown, hipDrop: 24 * blown,
    armN: [a + shake - .5 * blown, .5 * up * (1 - down) + .3 * blown], armF: [a - .08 + shake, .45 * up * (1 - down) + .12],
    E: { open: blown > .5 || (t > 8.9 && t < 9.0) ? 0 : .85, lid: .3 + .3 * blown, brow: [7 * up, -2], mouth: blown > .3 ? 'grit' : 'set', look: [.2, -.6 * (1 - blown)] },
    dy: 12 * blown, tilt: .06 * blown,
    props: (gg, Hh, P) => {
      const rot = Math.PI + .08 + 1.1 * blown - 1.1 * down, cx = Hh.N[0] - 20 + 80 * blown, cy = Hh.N[1] - 12 + 60 * blown * (1 - down);
      if (up > .05) { briefcase(gg, P, cx, cy, rot, 1.55);
        // water pouring over the case rim and through the gap, onto the head
        gg.strokeStyle = rgba('#dff0ff', .85); gg.lineWidth = 5; gg.lineCap = 'round';
        for (let i = 0; i < 7; i++) { const x0 = cx - 160 + i * 52 + ((fr * 13 + i * 31) % 40) - 20, y0 = cy + 50 + ((fr * 29 + i * 17) % 60); gg.beginPath(); gg.moveTo(x0, y0); gg.lineTo(x0 - 4, y0 + 130 + (i % 3) * 40); gg.stroke(); }
      } else briefcase(gg, P, Hh.N[0] + 4, Hh.N[1] + 14, 0, 1);
    },
  });
  rainLayer(g, e, fr, 1);
  rainNear(g, e, fr, 1);
  return {};
}

// ------------------------------------------------------------ 6. news (10-12): the newspaper, then the soggy collapse
export function newsShot(S) {
  const { g, e, t, fr } = S;
  drawBokeh(g, e, 'storm', { camX: 1300, camY: 0, t });
  const up = ss(seg(t, 10.0, 10.3)), sag = ei(seg(t, 10.5, 11.4)), fold = ss(seg(t, 11.35, 11.6)), slide = ei(seg(t, 11.6, 12.0));
  const wet = .7 + .3 * seg(t, 10, 12);
  const a = 2.5 * up;
  heroRain(S, 'storm', {
    wet, lean: .06 + .05 * sag, hipDrop: 14 * fold,
    armN: [a - .3 * fold, .55 * up + .2 * fold], armF: [a - .08 - .3 * fold, .5 * up + .2 * fold],
    E: { open: .55 - .45 * fold, lid: .45, brow: [8 * up, 0], mouth: 'grit', look: [0, -.4] }, dy: 10 * fold,
    props: (gg, Hh, P) => {
      if (up < .05) return;
      const x0 = Hh.N[0] - 330, x1 = Hh.F[0] + 320, y0 = Hh.N[1] - 30 + 20 * fold, y1 = Hh.F[1] - 34 + 20 * fold;
      if (slide < 1) { gg.save(); gg.translate(0, slide * 700); gg.rotate(slide * .3); paper(gg, P, x0, y0 + 80 * fold, x1, y1 + 60 * fold, 50 * sag + 150 * fold, sag); gg.restore(); }
      // pulp falling
      if (slide > 0) { gg.fillStyle = mix(P.paper.f, '#7a7898', .6); for (let i = 0; i < 5; i++) { gg.beginPath(); gg.ellipse(x0 + 180 + i * 90, 1200 * slide - 200 + (i % 2) * 40, 26, 10, i, 0, TAU); gg.fill(); } }
    },
  });
  // light bands sweeping across, cool and quick
  const sw = seg(t, 11.0, 11.4); if (sw > 0 && sw < 1) { g.save(); g.globalCompositeOperation = 'source-atop'; }
  if (sw > 0 && sw < 1) g.restore();
  rainLayer(g, e, fr, 1);
  rainNear(g, e, fr, 1);
  const lf = Math.max(0, 1 - (t - 11.2) * 9) * (t >= 11.2 ? 1 : 0); flashWash(g, e, lf * .45);
  return {};
}

// ------------------------------------------------------------ 7. run (12-14): side track, jacket over head, speed lines
const RUN_X0 = 6000;
export function run(S) {
  const { g, e, t, fr } = S;
  const camX = RUN_X0 + (t - 12) * 720, ph = 13.5 * q12(t);
  drawWorld(g, e, 'storm', { camX, t, grass: true });
  // the plant ahead on the verge, first noticed in the last second
  plant(g, e, 'storm', 8896 - camX, 790, .3, { t, sway: 1 });
  speedLines(g, fr % 3, { type: 'h', n: 26, a: .22, col: '#e6d6ff', hmax: 5, seed: fr % 5 });
  runner(g, ph, t, 700, GY);
  splashes(g, fr % 3, 800, 950, 30, '#e6d6ff', 5);
  rainLayer(g, e, fr, 1.2);
  rainNear(g, e, fr, 1.3);
  return {};
}
function runner(g, ph, t, x, y, still = false) {
  const hold = still ? 1 : 0;
  return man(g, {
    k: .34, x, y, set: 'storm', phase: still ? null : ph, run: 1, t, wind: 1, wet: 1, shirt: true, lean: still ? .1 : undefined,
    thN: .25, thF: -.1, flN: .3, flF: .1,
    armN: [2.35, .65], armF: [2.25, .7],
    head: { E: { open: .5, lid: .4, brow: [8, -2], mouth: 'puff', look: [.3, -.2] } },
    props: (gg, H, P) => jacketCloth(gg, P, H, t),
  });
}
function jacketCloth(g, P, H, t) {
  // the suit jacket held out flat above the head, snapping in the wind
  const x0 = H.N[0] - 280, x1 = H.N[0] + 160, yb = H.N[1] - 70;
  const pts = []; const n = 7;
  for (let i = 0; i <= n; i++) { const u = i / n; pts.push([x0 + (x1 - x0) * u, yb - 70 + Math.sin(u * 5 - t * 22) * 22]); }
  const bot = []; for (let i = n; i >= 0; i--) { const u = i / n; bot.push([x0 + (x1 - x0) * u - 30 * u, yb + 70 + Math.sin(u * 4 - t * 18 + 1) * 26]); }
  cel(g, pts.concat(bot), { f: P.suit.f, s: P.suit.s, so: [10, -8], h: P.suit.h, rim: { c: P.rim, d: [-3, 3] }, l: P.suit.l, lw: 3 });
  const sl = [[x0 + 30, yb + 20], [x0 - 70 + Math.sin(t * 20) * 14, yb + 150], [x0 - 30, yb + 170], [x0 + 70, yb + 40]];
  cel(g, sl, { f: P.suit.f, s: P.suit.s, l: P.suit.l, lw: 3 });
}

// ------------------------------------------------------------ 8. impact (14-14.6): lightning, inverted frames, then the stunned hero looks at the plant
export function impact(S) {
  const { g, e, t, fr } = S;
  const camX = RUN_X0 + 2 * 720;
  const i0 = t < 14.0417, i1 = t >= 14.0417 && t < 14.0834;
  if (i0 || i1) {
    // two impact frames: inverted silhouette over radial lines
    const bg = i0 ? '#ffffff' : '#000000', fg = i0 ? '#000000' : '#ffffff';
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    speedLines(g, fr % 3, { type: 'radial', cx: 700, cy: 700, n: 120, a: 1, col: fg, wmul: 1.4 });
    g.save(); g.globalCompositeOperation = 'source-over';
    bolt(g, e, 1500, 0, 620, 41, 1.6);
    const [c2, x2] = [document.createElement('canvas'), null]; c2.width = W; c2.height = H; const g2 = c2.getContext('2d');
    runner(g2, 0, t, 700, GY, true);
    g2.globalCompositeOperation = 'source-in'; g2.fillStyle = fg; g2.fillRect(0, 0, W, H);
    g.drawImage(c2, 0, 0); g.restore();
    return { bloom: 0, halo: 0 };
  }
  const f = Math.max(0, 1 - (t - 14.0834) * 4);
  drawWorld(g, e, 'storm', { camX, t, grass: true, flash: f * .3 });
  plant(g, e, 'flash', 8896 - camX, 790, .3, { t });
  if (f > .35) bolt(g, e, 1500, 0, 640, 41, 1.2);
  man(g, { k: .34, x: 700, y: GY, set: f > .3 ? 'flash' : 'storm', phase: null, run: 1, t, wind: .6, wet: 1, shirt: true, lean: .02, thN: .05, thF: -.05, flN: .1, flF: .1, armN: [2.3, .7], armF: [2.2, .7],
    head: { E: { open: 1.12, brow: [-9, -7], mouth: 'oh', iris: .8, look: [.9, -.05] }, tilt: -.05 }, props: (gg, H, P) => jacketCloth(gg, P, H, 14.1) });
  rainLayer(g, e, fr, 1.2); rainNear(g, e, fr, .9);
  return { bloom: 1 + f };
}

// ------------------------------------------------------------ 9. leaf (14.6-16): insert, the plant, backlit
export function leafInsert(S) {
  const { g, e, t, lt, fr } = S;
  const fl = (Math.max(0, 1 - (t - 15.25) * 6) * (t >= 15.25 ? 1 : 0));
  drawBokeh(g, e, 'storm', { camX: 8700, camY: 330, t });
  g.save(); e.save();
  zoom(g, e, 1 + .08 * (lt / 1.4), 960, 700);
  plant(g, e, 'storm', 900, 1100, 1.45, { t, sway: 1 });
  // glow through the leaves: emissive rim from the sky behind
  airbrush(e, 1100, 380, 700, 300, '#b9a0ff', .12 + .55 * fl, 1);
  // rain bouncing on the leaf surface
  const R = rng(900 + (fr % 4) * 5);
  g.strokeStyle = rgba('#f0f8ff', .6); g.lineWidth = 2;
  for (let i = 0; i < 26; i++) { const x = 560 + R() * 900, y = 300 + R() * 420, s = .5 + R(); g.beginPath(); g.ellipse(x, y, 16 * s, 5 * s, 0, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(x - 7 * s, y); g.lineTo(x - 11 * s, y - 13 * s); g.moveTo(x, y - 1); g.lineTo(x, y - 17 * s); g.moveTo(x + 7 * s, y); g.lineTo(x + 11 * s, y - 13 * s); g.stroke(); }
  g.restore(); e.restore();
  flashWash(g, e, fl * .6);
  rainLayer(g, e, fr, 1.1); rainNear(g, e, fr, .8);
  return {};
}

// ------------------------------------------------------------ 10. eyes (16-18): extreme close-up, three drawings
export function eyes(S) {
  const { g, e, t, lt, fr } = S;
  drawBokeh(g, e, 'storm', { camX: 1200, camY: 300, t });
  const base = clamp((t - 16.0) / .5);
  // eyes open in three drawings at 8 fps (lid .55 -> .3 -> 0)
  const q = Math.floor((t - 16.55) * 8);
  const lid = t < 16.55 ? .62 : [.62, .36, .1, 0][clamp(q + 1, 0, 3)];
  const brow = t < 16.55 ? [7, 0] : [5, -3];
  const blink = (t >= 17.15 && t < 17.275);
  LWK.k = .5;
  g.save(); e.save();
  g.translate(990, 480); g.scale(9.5, 9.5); g.translate(-32 * 1.16, -12 * 1.16);
  g.scale(1.16, 1.16);
  head(g, pal('storm'), { E: { open: blink ? 0 : 1, lid, brow: [brow[0] - 2, brow[1]], mouth: 'set', look: [.1, .1], iris: 1.05 }, wet: .9, t, blow: .3 });
  g.restore(); e.restore();
  LWK.k = 1;
  // water running down the skin, and a leaf-green reflection sliding across the eye
  g.strokeStyle = rgba('#e6f3ff', .6); g.lineWidth = 4; g.lineCap = 'round';
  for (let i = 0; i < 4; i++) { const x = 300 + i * 420 + (i % 2) * 90, y0 = ((fr * 17 + i * 211) % 700) - 100; g.beginPath(); g.moveTo(x, y0); g.lineTo(x - 6, y0 + 90); g.stroke(); }
  const fl = (t >= 17.6 && t < 17.7) ? .3 : 0; flashWash(g, e, fl);
  rainNear(g, e, fr, .7);
  return {};
}

// ------------------------------------------------------------ 11. rip (18-20): he tears a leaf off and raises it
export function rip(S) {
  const { g, e, t, fr } = S;
  drawBokeh(g, e, 'storm', { camX: 8800, camY: 80, t });
  const pull = ss(seg(t, 18.0, 18.42)), tear = t >= 18.5 ? 1 : 0, raise = ss(seg(t, 18.55, 19.1)), settle = ss(seg(t, 19.2, 19.6));
  const k = .85;
  // the plant behind and to the right
  plant(g, e, 'storm', 1480, 1230, 1.0, { t, sway: 1 });
  const wet = 1;
  const a = lerp(.35, -.35, pull) * (1 - tear) + tear * lerp(-.35, 2.5, raise);
  const el = lerp(.8, .3, pull) * (1 - tear) + tear * lerp(.3, .6, raise);
  const jitter = t > 18.0 && t < 18.5 ? Math.sin(t * 60) * .03 : 0;
  heroRain(S, 'storm', {
    x: 760, wet, lean: .04 - .12 * pull * (1 - tear) + .1 * tear * (1 - raise) + .02 * settle,
    armN: [lerp(.5, 1.0, ss(seg(t, 18.0, 18.25))) * (1 - tear) + tear * lerp(1.0, 2.4, raise) + jitter, .3 + .5 * raise],
    armF: [lerp(.55, 1.0, ss(seg(t, 18.0, 18.25))) * (1 - tear) + tear * lerp(1.0, 2.3, raise) + jitter, .35 + .4 * raise],
    E: { open: .85, lid: .38 * (1 - settle), brow: [6 * (1 - settle) - 3 * settle, -2], mouth: tear && settle > .3 ? 'smile' : 'set', look: [.5 * (1 - tear), -.3 * raise] },
    props: (gg, Hh, P) => {
      if (!tear) {
        // leaf still attached: a stem running from the hands to the plant, the blade stretching
        const sx = Hh.N[0] + 40, sy = Hh.N[1] + 10, tx = 1480 / .85 - 760 / .85 + 0, ty = 0;
      } else {
        leaf(gg, P, Hh.N[0] - 250 * raise, Hh.N[1] - 60 - 20 * (1 - raise), 640 * (.55 + .45 * raise), 420 * (.55 + .45 * raise), -.18 + .6 * (1 - raise) + .03 * Math.sin(t * 5), {});
      }
    },
  });
  // while attached: a green stem taut between the hero's hands and the plant
  if (!tear) {
    const s0 = [980, 740 - 40 * pull], s1 = [1480 - 60, 830]; g.save(); g.strokeStyle = '#0f3a2c'; g.lineWidth = 16; g.lineCap = 'round'; g.beginPath(); g.moveTo(s0[0], s0[1]); g.quadraticCurveTo((s0[0] + s1[0]) / 2, (s0[1] + s1[1]) / 2 + 60 * (1 - pull), s1[0], s1[1]); g.stroke(); g.strokeStyle = '#3f9a73'; g.lineWidth = 9; g.stroke(); g.restore();
  }
  if (t >= 18.5 && t < 18.54) { g.fillStyle = rgba('#fff', .85); g.fillRect(0, 0, W, H); }
  rainLayer(g, e, fr, 1); rainNear(g, e, fr, 1);
  return {};
}

// ------------------------------------------------------------ 12. still (20-26): the held painted still, rain drumming on the leaf, title
export function still(S) {
  const { g, e, t, lt, fr } = S;
  const pan = lt * 14;
  g.save(); e.save();
  for (const c of [g, e]) c.translate(-pan, 0);
  drawBokeh(g, e, 'storm', { camX: 8800 + pan * .4, camY: 40, t: 20 });
  const k = .52, x = 600 + pan * 0, y = 960;
  const fl = Math.max(Math.max(0, 1 - (t - 21.2) * 8) * (t >= 21.2 ? 1 : 0), Math.max(0, 1 - (t - 23.7) * 8) * (t >= 23.7 ? 1 : 0));
  const breath = Math.sin(t * 2.2) * 6;
  man(g, {
    k, x: 760 + pan, y, set: fl > .3 ? 'flash' : 'storm', phase: null, t, wind: .45, wet: 1, lean: .02, hipDrop: 0, thN: .04, thF: -.04, flN: .1, flF: .1,
    armN: [2.4, .55], armF: [2.3, .6],
    head: { E: { open: 1, lid: .05, brow: [-2, 0], mouth: 'smile', look: [0, -.4] }, dy: breath * .2 },
    props: (gg, Hh, P) => leaf(gg, P, Hh.N[0] - 300, Hh.N[1] - 40 + breath * .4, 780, 520, -.12 + .008 * Math.sin(t * 3), {}),
  });
  g.restore(); e.restore();
  // the leaf drums: rain splash crowns along its top edge (screen space, follows the pan)
  const R = rng(800 + (fr % 4) * 9);
  g.save(); g.translate(-pan, 0); g.strokeStyle = rgba('#f0f8ff', .65); g.lineWidth = 2;
  for (let i = 0; i < 22; i++) { const xx = 520 + R() * 700 + pan * 0, yy = 168 + R() * 120, s = .45 + R() * .6; g.beginPath(); g.ellipse(xx + pan, yy, 15 * s, 5 * s, 0, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(xx + pan - 6 * s, yy); g.lineTo(xx + pan - 9 * s, yy - 12 * s); g.moveTo(xx + pan, yy - 1); g.lineTo(xx + pan, yy - 16 * s); g.moveTo(xx + pan + 6 * s, yy); g.lineTo(xx + pan + 9 * s, yy - 12 * s); g.stroke(); }
  g.restore();
  flashWash(g, e, fl * .5);
  rainLayer(g, e, fr, 1.3); rainNear(g, e, fr, 1.2);
  // dripping from the leaf edge: three stepped drips
  g.fillStyle = rgba('#e6f3ff', .85);
  for (let i = 0; i < 4; i++) { const ph = (t * (1.1 + i * .17) + i * .3) % 1; const dx = 300 + i * 150; g.beginPath(); g.ellipse(dx, 560 + ph * ph * 380, 4, 8, 0, 0, TAU); g.fill(); }
  // title: chrome letters flick on at 12 fps, a light sweep, a star glint
  if (t >= T.title) titleCard(g, e, t - T.title);
  return {};
}
function titleCard(g, e, u) {
  const on = u < .5 ? (Math.floor(u * 12) % 2 === 0 || u > .33 ? 1 : 0.35) : 1, fadeA = u < .15 ? Math.floor(u * 12) / 2 : 1;
  const cx = 1440, cy = 470;
  const drawText = (ctx, fill, stroke, lw) => {
    ctx.save(); ctx.translate(cx, cy); ctx.transform(1, 0, -.2, 1, 0, 0); ctx.font = '184px Anton'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.strokeText('RAIN CHECK', 0, 0); }
    if (fill) { ctx.fillStyle = fill; ctx.fillText('RAIN CHECK', 0, 0); }
    ctx.restore();
  };
  const gr = g.createLinearGradient(0, cy - 160, 0, cy);
  [[0, XAN], [.42, '#FFF4D6'], [.5, '#ffffff'], [.52, '#e0906a'], [.74, '#b02a40'], [1, BUR]].forEach(([o, c]) => gr.addColorStop(o, c));
  g.save(); g.globalAlpha = on * fadeA;
  drawText(g, null, '#2a0008', 22);
  drawText(g, null, XAN, 8);
  drawText(g, gr, null, 0);
  // light sweep
  const sw = seg(u, .5, 1.2); if (sw > 0 && sw < 1) { g.save(); g.globalCompositeOperation = 'source-atop'; const sx = cx - 520 + sw * 1040; const sg = g.createLinearGradient(sx - 60, 0, sx + 60, 0); sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(.5, 'rgba(255,255,255,.75)'); sg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = sg; g.fillRect(cx - 560, cy - 190, 1120, 230); g.restore(); }
  g.restore();
  e.save(); e.globalAlpha = on * fadeA; drawText(e, null, rgba(XAN, .55), 8); drawText(e, rgba('#ffe9b0', .3), null, 0); e.restore();
  // star glint
  const gl = seg(u, .55, .75); if (gl > 0 && gl < 1) { flare(e, cx + 330, cy - 150, .45 * Math.sin(gl * Math.PI), '#fff0c0', { ghosts: false, streak: 300 }); }
  // kanji line + palette pills (nod to the supplied swatch cards)
  const a2 = seg(u, .35, .8);
  g.save(); g.globalAlpha = a2; g.font = '84px "Dela Gothic One"'; g.textAlign = 'center'; g.fillStyle = '#ffe9b0'; g.strokeStyle = '#2a0008'; g.lineWidth = 12; g.lineJoin = 'round';
  g.strokeText('雨宿り', cx - 20, cy - 215); g.fillText('雨宿り', cx - 20, cy - 215);
  g.font = '700 28px "Barlow SC"'; g.textBaseline = 'middle';
  [['XANTHOUS  #F7B538', cx - 250, XAN], ['BURGUNDY  #780116', cx + 140, '#c0394a']].forEach(([txt, px, col]) => {
    const tw = g.measureText(txt).width + 48; g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); g.roundRect(px - tw / 2, cy + 52, tw, 52, 26); g.stroke();
    g.fillStyle = rgba('#12020a', .55); g.fill(); g.fillStyle = col; g.fillText(txt, px, cy + 79);
  });
  g.restore();
  e.save(); e.globalAlpha = a2 * .6; e.font = '84px "Dela Gothic One"'; e.textAlign = 'center'; e.fillStyle = rgba(XAN, .8); e.fillText('雨宿り', cx - 20, cy - 215); e.restore();
}

// ------------------------------------------------------------ 13. after (26-30): shot 1 repainted, then the tape runs out
export function after(S) {
  const { g, e, t, lt, fr } = S;
  if (t >= T.end) {
    const u = t - T.end; g.fillStyle = '#1b2bd0'; g.fillRect(0, 0, W, H);
    const R = rng(fr * 7 + 3); g.fillStyle = rgba('#ffffff', .08); for (let i = 0; i < 40; i++) g.fillRect(0, R() * H, W, 1 + R() * 2);
    e.fillStyle = rgba('#3a4aff', .35); e.fillRect(0, 0, W, H);
    g.font = '700 54px "Barlow SC"'; g.fillStyle = '#ffffff'; g.textAlign = 'left'; g.fillText('▶ PLAY', 150, 190);
    return { track: .25 };
  }
  const camX = CAM_V * lt * .8, ph = 6.2 * q12(t);
  drawWorld(g, e, 'after', { camX, t, grass: false });
  flare(e, 1440, 622, .75, '#ffe0a0', { ghosts: false, streak: 700 });
  // puddle glints as the ground slides
  heroWalk(g, 'after', 820, GY, ph, t, { carryLeaf: true, wind: .12, wet: .35, mouth: 'smile' });
  // far birds
  g.strokeStyle = '#3a2048'; g.lineWidth = 2.5; for (let i = 0; i < 4; i++) { const bx = 1200 + i * 90 + lt * 50, by = 300 + i * 26 + Math.sin(t * 6 + i) * 4; g.beginPath(); g.moveTo(bx - 12, by + 3 * Math.sin(t * 9 + i)); g.quadraticCurveTo(bx - 4, by - 7, bx, by); g.quadraticCurveTo(bx + 4, by - 7, bx + 12, by + 3 * Math.sin(t * 9 + i)); g.stroke(); }
  const track = t < T.repaint + .34 ? 1 - (t - T.repaint) / .34 : (t > 29.0 ? seg(t, 29.0, 29.4) * .8 : 0);
  return { track, bloom: .9 };
}

export const SHOTS_FN = { walk, pat, crane, drop, case: caseShot, news: newsShot, run, impact, leaf: leafInsert, eyes, rip, still, after };
