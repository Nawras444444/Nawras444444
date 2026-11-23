// Rain Check: 30 s, 80s Cel Anime. The page is a pure function of time.
import { canvas, W, H } from './cel.js';
import { makePost } from './post.js';
import { DUR, SHOTS, shotAt, T, SUBS } from './story.js';
import { SHOTS_FN } from './shots.js';
import { hud } from './hud.js';

const qs = new URLSearchParams(location.search);
const [sc, g] = canvas(W, H), [gc, e] = canvas(W, H), [ovc, ov] = canvas(W, H);
const post = makePost(document.getElementById('gl'));
const TEST = qs.get('test');
const testMod = TEST ? await import('./test.js') : null;
await document.fonts.load('200px Anton', 'RAINCHECK'); await document.fonts.load('84px "Dela Gothic One"', '雨宿り'); await document.fonts.load('600 40px "Barlow SC"'); await document.fonts.load('700 40px "Barlow SC"');

const RAW = { bloom: 0, halo: 0, soft: 0, flick: 0, lift: 0, contrast: 0, fade: 0, sat: 1, tint: [1, 1, 1], scan: 0, grille: 0, bleed: 1, rshift: 0, glow: 0, corner: 0, noiseA: 0, power: 1, track: 0, expo: 1 };
function render(t) {
  for (const x of [g, e]) { x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.filter = 'none'; x.lineWidth = 1; }
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H); e.fillStyle = '#000'; e.fillRect(0, 0, W, H);
  let over = {};
  if (testMod) testMod.test(g, e, t, TEST);
  else {
    const [t0, t1, name] = shotAt(t), fn = SHOTS_FN[qs.get('shot') || name];
    over = fn({ t, lt: t - t0, u: (t - t0) / (t1 - t0), g, e, fr: Math.round(t * 24), name }) || {};
  }
  if (qs.get('nosub') || testMod) ov.clearRect(0, 0, W, H); else hud(ov, t);
  const crt = { power: Math.min(1, t / .55) };
  post.render(sc, gc, Math.round(t * 24), ovc, qs.get('raw') ? RAW : { ...crt, ...over });
}

// sound events for mix.py: steps land on the heel strikes of the walk cycles
function events() {
  const ev = [], add = (type, t, o = {}) => ev.push({ type, t: +t.toFixed(3), ...o });
  add('crton', .02);
  for (let n = 0; ; n++) { const tt = (Math.PI / 2 + n * Math.PI) / 7; if (tt > 2.95) break; add('step', Math.round(tt * 12) / 12, { v: .8 + .1 * (n % 2) }); }
  add('pat', T.pat, { v: 1 }); add('pat', T.pat + .25, { v: .8 });
  add('thunder', T.thunder, { v: .5, d: 1.8 }); add('gust', 4.1, { d: .8 });
  add('hush', T.hush0, { d: 1.0 });
  add('drop', T.drop, { v: 1 }); add('drop', 6.45, { v: .5 }); add('drop', 6.8, { v: .6 }); add('drop', 7.2, { v: .5 }); add('drop', 7.55, { v: .7 });
  add('rainbed', T.drop, { d: 24.5 });
  add('casehit', 8.0, { d: 1.3 }); add('gust', 9.25, { d: .6 }); add('squelch', 9.7, { v: .8 });
  add('paper', 10.0, { d: .5 }); add('squelch', 11.4, { v: 1 }); add('plop', 11.7, { v: 1 });
  for (let n = 0; ; n++) { const tt = 12 + .1 + n * (Math.PI / 13.5); if (tt > 13.9) break; add('wetstep', Math.round(tt * 12) / 12, { v: .9 }); }
  add('cloth', 12.2, { d: 1.7 });
  add('crack', T.flash, { v: 1 }); add('ring', T.flash + .1, { d: .9 });
  add('rustle', 14.7, { d: 1.1 }); add('thunder', 15.25, { v: .4, d: 1.6 });
  add('heart', 16.0, { d: 2.0 });
  add('stretch', 18.1, { d: .45 }); add('rip', 18.5, { v: 1 });
  add('whoosh', 18.6, { v: .6 }); add('drumleaf', 18.9, { d: 7.2 });
  add('thunder', 21.2, { v: .5, d: 2 }); add('thunder', 23.7, { v: .4, d: 2 });
  add('title', T.title, { v: 1 });
  add('tape', 26.0, { d: .4 });
  for (let n = 0; ; n++) { const tt = (Math.PI / 2 + n * Math.PI) / 6.2 + 26.0; if (tt > 29.3) break; add('step', Math.round(tt * 12) / 12, { v: .5, wet: 1 }); }
  add('birds', 26.6, { d: 2.4 }); add('tapeout', 29.0, { d: 1.0 });
  return ev.sort((a, b) => a.t - b.t);
}
window.EV = events();
window.TEXTS = (t) => {
  const out = [];
  if (t >= T.title + .5 && t < T.repaint) { out.push({ id: 'title', text: 'RAIN CHECK', x0: 820, y0: 300, x1: 1860, y1: 480 }, { id: 'kanji', text: '雨宿り', x0: 1130, y0: 190, x1: 1560, y1: 270 }, { id: 'pills', text: 'XANTHOUS #F7B538 BURGUNDY #780116', x0: 1020, y0: 520, x1: 1700, y1: 580, pass: true }); }
  return out;
};
window.render = render; window.DUR = DUR; window.POST = post;
render(parseFloat(qs.get('t') ?? '1'));
window.READY = true;
