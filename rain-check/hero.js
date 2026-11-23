// The hero: an original man in a navy suit with a burgundy tie and one Xanthous accent. Flat cel fills, hard crescents, coloured outlines.
// Units: head cranium radius 80, figure 1270 tall, origin = ground under the feet, y down. Faces screen right.
import { cel, path, poly, line, ribbon, flutter, TAU, mix, rgba, hex, LWK } from './cel.js';

const BASE = {
  skin: { f: '#f3c7a6', s: '#cf917f', h: '#ffe6d2', l: '#6a3a34' },
  hair: { f: '#2a2140', s: '#171027', h: '#8a74c4', l: '#120a22' },
  suit: { f: '#2d3262', s: '#181b3e', h: '#6670b8', l: '#0c0e24' },
  pants: { f: '#3b3a5c', s: '#1f1e36', h: '#6b6a96', l: '#0e0d1c' },
  shirt: { f: '#f6efe2', s: '#c6bccd', h: '#ffffff', l: '#5a4a66' },
  tie: { f: '#8a0a22', s: '#560116', h: '#d1364f', l: '#2a0008' },
  shoe: { f: '#3a2a34', s: '#1e141b', h: '#7a6270', l: '#0a0508' },
  accent: { f: '#F7B538', s: '#c4801e', h: '#ffe39a', l: '#6a3d0a' },
  leather: { f: '#8c4a2c', s: '#5a2a18', h: '#c98a5e', l: '#2e140a' },
  paper: { f: '#efe6cf', s: '#c9bb9c', h: '#fffaf0', l: '#6e5e46' },
  leaf: { f: '#3f9a73', s: '#1f6049', h: '#8fe0b0', l: '#0f3a2c' },
  leaf2: { f: '#58b585', s: '#2b7a5a', h: '#b5f0c5', l: '#124a38' },
  white_eye: '#fbf8ff', iris: { f: '#6b3a3a', s: '#3a1c24', h: '#d99a7a', l: '#1a0a12' },
};
const SETS = {
  gold: { lit: [1.04, .96, .84], shade: [.86, .72, .84], line: [.95, .8, .8], rim: '#ffd27a' },
  storm: { lit: [.62, .58, .86], shade: [.44, .4, .78], line: [.7, .6, 1], rim: '#b9a6ff' },
  after: { lit: [1.04, .99, .9], shade: [.9, .8, .92], line: [1, .9, .9], rim: '#ffe29a' },
  flash: { lit: [1.12, 1.1, 1.25], shade: [.8, .78, 1.1], line: [1, .95, 1.1], rim: '#ffffff' },
  sil: { lit: [.12, .1, .2], shade: [.08, .06, .15], line: [.2, .15, .3], rim: '#F7B538' },
};
const mul = (c, m) => '#' + hex(c).map((x, i) => Math.max(0, Math.min(255, Math.round(x * m[i]))).toString(16).padStart(2, '0')).join('');
const cache = {};
export function pal(set) {
  if (cache[set]) return cache[set];
  const L = SETS[set], out = { rim: L.rim };
  for (const [k, v] of Object.entries(BASE)) {
    if (typeof v === 'string') { out[k] = mul(v, L.lit); continue; }
    out[k] = {};
    for (const [kk, c] of Object.entries(v)) out[k][kk] = mul(c, kk === 's' ? L.shade : kk === 'l' ? L.line : L.lit);
  }
  if (set === 'storm') Object.assign(out.skin, { f: '#dcc0c6', s: '#8f7aa0', h: '#f3e2e6' });
  if (set === 'flash') Object.assign(out.skin, { f: '#f4e6ea', s: '#a99bc0', h: '#ffffff' });
  return (cache[set] = out);
}

const so = [9, -7], ho = [-6, 5];   // light from top right

