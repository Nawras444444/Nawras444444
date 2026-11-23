// Subtitles live on the tape: cream-yellow semi-condensed type with a dark outline, composited inside the CRT pass.
import { W, H } from './cel.js';
import { SUBS } from './story.js';
export function hud(c, t) {
  c.clearRect(0, 0, W, H);
  const s = SUBS.find(([a, b]) => t >= a && t < b); if (!s) return;
  const y = H - 96, text = s[2];
  c.save(); c.font = '600 54px "Barlow SC"'; c.textBaseline = 'middle'; c.textAlign = 'center'; c.lineJoin = 'round';
  c.shadowColor = 'rgba(0,0,0,.55)'; c.shadowBlur = 10; c.shadowOffsetY = 3;
  c.strokeStyle = '#120a1e'; c.lineWidth = 9; c.strokeText(text, W / 2, y);
  c.shadowColor = 'transparent'; c.fillStyle = '#fff0a0'; c.fillText(text, W / 2, y);
  c.restore();
}
