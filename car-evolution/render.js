// Renders index.html to car-evolution.mp4 (1080x1920, 30fps, 15s)
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
(async () => {
  const FPS = 30, DUR = 15, only = process.argv[2];
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await pg.goto('file://' + path.join(__dirname, 'index.html'));
  await pg.evaluate(() => document.fonts.ready);
  await pg.waitForTimeout(800);
  if (only) { // preview stills: node render.js 1,5,8
    for (const s of only.split(',')) { await pg.evaluate(t => render(t), +s); await pg.screenshot({ path: path.join(__dirname, `still_${s}.png`) }); }
    return b.close();
  }
  const ff = spawn('ffmpeg', ['-y', '-f', 'image2pipe', '-framerate', FPS, '-i', '-', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart', path.join(__dirname, 'car-evolution.mp4')], { stdio: ['pipe', 'ignore', 'inherit'] });
  for (let i = 0; i < FPS * DUR; i++) {
    await pg.evaluate(t => render(t), i / FPS);
    ff.stdin.write(await pg.screenshot({ type: 'jpeg', quality: 92 }));
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close();
})();