// ---------------------------------------------------------------- eyes
function eye(g, P, cx, cy, w, h, E, far) {
  const open = Math.max(0, E.open ?? 1), lid = E.lid || 0, W2 = w / 2;
  const topY = cy - h * .5 * open + lid * h * .34, botY = cy + h * .46;
  const lash = P.hair.l;
  const X = u => cx + u * W2;            // u: -1 inner (toward nose side is +1 here: face looks right)
  if (open > .08) {
    const WP = path([[X(-1), cy + h * .08, 1], [X(-.4), topY + h * .06], [X(.3), topY], [X(1), cy - h * .05, 1], [X(.5), botY], [X(-.4), botY - h * .02]], true);
    g.save(); g.clip(WP);
    g.fillStyle = P.white_eye; g.fill(WP);
    g.fillStyle = mix(P.white_eye, P.skin.s, .5); g.fillRect(cx - w, topY - 4, w * 2, h * .2 + 4);
    const sc = E.iris || 1, iw = w * .24 * sc * (far ? .85 : 1), ih = h * .47 * sc;
    const ix = cx + W2 * .1 + (E.look?.[0] || 0) * w * .22, iy = cy + h * .06 + (E.look?.[1] || 0) * h * .2;
    const IR = new Path2D(); IR.ellipse(ix, iy, iw, ih, 0, 0, TAU);
    g.fillStyle = P.iris.f; g.fill(IR);
    g.save(); g.clip(IR);
    g.fillStyle = P.iris.s; g.fillRect(ix - iw, iy - ih, iw * 2, ih * .95);
    g.fillStyle = P.iris.l; g.fillRect(ix - iw, iy - ih, iw * 2, ih * .38);
    g.fillStyle = P.iris.l; g.beginPath(); g.ellipse(ix, iy, iw * .45, ih * .5, 0, 0, TAU); g.fill();
    g.fillStyle = P.iris.h; g.beginPath(); g.ellipse(ix, iy + ih * .9, iw * 1.05, ih * .5, 0, 0, TAU); g.fill();
    g.restore();
    g.fillStyle = '#ffffff';
    g.beginPath(); g.ellipse(ix - iw * .3, iy - ih * .34, iw * .4, ih * .26, -.4, 0, TAU); g.fill();
    g.beginPath(); g.arc(ix + iw * .4, iy + ih * .36, iw * .17, 0, TAU); g.fill();
    g.restore();
  }
  const t = h * .2;
  if (open > .08) {   // thick upper lash line, flicking outward
    cel(g, [[X(-1.03), cy + h * .1, 1], [X(-.4), topY + h * .05 - t * .6], [X(.3), topY - t * .8], [X(.95), cy - h * .05 - t], [X(1.28), cy - h * .05 - t * 2.0, 1],
      [X(1.03), cy - h * .02 + t * .3], [X(.3), topY + t * .45], [X(-.4), topY + h * .05 + t * .35], [X(-.98), cy + h * .1 + t * .5, 1]], { f: lash });
    line(g, [[X(-.2), topY - h * .2], [X(.5), topY - h * .24], [X(1), cy - h * .32]], mix(P.skin.l, P.skin.f, .3), 1.2);
    line(g, [[X(.9), cy + h * .08], [X(.4), botY + 1], [X(0), botY + 1.5]], mix(P.skin.l, P.skin.f, .4), 1.1);
  } else {
    cel(g, [[X(-1), cy + h * .08, 1], [X(0), cy + h * .22], [X(1.05), cy - h * .02], [X(1.2), cy - t * 1.2, 1], [X(1), cy + t * .6], [X(0), cy + h * .22 + t * .8], [X(-.98), cy + h * .08 + t * .5, 1]], { f: lash });
  }
}
function brow(g, P, x0, y0, x1, y1, th) {
  const mid = [(x0 + x1) / 2, Math.min(y0, y1) - 3];
  cel(g, [[x0, y0 + th * .4, 1], mid, [x1, y1 - th * .2, 1], [x1, y1 + th * .4], [mid[0], mid[1] + th], [x0, y0 + th]], { f: P.hair.f, l: P.hair.l, lw: 1 });
}

