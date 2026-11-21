const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await p.goto('https://mdfor.dev/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1200);
  const items = await p.evaluate(() => [...document.querySelectorAll('header *')]
    .filter(e => ['BUTTON','A','SVG','DIV','SPAN'].includes(e.tagName))
    .map(e => { const r = e.getBoundingClientRect(); return { t: e.tagName, l: (e.getAttribute('aria-label') || e.getAttribute('title') || '').slice(0,40), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })
    .filter(o => o.w >= 20 && o.w <= 120 && o.h >= 20 && o.h <= 80 && o.y < 90));
  console.log(JSON.stringify(items));
  await b.close();
})();
