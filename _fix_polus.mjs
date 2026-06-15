import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import path from 'path';

const url = pathToFileURL(path.resolve('among-us copy.html')).href;
const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage();
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(400);
const d = await page.evaluate(() => window.__audit('polus'));
await browser.close();

const inRect = (px, py, r, m = 0) => r && px >= r.x - m && px <= r.x + r.w + m && py >= r.y - m && py <= r.y + r.h + m;
const floors = [...d.rooms.filter(r => r.rect).map(r => r.rect), ...d.corridors];
const inAnyFloor = (px, py, m = 0) => floors.some(r => inRect(px, py, r, m));
const overlapArea = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
const ventRect = (x, y) => ({ x: x - 20, y: y - 12, w: 40, h: 24 });
const hitsWall = (x, y) => d.walls.some(w => overlapArea(ventRect(x, y), w) > 150);

const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]];
// require the vent to sit comfortably inside floor (margin -6 so it's not flush to an edge)
const clear = (x, y) => !hitsWall(x, y) && inAnyFloor(x, y, -6);
for (const v of d.vents) {
  if (!hitsWall(v.x, v.y)) continue;
  let best = null;
  for (let step = 4; step <= 160 && !best; step += 4) {
    for (const [dx, dy] of dirs) {
      const nx = Math.round(v.x + dx * step), ny = Math.round(v.y + dy * step);
      if (clear(nx, ny)) { best = { nx, ny, step, dx, dy }; break; }
    }
  }
  const dir = best ? (best.dx ? (best.dx > 0 ? 'E' : 'W') : '') + (best.dy ? (best.dy > 0 ? 'S' : 'N') : '') : '';
  if (best) console.log(`${v.x},${v.y}  ->  ${best.nx},${best.ny}   (${best.step}px ${dir})`);
  else console.log(`${v.x},${v.y}  ->  NO CLEAR SPOT within 160px`);
}
