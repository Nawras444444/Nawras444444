// usage: node render.js PAGE.html OUT.mp4 [seconds=10] [width=1080] [height=1444] [fps=30]
// Drives the page frame by frame (renderStart / renderFrame) and pipes JPEG frames to ffmpeg.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const [, , page, out = 'poster.mp4', dur = '10', W = '1080', H = '1444', FPS = '30'] = process.argv;
const fps = +FPS, N = Math.round(+dur * fps);
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: +W, height: +H } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(page) + '?render=1');
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(800);
  await p.evaluate(() => renderStart());
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '17', '-preset', 'medium', '-movflags', '+faststart', out]);
  for (let f = 0; f < N; f++) {
    await p.evaluate(([f, fps]) => renderFrame(f, fps), [f, fps]);
    const buf = await p.screenshot({ type: 'jpeg', quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
  console.log('done', N, 'frames; page errors:', errs); await b.close();
})();
