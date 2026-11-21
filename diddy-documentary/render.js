// Renders index.html frame-by-frame with headless Chromium and encodes with ffmpeg.
// Usage:
//   node render.js stills 3 25.5 33 ...      -> out/stills/*.jpg at those times
//   node render.js video [fps] [workers]      -> out/video_noaudio.mp4
const { chromium } = require('playwright');
const { spawn, execFileSync } = require('child_process');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = __dirname, PORT = 8123, DURATION = 98;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.wav': 'audio/wav' };

function serve() {
  return new Promise(res => {
    const s = http.createServer((req, rsp) => {
      const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); return rsp.end(); }
      rsp.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(rsp);
    }).listen(PORT, () => res(s));
  });
}

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', e => console.error('PAGE ERROR', e.message));
  await page.goto(`http://localhost:${PORT}/index.html?render`);
  await page.evaluate(() => window.ready);
  return page;
}
const grab = (page, t, q = 0.93) => page.evaluate(([t, q]) => { renderFrame(t); return document.getElementById('c').toDataURL('image/jpeg', q).split(',')[1]; }, [t, q]);

async function main() {
  const [mode = 'stills', ...args] = process.argv.slice(2);
  const server = await serve();
  const browser = await chromium.launch();
  fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true });
  try {
    if (mode === 'stills') {
      const dir = path.join(ROOT, 'out/stills'); fs.mkdirSync(dir, { recursive: true });
      const page = await openPage(browser);
      for (const a of args) { const t = parseFloat(a); fs.writeFileSync(path.join(dir, `t${t.toFixed(2).padStart(6, '0')}.jpg`), Buffer.from(await grab(page, t, .85), 'base64')); }
      console.log('stills written to', dir);
    } else {
      const fps = parseInt(args[0] || '30'), workers = parseInt(args[1] || '3');
      const total = Math.round(DURATION * fps), per = Math.ceil(total / workers);
      const t0 = Date.now(); let done = 0;
      await Promise.all([...Array(workers)].map(async (_, w) => {
        const a = w * per, b = Math.min(total, a + per);
        const page = await openPage(browser);
        const seg = path.join(ROOT, `out/seg${w}.mp4`);
        const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(fps), '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', seg], { stdio: ['pipe', 'inherit', 'inherit'] });
        for (let f = a; f < b; f++) {
          const buf = Buffer.from(await grab(page, f / fps), 'base64');
          if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
          if (++done % 150 === 0) console.log(`${done}/${total} frames  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
        }
        ff.stdin.end(); await new Promise(r => ff.on('close', r));
      }));
      fs.writeFileSync(path.join(ROOT, 'out/segs.txt'), [...Array(workers)].map((_, w) => `file 'seg${w}.mp4'`).join('\n'));
      execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(ROOT, 'out/segs.txt'), '-c', 'copy', path.join(ROOT, 'out/video_noaudio.mp4')]);
      [...Array(workers)].forEach((_, w) => fs.unlinkSync(path.join(ROOT, `out/seg${w}.mp4`)));
      console.log('video done in', ((Date.now() - t0) / 1000).toFixed(0), 's');
    }
  } finally { await browser.close(); server.close(); }
}
main().catch(e => { console.error(e); process.exit(1); });
