// usage: node measure_title.js index.html  -> prints the ink bounds of the title and subtitle
// Compare the bottoms and widths with the same measurements taken from the source poster
// and adjust font-size / letter-spacing / top in the template.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 900, height: 1204 } });
  await p.goto('file://' + require('path').resolve(process.argv[2]) + '?render=1');
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
  await p.evaluate(() => { renderStart(); renderFrame(135, 30); });
  await p.addStyleTag({ content: '#L5,#L3{display:none!important}' });
  await p.screenshot({ path: 'title_measure.png', clip: { x: 60, y: 905, width: 780, height: 235 } });
  console.log('saved title_measure.png (threshold it to read the ink bounds)');
  await b.close();
})();
