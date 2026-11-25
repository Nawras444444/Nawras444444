// Screenshot chosen panels at chosen times, for a visual check before rendering.
const { chromium } = require('playwright'); const path = require('path');
const ids = process.argv[2].split(','), times = (process.argv[3] || '1.3,5').split(',').map(Number);
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('requestfailed', r => errs.push('FAILED ' + r.url()));
  for (const id of ids) {
    await p.goto('file://' + path.resolve('index.html') + `?p=${id}&render=1&rec=1`);
    await p.evaluate(() => window.__ready); await p.waitForTimeout(400);
    for (const t of times) { await p.evaluate(t => { tl.time(t); wig.time(t); }, t);
      await p.screenshot({ path: `preview/${id}_t${t}.jpg`, type: 'jpeg', quality: 85 }); }
  }
  console.log(errs.length ? errs.join('\n') : 'no page errors'); await b.close();
})();
