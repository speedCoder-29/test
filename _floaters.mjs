import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import path from 'path';

const url = pathToFileURL(path.resolve('among-us copy.html')).href;
const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage();
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(300);

for (const mapId of ['skeld', 'mira', 'polus', 'airship']) {
  const d = await page.evaluate((id) => window.__audit(id), mapId);
  const rectOf = {}; for (const r of d.rooms) rectOf[r.name] = r.rect;
  const floaters = [];
  for (const t of d.tasks) {
    const r = rectOf[t.room]; if (!r) continue;
    const depth = Math.min(t.x - r.x, r.x + r.w - t.x, t.y - r.y, r.y + r.h - t.y); // dist to nearest wall
    if (depth > 55) floaters.push({ ...t, depth: Math.round(depth) });
  }
  floaters.sort((a, b) => b.depth - a.depth);
  console.log(`\n=== ${mapId.toUpperCase()}: ${floaters.length}/${d.tasks.length} tasks floating >55px from any wall ===`);
  for (const f of floaters) console.log(`  ${String(f.depth).padStart(3)}px  ${f.name.padEnd(22)} @${f.x},${f.y}  (${f.room})`);
}
await browser.close();
