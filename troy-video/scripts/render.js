// node scripts/render.js --at 1,2.5   -> out/f_<t>.jpg
// node scripts/render.js --range a:b   -> out/range.mp4
// node scripts/render.js               -> out/video_silent.mp4 (+ out/schedule.json)
const {chromium} = require('playwright');
const {spawn, execFileSync} = require('child_process'); const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..'); const FPS = 30; const WORKERS = +(process.env.WORKERS || 3);
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
async function page(b) {
  const pg = await b.newPage({viewport: {width: 1920, height: 1080}});
  pg.on('pageerror', e => console.log('ERR', e.message)); pg.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
  await pg.goto('file://' + ROOT + '/film/index.html');
  await pg.waitForFunction(() => window.ready === true, null, {timeout: 120000});
  return pg;
}
async function encode(pg, f0, f1, out) {
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium', out], {stdio: ['pipe', 'inherit', 'inherit']});
  for (let i = f0; i < f1; i++) {
    await pg.evaluate(t => render(t), i / FPS);
    const buf = await pg.screenshot({type: 'jpeg', quality: 92});
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((i - f0) % 300 === 0) console.log(out, i - f0, '/', f1 - f0);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
}
(async () => {
  const b = await chromium.launch({args: ['--disable-web-security', '--allow-file-access-from-files']});
  const at = arg('--at'), range = arg('--range');
  if (at) { const pg = await page(b); for (const t of at.split(',')) { await pg.evaluate(t => render(+t), t); await pg.screenshot({path: `${ROOT}/out/f_${t}.jpg`, type: 'jpeg', quality: 85}); } await b.close(); return; }
  const pg0 = await page(b);
  const info = await pg0.evaluate(() => ({dur: window.DUR, schedule: window.SCHED, specs: window.SPECS}));
  fs.writeFileSync(ROOT + '/out/schedule.json', JSON.stringify(info, null, 1));
  if (range) { const [a, c] = range.split(':').map(Number); await encode(pg0, Math.round(a * FPS), Math.round(c * FPS), ROOT + '/out/range.mp4'); await b.close(); return; }
  const N = Math.round(info.dur * FPS), per = Math.ceil(N / WORKERS); const pages = [pg0];
  for (let w = 1; w < WORKERS; w++) pages.push(await page(b));
  await Promise.all(pages.map((pg, w) => encode(pg, w * per, Math.min(N, (w + 1) * per), `${ROOT}/out/part${w}.mp4`)));
  fs.writeFileSync(ROOT + '/out/parts.txt', pages.map((_, w) => `file 'part${w}.mp4'`).join('\n'));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', ROOT + '/out/parts.txt', '-c', 'copy', ROOT + '/out/video_silent.mp4']);
  await b.close(); console.log('done', N, 'frames');
})();