// ---------------------------------------------------------------- head (3/4 view facing right)
// o: {E:{open,lid,brow:[inner,outer],mouth,look,iris}, wet:0..1, blow:0..1, t, drop:{x,y} (raindrop on the nose), flash:0..1}
export function head(g, P, o = {}) {
  const E = { open: 1, lid: 0, brow: [0, 0], mouth: 'closed', ...o.E }, wet = o.wet || 0, blow = o.blow || 0, t = o.t || 0;
  const rim = { c: P.rim, d: [-3, 2.5] };
  // ear (behind the face)
  cel(g, [[-26, 6], [-4, 2], [10, 26], [2, 50], [-18, 52], [-30, 28]], { f: P.skin.f, s: P.skin.s, so, l: P.skin.l, lw: 1.3 });
  // hair back mass under the face (dark under-layer)
  cel(g, [[-92, -30], [-84, 40], [-60, 62, 1], [-30, 30], [-30, -40]], { f: P.hair.s, l: P.hair.l, lw: 1.3 });
  // face
  const FACE = path([[-62, -52], [-6, -84], [48, -72], [70, -32], [76, 2], [100, 44, 1], [82, 56, 1], [80, 68], [76, 86], [72, 104], [48, 118, 1], [-6, 94], [-40, 66], [-66, 14]], true);
  cel(g, FACE, { f: P.skin.f, s: P.skin.s, so, h: P.skin.h, ho, rim, l: P.skin.l, lw: 1.5 });
  // face shadow planes: under-brow, nose side, under lip, cheek
  g.save(); g.clip(FACE);
  g.fillStyle = P.skin.s;
  g.beginPath(); g.moveTo(-66, 44); g.quadraticCurveTo(-30, 66, 10, 100); g.lineTo(-6, 98); g.quadraticCurveTo(-44, 74, -70, 60); g.fill();   // jaw shadow
  g.beginPath(); g.moveTo(70, 8); g.lineTo(80, 30); g.lineTo(96, 44); g.lineTo(84, 54); g.lineTo(74, 40); g.fill();   // nose plane
  g.beginPath(); g.ellipse(60, 100, 22, 7, 0, 0, TAU); g.fill();   // under lip
  g.fillStyle = rgba('#ff8f8f', .13); g.beginPath(); g.ellipse(30, 52, 22, 11, 0, 0, TAU); g.fill();   // one faint blush layer
  g.restore();
  line(g, [[74, 8], [80, 28], [92, 44]], P.skin.l, 1.4);                  // nose: one stroke
  line(g, [[82, 55], [90, 53]], P.skin.l, 1.4);                            // nostril
  // eyes (near, far)
  eye(g, P, 22, 12 + (E.lid ? 1 : 0), 44, 25, E, false);
  eye(g, P, 64, 10, 24, 22, E, true);
  const bi = E.brow[0], bo = E.brow[1];
  brow(g, P, 6, -16 + bo, 46, -22 + bi - 2, 6);        // near brow: outer -> inner
  brow(g, P, 56, -22 + bi, 76, -16 + bi * .6, 5);       // far brow
  // mouth
  const my = 86, M = E.mouth;
  const mc = P.skin.l;
  if (M === 'closed') line(g, [[48, my], [62, my + 1.5], [74, my - 1]], mc, 1.7);
  else if (M === 'set') line(g, [[46, my + 1], [62, my + 1], [76, my - 1.5]], mc, 2);
  else if (M === 'frown') line(g, [[44, my + 5], [60, my - 1], [76, my + 3]], mc, 2);
  else if (M === 'smile') line(g, [[44, my - 3], [62, my + 4], [78, my - 5]], mc, 2);
  else if (M === 'oh') { cel(g, [[56, my - 6], [68, my - 6], [70, my + 8], [58, my + 10]], { f: '#7a2a3a', l: mc, lw: 1.5 }); }
  else if (M === 'grit') { cel(g, [[42, my - 6], [76, my - 8], [78, my + 6], [44, my + 8]], { f: '#f6efe2', l: mc, lw: 1.5 }); line(g, [[44, my], [77, my - 1]], '#b8a8b8', 1); }
  else if (M === 'puff') { cel(g, [[52, my - 4], [70, my - 5], [72, my + 5], [54, my + 6]], { f: '#7a2a3a', l: mc, lw: 1.4 }); }
  // hair: outer shape, locks, angel ring, wet droop
  const bl = blow * 14;
  const HAIR = path([[62, -48, 1], [44, -88], [-4, -102], [-58, -84], [-96 - bl, -30], [-90 - bl * 1.2, 30, 1], [-66, 14], [-40, -6], [-12, -34], [28, -48]], true);
  cel(g, HAIR, { f: P.hair.f, s: P.hair.s, so, rim, l: P.hair.l, lw: 1.5 });
  g.save(); g.clip(HAIR);
  g.fillStyle = P.hair.h;   // continuous angel-ring highlight with a zigzag lower edge
  g.beginPath(); g.moveTo(50, -76); g.quadraticCurveTo(0, -98, -62, -70); g.lineTo(-58, -60); g.lineTo(-44, -66); g.lineTo(-36, -58); g.lineTo(-22, -68); g.lineTo(-12, -60); g.lineTo(2, -72); g.lineTo(14, -64); g.lineTo(30, -74); g.lineTo(44, -66); g.fill();
  g.restore();
  // swept locks lying on the skull, tips just breaking the outline
  for (const [x0, y0, a, L, w] of [[-6, -94, 2.35 + blow * .12, 62, 22], [-36, -86, 2.55 + blow * .12, 58, 22], [-64, -68, 2.75, 46, 18]]) {
    const sp = flutter(x0, y0, a, L + bl * .6, 6, 2 + blow * 4, .8, t * 7, 6);
    cel(g, ribbon(sp, u => w * Math.pow(1 - u, .8) + .5), { f: P.hair.f, s: P.hair.s, so: [5, -4], l: P.hair.l, lw: 1.1 });
  }
  if (wet > .05) {   // soaked hair: a few strands plastered down over the forehead + water glints
    for (const [x0, y0, a, L, w] of [[30, -84, 1.62, 62, 11], [10, -88, 1.7, 70, 10], [48, -76, 1.5, 48, 9]]) {
      const sp = flutter(x0, y0, a, L * (.6 + wet * .5), 6, 4 + blow * 4, .8, t * 6, 14 * wet);
      cel(g, ribbon(sp, u => w * Math.pow(1 - u, .7) + .5), { f: P.hair.f, s: P.hair.s, so: [3, -2], l: P.hair.l, lw: 1 });
    }
    g.fillStyle = rgba('#ffffff', .75 * wet);
    for (const [x, y, r] of [[10, -88, 3.5], [-30, -84, 3], [44, -76, 2.8], [-60, -58, 3]]) { g.beginPath(); g.ellipse(x, y, r * 1.4, r, -.4, 0, TAU); g.fill(); }
  }
  if (o.drop) {   // raindrop bead on the skin
    const d = o.drop; g.save(); g.translate(d.x, d.y);
    cel(g, [[0, -9, 1], [6, 2], [0, 8], [-6, 2]], { f: '#e9f4ff', s: '#a8c4e8', so: [2, -2], l: '#5a78a8', lw: 1 });
    g.fillStyle = '#fff'; g.beginPath(); g.arc(-1.8, 0, 1.8, 0, TAU); g.fill(); g.restore();
  }
}

