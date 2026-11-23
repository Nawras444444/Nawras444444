#!/usr/bin/env node
/* Render every clip of a project to MP4 (1920x1080, 30 fps, AAC audio).
 *
 * Usage: node render.js PROJECT_DIR [--workers 2] [--only 01_6,02_3] [--fps 30]
 *
 * PROJECT_DIR holds index.html (the template), data.js and assets/.
 * Each frame is rendered by seeking the GSAP timeline (deterministic, no dropped
 * frames), the soundtrack is rendered with OfflineAudioContext inside the page,
 * then ffmpeg muxes both. Existing videos are skipped, so a stopped run resumes.
 * Needs: Playwright with Chromium, ffmpeg.
 */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');

const args = process.argv.slice(2);
const proj = path.resolve(args[0] || '.');
const opt = (k, d) => { const i = args.indexOf(k); return i > -1 ? args[i + 1] : d; };
const workers = +opt('--workers', 2), fps = +opt('--fps', 30);
const only = opt('--only', '') ? opt('--only').split(',') : null;
const OUT = path.join(proj, 'videos'); fs.mkdirSync(OUT, { recursive: true });
const TMP = fs.mkdtempSync(path.join(require('os').tmpdir(), 'voxr-'));

const src = fs.readFileSync(path.join(proj, 'data.js'), 'utf8');
const PANELS = eval(src.replace(/^const PANELS\s*=\s*/, '(').replace(/;\s*$/, ')'));
let ids = PANELS.map(p => p.id).filter(id => !only || only.includes(id));

async function worker(wi) {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  for (const id of ids.filter((_, i) => i % workers === wi)) {
    const mp4 = path.join(OUT, id + '.mp4');
    if (fs.existsSync(mp4)) continue;
    const t0 = Date.now();
    await p.goto('file://' + path.join(proj, 'index.html') + `?p=${id}&render=1&rec=1`);
    await p.evaluate(() => window.__ready); await p.waitForTimeout(400);
    const D = await p.evaluate(() => D), n = Math.round(D * fps), dir = path.join(TMP, id);
    fs.mkdirSync(dir, { recursive: true });
    for (let k = 0; k < n; k++) {
      await p.evaluate(t => { tl.time(t); wig.time(t); }, k / fps);
      await p.screenshot({ path: path.join(dir, `f${String(k).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 92 });
    }
    fs.writeFileSync(path.join(dir, 'a.wav'), Buffer.from(await p.evaluate(() => renderWav()), 'base64'));
    const part = mp4 + '.part.mp4';
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(dir, 'f%04d.jpg'), '-i', path.join(dir, 'a.wav'),
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '19', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', part]);
    fs.renameSync(part, mp4);
    fs.rmSync(dir, { recursive: true, force: true });
    console.log('done', id, ((Date.now() - t0) / 1000).toFixed(0) + 's');
  }
  await b.close();
}
Promise.all([...Array(workers).keys()].map(worker)).then(() => { fs.rmSync(TMP, { recursive: true, force: true }); console.log('ALL DONE ->', OUT); });
