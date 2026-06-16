import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import path from 'path';

const mapId = process.argv[2] || 'skeld';
const url = pathToFileURL(path.resolve('among-us copy.html')).href;
const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage();
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(400);
const d = await page.evaluate((id) => window.__audit(id), mapId);
await browser.close();

const byRoom = {};
for (const t of d.tasks) (byRoom[t.room] ||= []).push(t);
const rectOf = {}; for (const r of d.rooms) rectOf[r.name] = r.rect;
console.log(`\n=== ${mapId.toUpperCase()} TASKS BY ROOM ===`);
for (const r of d.rooms) {
  const ts = byRoom[r.name] || [];
  const rr = r.rect;
  console.log(`\n${r.name}  rect[x:${rr?.x}-${rr ? rr.x + rr.w : '?'}, y:${rr?.y}-${rr ? rr.y + rr.h : '?'}]`);
  for (const t of ts) {
    // nearest decor station
    let nd = null, best = 1e9;
    for (const o of d.decs) { const dd = Math.hypot(o.x - t.x, o.y - t.y); if (dd < best) { best = dd; nd = o; } }
    const near = nd && best < 60 ? `  near ${nd.type}(${Math.round(best)}px)` : '  [no station <60px]';
    console.log(`   ${t.visual ? '*' : ' '} ${t.name.padEnd(22)} @${t.x},${t.y}${near}`);
  }
}
// tasks whose room isn't a known room name
const roomNames = new Set(d.rooms.map(r => r.name));
const orphan = d.tasks.filter(t => !roomNames.has(t.room));
if (orphan.length) console.log('\nORPHAN room refs:', [...new Set(orphan.map(t => t.room))].join(', '));
