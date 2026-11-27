// Renders index.html (file://) to car-evolution-photo.mp4 — 1080x1920, 30fps, 30s.
// Usage: node render.js            -> full video
//        node render.js 2.0,10.5   -> preview stills
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
(async () => {
  const FPS = 30, DUR = 30, only = process.argv[2];
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  pg.on('pageerror', e => console.error('PAGE ERROR:', e.message));
  await pg.goto('file://' + path.join(__dirname, 'index.html'));
  await pg.waitForFunction(() => window.ready === true);
  await pg.evaluate(() => document.fonts.ready);
  await pg.waitForTimeout(400);
  if (only) {
    for (const s of only.split(',')) {
      await pg.evaluate(t => render(t), +s);
      await pg.screenshot({ path: path.join(__dirname, `still_${s}.png`) });
    }
  } else {
    const ff = spawn('ffmpeg', ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart', path.join(__dirname, 'car-evolution-photo.mp4')],
      { stdio: ['pipe', 'ignore', 'inherit'] });
    for (let i = 0; i < FPS * DUR; i++) {
      await pg.evaluate(t => render(t), i / FPS);
      ff.stdin.write(await pg.screenshot({ type: 'jpeg', quality: 92 }));
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
  }
  await b.close();
})();
