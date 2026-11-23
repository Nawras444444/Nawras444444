import { W, H, rgba } from './cel.js';
import { man, head, pal, briefcase, leaf } from './hero.js';
import { drawWorld, plant } from './world.js';
export function test(g, e, t, which) {
  if (which === 'model') {
    g.fillStyle = '#f7b538'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 5; i++) man(g, { k: .46, x: 140 + i * 190, y: 640, set: 'gold', phase: i * 1.25, props: (g, Hh, P) => briefcase(g, P, Hh.N[0], Hh.N[1] + 10, 0.1, 1) });
    const ex = [{}, { brow: [6, -3], mouth: 'set', open: .9, lid: .3 }, { brow: [-8, 4], mouth: 'frown', open: .6, lid: .45, look: [0, .3] }, { mouth: 'oh', open: 1.12, brow: [-9, -7], iris: .8 }, { mouth: 'grit', open: .7, lid: .45, brow: [8, -2] }];
    for (let i = 0; i < 5; i++) { g.save(); g.translate(180 + i * 360, 860); g.scale(1.6, 1.6); head(g, pal(i > 2 ? 'storm' : 'gold'), { E: ex[i], wet: i > 2 ? 1 : 0, t }); g.restore(); }
  } else if (which === 'world') {
    const set = new URLSearchParams(location.search).get('set') || 'gold';
    drawWorld(g, e, set, { camX: 0, t, grass: true });
    man(g, { k: .30, x: 800, y: 880, set, phase: 1.1 });
    plant(g, e, set, 1500, 880, .55);
  }
}
