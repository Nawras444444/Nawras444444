// Render the story page frame by frame into a silent MP4, and save the sound-effect cues.
// The page must expose window.__render(t), window.__total(), window.__sfx() and window.__ready()
// (the template does) and must be opened with ?render=1.
//
// Usage: node render_video.js PAGE.html OUT_VIDEO.mp4 [--w 1080 --h 1920 --fps 24]
// Writes OUT_VIDEO.mp4 (video only) and cues.json next to it. Then run mux.py.
// Render into a scratch folder, not the repo: a half-written MP4 in the repo is easy to commit by mistake.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path');

(async () => {
  const args = process.argv.slice(2);
  const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? +args[i + 1] : d; };
  const page = path.resolve(args[0]), out = path.resolve(args[1]);
  const W = opt('w', 1080), H = opt('h', 1920), FPS = opt('fps', 24);

  // Published artifacts get a doctype wrapper; local files need one too, or they render in quirks mode.
  const src = fs.readFileSync(page, 'utf8');
  const wrapped = path.join(path.dirname(page), '_render.html');
  fs.writeFileSync(wrapped, src.startsWith('<!doctype') ? src :
    '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n' + src + '</html>');

  const browser = await chromium.launch();
  const p = await browser.newPage({ viewport: { width: W, height: H } });
  p.on('pageerror', e => console.log('page error:', e.message));
  await p.goto('file://' + wrapped + '?render=1');
  await p.evaluate(() => window.__ready ? window.__ready() : document.fonts.ready);
  await p.waitForTimeout(800);
  const total = await p.evaluate(() => __total());
  fs.writeFileSync(path.join(path.dirname(out), 'cues.json'), JSON.stringify(await p.evaluate(() => window.__sfx ? __sfx() : [])));
  const N = Math.round(total * FPS);

  const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let f = 0; f < N; f++) {
    await p.evaluate(t => __render(t), f / FPS);
    const buf = await p.screenshot({ type: 'jpeg', quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 240 === 0) console.log(f, '/', N);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await browser.close();
  console.log('done', out);
})();
