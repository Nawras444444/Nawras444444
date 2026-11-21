const { chromium } = require('playwright');
const P = 'assets/parts', S = 'assets/shots';
const clips = {
  ic_sync: [919, 10, 40, 40], ic_lint: [967, 10, 42, 40], ic_outline: [1017, 10, 40, 40],
  ic_images: [1065, 10, 40, 40], pill_import_export: [1116, 10, 156, 40], ic_theme: [1284, 10, 40, 40],
  ic_help: [1332, 10, 40, 40], ic_github: [1380, 10, 40, 40], logo_lockup: [20, 10, 126, 40],
};
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 4 });
  await p.goto('https://mdfor.dev/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1200);
  for (const [k, c] of Object.entries(clips)) {
    await p.screenshot({ path: `${P}/${k}.png`, clip: { x: c[0], y: c[1], width: c[2], height: c[3] } });
  }
  const p2 = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await p2.goto('https://mdfor.dev/', { waitUntil: 'networkidle' });
  await p2.waitForTimeout(1200);
  await p2.getByRole('button', { name: 'Outline', exact: true }).click();
  await p2.waitForTimeout(800);
  await p2.screenshot({ path: `${S}/outline_open.png` });
  await p2.keyboard.press('Escape');
  await p2.waitForTimeout(400);
  await p2.getByRole('button', { name: 'Export', exact: true }).click();
  await p2.waitForTimeout(800);
  await p2.screenshot({ path: `${S}/export_open.png` });
  await p2.keyboard.press('Escape');
  await p2.waitForTimeout(400);
  await p2.getByRole('button', { name: 'Toggle theme' }).click();
  await p2.waitForTimeout(900);
  await p2.screenshot({ path: `${S}/dark_viewport.png` });
  await b.close();
  console.log('captured');
})().catch(e => { console.error('CAPTURE FAILED:', e.message); process.exit(1); });