// ---------------------------------------------------------------- body
const L1 = 290, L2 = 280, LU = 205, LF = 190;
const lerp2 = (a, b, n) => Array.from({ length: n }, (_, i) => [a[0] + (b[0] - a[0]) * i / (n - 1), a[1] + (b[1] - a[1]) * i / (n - 1)]);
function limb(g, pts3, widths, colors, n = 5) {
  const sp = lerp2(pts3[0], pts3[1], n).concat(lerp2(pts3[1], pts3[2], n).slice(1));
  const wf = u => u < .5 ? widths[0] + (widths[1] - widths[0]) * u * 2 : widths[1] + (widths[2] - widths[1]) * (u - .5) * 2;
  return cel(g, ribbon(sp, wf), colors);
}
// o: {k,x,y,set,phase,run,lean,head:{...},armN:[sh,el],armF:[sh,el],wind,wet,t, shirt:true (jacket off), props:(g,H)=>void, drawProps:'over'}
// returns hand positions in screen space
export function man(g, o) {
  const P = pal(o.set || 'gold'), k = o.k, ph = o.phase, wind = o.wind || 0, t = o.t || 0, wet = o.wet || 0;
  const run = o.run || 0;
  g.save(); g.translate(o.x, o.y); g.scale(k, k);
  let thN = o.thN ?? 0, thF = o.thF ?? 0, flN = o.flN ?? .05, flF = o.flF ?? .05;
  if (ph != null) {
    const A = .5 + run * .45, B = .95 + run * .7;
    thN = A * Math.sin(ph); thF = A * Math.sin(ph + Math.PI);
    flN = .1 + B * Math.max(0, Math.cos(ph - .35)); flF = .1 + B * Math.max(0, Math.cos(ph + Math.PI - .35));
  }
  const lean = (o.lean ?? .06) + run * .16 + (ph != null ? .012 * Math.sin(ph * 2) : 0);
  let hipY = -630;
  const leg = (th, fl) => { const kx = L1 * Math.sin(th), ky = hipY + L1 * Math.cos(th), ts = th - fl; return { kx, ky, ax: kx + L2 * Math.sin(ts), ay: ky + L2 * Math.cos(ts), ts }; };
  let a = leg(thN, flN), b = leg(thF, flF);
  hipY += (-62 - Math.max(a.ay, b.ay)) + (o.hipDrop || 0); a = leg(thN, flN); b = leg(thF, flF);
  const trouser = P.pants;
  const shoe = (A, dark) => {
    const c = Math.cos(-A.ts * .7), s = Math.sin(-A.ts * .7);
    const pts = [[-34, -6], [-30, 58], [78, 60], [102, 36, 1], [62, 4], [22, -12]].map(p => [A.ax + p[0] * c - p[1] * s, A.ay + p[0] * s + p[1] * c, p[2]]);
    cel(g, pts, { f: dark ? P.shoe.s : P.shoe.f, s: P.shoe.s, so, h: P.shoe.h, hi: [[[-20, 8], [10, 8], [30, 24], [-20, 24]].map(p => [A.ax + p[0] * c - p[1] * s, A.ay + p[0] * s + p[1] * c])], l: P.shoe.l, lw: 2.4 });
  };
  const legCol = dark => ({ f: dark ? P.pants.s : P.pants.f, s: P.pants.s, so, h: P.pants.h, l: P.pants.l, lw: 2.4 });
  const drawLeg = (L, dark) => { shoe(L, dark); limb(g, [[0, hipY], [L.kx, L.ky], [L.ax, L.ay]], [118, 96, 78], legCol(dark)); };
  drawLeg(b, true);
  // torso in the hip frame
  g.save(); g.translate(0, hipY); g.rotate(lean);
  const SH = [-4, -350];
  // far arm first (behind the torso)
  const arm = (S, sh, el, dark) => {
    const E = [S[0] + LU * Math.sin(sh), S[1] + LU * Math.cos(sh)], thf = sh + el, W = [E[0] + LF * Math.sin(thf), E[1] + LF * Math.cos(thf)];
    const hand = [W[0] + 46 * Math.sin(thf), W[1] + 46 * Math.cos(thf)];
    return { S, E, W, hand, thf, dark };
  };
  const drawArm = A => {
    limb(g, [A.S, A.E, A.W], [88, 74, 62], { f: A.dark ? P.suit.s : P.suit.f, s: P.suit.s, so, h: P.suit.h, l: P.suit.l, lw: 2.4 });
    const cuff = [A.W[0] + 6 * Math.sin(A.thf), A.W[1] + 6 * Math.cos(A.thf)];
    cel(g, ribbon([cuff, [cuff[0] + 14 * Math.sin(A.thf), cuff[1] + 14 * Math.cos(A.thf)]], () => 66), { f: P.shirt.f, s: P.shirt.s, l: P.shirt.l, lw: 1.6 });
    cel(g, ribbon([[A.W[0] + 14 * Math.sin(A.thf), A.W[1] + 14 * Math.cos(A.thf)], A.hand], u => 52 - u * 14), { f: A.dark ? P.skin.s : P.skin.f, s: P.skin.s, so, l: P.skin.l, lw: 1.8 });
    cel(g, ribbon([A.hand, [A.hand[0] + 22 * Math.sin(A.thf), A.hand[1] + 22 * Math.cos(A.thf)]], () => 46), { f: A.dark ? P.skin.s : P.skin.f, l: P.skin.l, lw: 1.6 });
  };
  const aF = arm(SH, o.armF?.[0] ?? 0.1, o.armF?.[1] ?? .15, true), aN = arm(SH, o.armN?.[0] ?? -.1, o.armN?.[1] ?? .15, false);
  drawArm(aF);
  // jacket
  const bodyPts = [[-62, 22], [-72, -90], [-64, -300], [-40, -372, 1], [-6, -388], [44, -372], [64, -250], [68, -90], [62, 28, 1]];
  const jacketOff = !!o.shirt;
  const TOR = path(bodyPts, true);
  cel(g, TOR, { f: jacketOff ? P.shirt.f : P.suit.f, s: jacketOff ? P.shirt.s : P.suit.s, so, h: jacketOff ? P.shirt.h : P.suit.h, rim: { c: P.rim, d: [-3, 2.5] }, l: jacketOff ? P.shirt.l : P.suit.l, lw: 2.6,
    sh: [[[-72, -90], [-30, -140], [-20, 20], [-62, 22]]], clipFn: (gg) => { if (!jacketOff) { gg.strokeStyle = P.suit.l; gg.lineWidth = 2; gg.beginPath(); gg.moveTo(44, -372); gg.quadraticCurveTo(10, -250, 32, -90); gg.stroke(); } } });
  // shirt collar + tie
  cel(g, [[-4, -392, 1], [46, -376], [34, -318, 1], [14, -340]], { f: P.shirt.f, s: P.shirt.s, so: [3, -2], l: P.shirt.l, lw: 1.6 });
  const tsp = flutter(36, -334, Math.PI / 2, 250 + (o.tieLen || 0), 9, 8 + wind * 46, 1.2, t * 9, 10 + wind * 70);
  cel(g, ribbon(tsp, u => 40 * (1 - u * .15) * (u < .1 ? .55 : 1) + (u > .9 ? -10 : 0)), { f: P.tie.f, s: P.tie.s, so: [4, -3], h: P.tie.h, ho: [-5, 4], l: P.tie.l, lw: 1.8 });
  cel(g, [[24, -350], [50, -352], [48, -322], [26, -322]], { f: P.tie.f, s: P.tie.s, so: [3, -2], l: P.tie.l, lw: 1.6 });
  if (!jacketOff) cel(g, [[40, -250, 1], [66, -254, 1], [64, -226], [42, -228]], { f: P.accent.f, s: P.accent.s, so: [3, -2], l: P.accent.l, lw: 1.5 });   // pocket square: the Xanthous accent
  // neck + head
  const hx = 14 + (o.head?.dx || 0), hy = -508 + (o.head?.dy || 0), tilt = (o.head?.tilt || 0);
  cel(g, [[-26, -470], [20, -470], [26, -372], [-36, -378]], { f: P.skin.s, l: P.skin.l, lw: 1.4 });
  g.save(); g.translate(hx, hy); g.rotate(tilt); g.scale(1.16, 1.16);
  head(g, P, { ...o.head, wet, t, blow: Math.max(wind, o.head?.blow || 0) });
  g.restore();
  g.restore();   // torso frame
  // near leg over torso
  drawLeg(a, false);
  // near arm and props, computed in the torso frame -> redo with the rotation
  g.save(); g.translate(0, hipY); g.rotate(lean);
  drawArm(aN);
  const H = { N: aN.hand, F: aF.hand, thN: aN.thf, thF: aF.thf };
  if (o.props) o.props(g, H, P);
  g.restore();
  g.restore();
  const cl = Math.cos(lean), sl = Math.sin(lean);
  const toScr = p => [o.x + k * (p[0] * cl - p[1] * sl), o.y + k * (hipY + p[0] * sl + p[1] * cl)];
  return { N: toScr(aN.hand), F: toScr(aF.hand), headC: toScr([hx, hy]) };
}

