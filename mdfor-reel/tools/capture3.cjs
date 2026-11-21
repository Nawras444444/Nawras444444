const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 3 });
  await p.goto('https://mdfor.dev/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1200);
  await p.getByRole('button', { name: 'Export', exact: true }).click();
  await p.waitForTimeout(900);
  const box = await p.evaluate(() => {
    const cands = [...document.querySelectorAll('div,ul,menu,section,aside,nav')].filter(e => {
      const t = e.textContent;
      const r = e.getBoundingClientRect();
      return t.includes('Download .md') && t.includes('Download .pdf') && r.width >= 120 && r.width <= 420 && r.height >= 60 && r.height <= 260;
    });
    if (!cands.length) return null;
    cands.sort((a, b) => a.getBoundingClientRect().width * a.getBoundingClientRect().height - b.getBoundingClientRect().width * b.getBoundingClientRect().height);
    const r = cands[0].getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
  console.log('menu box', JSON.stringify(box));
  if (!box) throw new Error('menu not found');
  await p.screenshot({ path: 'assets/parts/export_menu.png', clip: box });
  await b.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
