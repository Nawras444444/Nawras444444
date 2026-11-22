// node render.js stills 1.5 10 ...   -> stills/t*.jpg
// node render.js video               -> movie_recs.mp4 (frames piped straight into ffmpeg)
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const [, , mode, ...rest] = process.argv;
const FPS = 30, DUR = 57.5;
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('pageerror', e => console.error('page error:', e.message));
  await page.goto('file://' + __dirname + '/scene.html?render');
  await page.waitForFunction('window.ready === true');
  const shot = async t => { await page.evaluate(t => window.render(t), t); return page.screenshot({ type: 'jpeg', quality: 94 }); };
  if (mode === 'stills') {
    fs.mkdirSync('stills', { recursive: true });
    for (const t of rest.map(Number)) fs.writeFileSync(`stills/t${t}.jpg`, await shot(t));
  } else {
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-i', 'mix.wav',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart',
      '-shortest', 'movie_recs.mp4'], { stdio: ['pipe', 'inherit', 'inherit'] });
    const N = Math.round(DUR * FPS);
    for (let i = 0; i < N; i++) {
      const buf = await shot(i / FPS);
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (i % 150 === 0) console.log(`frame ${i}/${N}`);
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
  }
  await browser.close();
})();
