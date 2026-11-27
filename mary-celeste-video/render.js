// node render.js            -> frames piped to ffmpeg -> out/video_silent.mp4
// node render.js t1 t2 ...  -> preview PNGs at those times in out/
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
(async () => {
  fs.mkdirSync('out', { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto('file://' + __dirname + '/index.html');
  await p.evaluate(() => window.ready);
  const times = process.argv.slice(2).map(Number);
  if (times.length) {
    for (const t of times) { await p.evaluate(t => seek(t), t); await p.screenshot({ path: `out/prev_${t}.jpg`, quality: 70 }); }
    return b.close();
  }
  const FPS = 30, END = await p.evaluate(() => CFG.end), N = Math.round(END * FPS);
  const ff = spawn('ffmpeg', ['-y', '-f', 'image2pipe', '-framerate', FPS, '-i', '-', '-c:v', 'libx264', '-preset', 'medium',
    '-crf', '18', '-pix_fmt', 'yuv420p', 'out/video_silent.mp4'], { stdio: ['pipe', 'ignore', 'inherit'] });
  for (let f = 0; f < N; f++) {
    await p.evaluate(t => seek(t), f / FPS);
    const buf = await p.screenshot({ type: 'jpeg', quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 300 === 0) console.log('frame', f, '/', N);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close();
})();