// ---------------------------------------------------------------- props
export function briefcase(g, P, x, y, rot = 0, s = 1) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s * .78, s * .78);
  line(g, [[-44, 0], [-34, -34], [34, -34], [44, 0]], P.leather.l, 8);
  line(g, [[-44, 0], [-34, -34], [34, -34], [44, 0]], P.leather.s, 4);
  cel(g, [[-110, 0, 1], [110, 0, 1], [110, 150, 1], [-110, 150, 1]], { f: P.leather.f, s: P.leather.s, so: [10, -8], h: P.leather.h, hi: [[[-100, 8], [-20, 8], [-30, 20], [-100, 20]]], l: P.leather.l, lw: 3 });
  cel(g, [[-110, 56, 1], [110, 56, 1], [110, 78, 1], [-110, 78, 1]], { f: P.accent.f, s: P.accent.s, so: [6, -5], l: P.accent.l, lw: 2.2 });   // Xanthous strap
  cel(g, [[-14, 52, 1], [14, 52, 1], [14, 84, 1], [-14, 84, 1]], { f: P.accent.h, s: P.accent.s, l: P.accent.l, lw: 2 });
  g.restore();
}
export function paper(g, P, x0, y0, x1, y1, sag = 0, soak = 0) {
  // a newspaper held between two points; sags in the middle as it soaks
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2 + sag, th = 22;
  const top = [[x0, y0 - th], [mx, my - th - sag * .15], [x1, y1 - th]], bot = [[x0, y0 + th], [mx, my + th * .9 + sag * .1], [x1, y1 + th]];
  const body = path([top[0], top[1], top[2], bot[2], bot[1], bot[0]].map((p, i) => i === 0 || i === 2 || i === 3 || i === 5 ? [p[0], p[1], 1] : p), true);
  cel(g, body, { f: mix(P.paper.f, '#9a95a8', soak * .5), s: mix(P.paper.s, '#6a6690', soak * .5), so: [8, -6], h: P.paper.h, l: P.paper.l, lw: 2.4 });
  g.save(); g.clip(body); g.strokeStyle = rgba(P.paper.l, .6); g.lineWidth = 2.4;
  for (let i = 0; i < 6; i++) { const f = i / 6; g.beginPath(); g.moveTo(x0 + (x1 - x0) * .08, y0 - th * .6 + f * th * 1.4 + sag * Math.sin(f * 3) * .02); g.quadraticCurveTo(mx, my - th * .7 + f * th * 1.4, x0 + (x1 - x0) * .92, y1 - th * .6 + f * th * 1.4); g.stroke(); }
  g.fillStyle = rgba(P.paper.l, .85); g.fillRect(x0 + (x1 - x0) * .1, y0 - th * .75, (x1 - x0) * .35, th * .5);   // headline block
  g.restore();
}
// big leaf, tip pointing along +x (rot rotates). w = length, h = width
export function leaf(g, P, x, y, w, h, rot = 0, o = {}) {
  g.save(); g.translate(x, y); g.rotate(rot);
  const pts = [[0, 0, 1], [w * .12, -h * .42], [w * .45, -h * .56], [w * .8, -h * .3], [w, 0, 1], [w * .8, h * .3], [w * .45, h * .56], [w * .12, h * .42]];
  const B = path(pts, true);
  cel(g, B, { f: P.leaf.f, s: P.leaf.s, so: [h * .09, -h * .08], h: P.leaf2.f, ho: [-h * .06, h * .05], rim: o.rim === false ? undefined : { c: P.rim, d: [-3, 3] }, l: P.leaf.l, lw: 3 });
  g.save(); g.clip(B);
  g.strokeStyle = P.leaf.l; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(w * .98, 0); g.stroke();
  g.strokeStyle = rgba(P.leaf.l, .75); g.lineWidth = 2;
  for (let i = 1; i < 8; i++) { const u = i / 8; for (const sgn of [-1, 1]) { g.beginPath(); g.moveTo(w * u * .98, 0); g.quadraticCurveTo(w * (u + .08), sgn * h * .26 * (1 - u * .4), w * (u + .26), sgn * h * .5 * (1 - u * .45)); g.stroke(); } }
  g.restore(); g.restore();
}
