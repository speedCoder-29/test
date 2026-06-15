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

const inRect = (px, py, r, m = 0) => r && px >= r.x - m && px <= r.x + r.w + m && py >= r.y - m && py <= r.y + r.h + m;
const floors = [...d.rooms.filter(r => r.rect).map(r => r.rect), ...d.corridors];
const inAnyFloor = (px, py, m = 0) => floors.some(r => inRect(px, py, r, m));
const roomByName = {}; for (const r of d.rooms) if (r.rect) roomByName[r.name] = r.rect;
const overlapArea = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

const issues = [];
// Tasks
for (const t of d.tasks) {
  if (!inAnyFloor(t.x, t.y, 22)) { issues.push(`TASK_IN_VOID   "${t.name}" @${t.x},${t.y} (room ${t.room}) — not on any walkable floor`); continue; }
  const rr = roomByName[t.room];
  if (rr && !inRect(t.x, t.y, rr, 26)) issues.push(`TASK_OFF_ROOM  "${t.name}" @${t.x},${t.y} — outside ${t.room} rect [${rr.x},${rr.y},${rr.w},${rr.h}]`);
}
// Decor
for (const o of d.decs) if (!inAnyFloor(o.x, o.y, 16)) issues.push(`DEC_IN_VOID    "${o.type}" @${o.x},${o.y} — not on any walkable floor`);
// Vents
for (const v of d.vents) {
  const vr = { x: v.x - 20, y: v.y - 12, w: 40, h: 24 };
  if (!inAnyFloor(v.x, v.y, 6)) { issues.push(`VENT_IN_VOID   @${v.x},${v.y} — center off-floor`); continue; }
  for (const w of d.walls) if (!w.obj && overlapArea(vr, w) > 240) { issues.push(`VENT_ON_WALL   @${v.x},${v.y} — overlaps wall [${w.x},${w.y},${w.w},${w.h}] area ${Math.round(overlapArea(vr, w))}`); break; }
  for (const w of d.walls) if (w.obj && overlapArea(vr, w) > 200) { issues.push(`VENT_ON_FURNITURE @${v.x},${v.y} — under object [${w.x},${w.y},${w.w},${w.h}]`); break; }
  for (const o of d.decs) if (Math.hypot(o.x - v.x, o.y - v.y) < 26) issues.push(`VENT_ON_DECOR  @${v.x},${v.y} — decor "${o.type}" within 26px`);
}
// Overlaps between decor objects (stacked props)
for (let i = 0; i < d.decs.length; i++) for (let j = i + 1; j < d.decs.length; j++) {
  const a = d.decs[i], b = d.decs[j];
  if (Math.hypot(a.x - b.x, a.y - b.y) < 30) issues.push(`DEC_OVERLAP    "${a.type}"@${a.x},${a.y} ~ "${b.type}"@${b.x},${b.y} (${Math.round(Math.hypot(a.x-b.x,a.y-b.y))}px)`);
}
// Tasks sitting on a vent (visually collides with the vent grate)
for (const t of d.tasks) for (const v of d.vents) if (Math.hypot(t.x - v.x, t.y - v.y) < 22) issues.push(`TASK_ON_VENT   "${t.name}"@${t.x},${t.y} ~ vent@${v.x},${v.y}`);

console.log(`\n=== ${mapId.toUpperCase()} — ${d.rooms.length} rooms, ${d.tasks.length} tasks, ${d.decs.length} decor, ${d.vents.length} vents ===`);
console.log(issues.length ? issues.join('\n') : 'No placement issues detected.');
console.log(`\nTotal issues: ${issues.length}`);
