import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import path from 'path';

const url = pathToFileURL(path.resolve('among-us copy.html')).href;
const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage();
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(300);

const near = (t, o) => {
  // distance from task point to nearest edge of obstacle rect (obj wall) or dec point
  if (o.w != null) {
    const dx = Math.max(o.x - t.x, 0, t.x - (o.x + o.w));
    const dy = Math.max(o.y - t.y, 0, t.y - (o.y + o.h));
    return Math.hypot(dx, dy);
  }
  return Math.hypot(o.x - t.x, o.y - t.y);
};

for (const mapId of ['skeld', 'mira', 'polus', 'airship']) {
  const d = await page.evaluate((id) => window.__audit(id), mapId);
  const objs = d.walls.filter(w => w.obj);
  let uncovered = [];
  for (const t of d.tasks) {
    if (t.visual) continue;
    const dObj = objs.length ? Math.min(...objs.map(o => near(t, o))) : 9999;
    const dDec = d.decs.length ? Math.min(...d.decs.map(o => near(t, o))) : 9999;
    if (Math.min(dObj, dDec) > 40) uncovered.push(`${t.name} (${t.room}) @${t.x},${t.y}  nearest obj ${Math.round(dObj)}px / dec ${Math.round(dDec)}px`);
  }
  console.log(`\n=== ${mapId.toUpperCase()}: ${objs.length} collision obstacles, ${d.decs.length} decor props, ${d.tasks.length} tasks ===`);
  console.log(`  Tasks with NO obstacle/prop within 40px: ${uncovered.length}`);
  for (const u of uncovered) console.log('   - ' + u);
}
await browser.close();
