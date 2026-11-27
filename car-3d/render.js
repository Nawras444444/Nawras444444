// Serves this folder over HTTP (ES modules need http://), renders frames with
// headless Chromium (WebGL via SwiftShader) and encodes car-3d.mp4 (1080x1920, 30fps, 15s).
// Usage: node render.js            -> full video
//        node render.js 1.2,6.0    -> preview stills (still_<t>.png)
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = __dirname;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png' };
const srv = http.createServer((q, r) => {
  const p = decodeURIComponent(q.url.split('?')[0]);
  const f = path.join(ROOT, p === '/' ? 'index.html' : p);
  fs.readFile(f, (e, d) => {
    if (e) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
    r.end(d);
  });
}).listen(8765);

(async () => {
  const FPS = 30, DUR = 15, only = process.argv[2];
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  pg.on('pageerror', e => console.error('PAGE ERROR:', e.message));
  pg.on('console', m => { if (m.type() === 'error') console.error('CONSOLE:', m.text()); });
  await pg.goto('http://localhost:8765/index.html');
  await pg.waitForFunction(() => window.ready === true, null, { timeout: 60000 });
  await pg.waitForTimeout(500);
  if (only) {
    for (const s of only.split(',')) {
      const t0 = Date.now();
      await pg.evaluate(t => render(t), +s);
      await pg.screenshot({ path: path.join(ROOT, `still_${s}.png`) });
      console.log(`t=${s} rendered in ${Date.now() - t0}ms`);
    }
  } else {
    const ff = spawn('ffmpeg', ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart', path.join(ROOT, 'car-3d.mp4')],
      { stdio: ['pipe', 'ignore', 'ignore'] });
    for (let i = 0; i < FPS * DUR; i++) {
      await pg.evaluate(t => render(t), i / FPS);
      ff.stdin.write(await pg.screenshot({ type: 'jpeg', quality: 92 }));
      if (i % 30 === 0) console.log(`frame ${i}/${FPS * DUR}`);
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
  }
  await b.close();
  srv.close();
})().catch(e => { console.error(e); srv.close(); process.exit(1); });
