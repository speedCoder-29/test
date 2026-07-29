import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import path from 'path';
import fs from 'fs';

const apply = process.argv.includes('--apply');
const CFG = {
  skeld:   { tasksOnlyUncovered: true, central: false },
  mira:    { central: true },
  polus:   { central: true },
  airship: { central: true },
};
const file = 'among-us copy.html';
const url = pathToFileURL(path.resolve(file)).href;
const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage();
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(300);

const rectHit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const overlap = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
const distTo = (t, o) => {                     // task point to obstacle rect OR dec point
  if (o.w == null) return Math.hypot(o.x - t.x, o.y - t.y);
  const dx = Math.max(o.x - t.x, 0, t.x - (o.x + o.w)), dy = Math.max(o.y - t.y, 0, t.y - (o.y + o.h));
  return Math.hypot(dx, dy);
};

let src = fs.readFileSync(file, 'utf8');
const results = {};

for (const [mapId, cfg] of Object.entries(CFG)) {
  const d = await page.evaluate((id) => window.__audit(id), mapId);
  const rooms = d.rooms.filter(r => r.rect);
  const existingObj = d.walls.filter(w => w.obj);
  const obstacles = [];
  const central = [];
  const validSpot = (r) => {
    if (d.corridors.some(c => overlap(r, c) > 0)) return false;
    if (d.vents.some(v => rectHit(r, { x: v.x - 22, y: v.y - 14, w: 44, h: 28 }))) return false;
    if (existingObj.some(o => rectHit(r, o))) return false;
    if (obstacles.some(o => rectHit(r, o))) return false;
    return true;
  };

  // task-console obstacles hugging nearest wall
  for (const t of d.tasks) {
    if (t.visual) continue;
    const rr = rooms.find(r => r.name === t.room)?.rect; if (!rr) continue;
    if (cfg.tasksOnlyUncovered) {
      const dO = existingObj.length ? Math.min(...existingObj.map(o => distTo(t, o))) : 9999;
      const dD = d.decs.length ? Math.min(...d.decs.map(o => distTo(t, o))) : 9999;
      if (Math.min(dO, dD) <= 40) continue;
    }
    const edges = [
      { d: t.x - rr.x, r: { x: rr.x + 2, y: t.y - 13, w: 13, h: 26 } },
      { d: rr.x + rr.w - t.x, r: { x: rr.x + rr.w - 15, y: t.y - 13, w: 13, h: 26 } },
      { d: t.y - rr.y, r: { x: t.x - 13, y: rr.y + 2, w: 26, h: 13 } },
      { d: rr.y + rr.h - t.y, r: { x: t.x - 13, y: rr.y + rr.h - 15, w: 26, h: 13 } },
    ].sort((a, b) => a.d - b.d);
    const e = edges.find(e => validSpot(e.r));
    if (e) obstacles.push(e.r);
  }

  // central "key furniture" in large rooms, big clearance
  if (cfg.central) {
    for (const r of rooms) {
      const R = r.rect, md = Math.min(R.w, R.h);
      if (md < 240) continue;
      const s = Math.min(84, Math.round(md * 0.28));
      const rect = { x: Math.round(R.x + R.w / 2 - s / 2), y: Math.round(R.y + R.h / 2 - s / 2), w: s, h: s };
      if (Math.min(rect.x - R.x, R.x + R.w - (rect.x + rect.w), rect.y - R.y, R.y + R.h - (rect.y + rect.h)) < 60) continue;
      if (d.tasks.some(t => rectHit(rect, { x: t.x - 24, y: t.y - 24, w: 48, h: 48 }))) continue;
      if (!validSpot(rect)) continue;
      obstacles.push(rect); central.push(rect);
    }
  }

  // authoritative connectivity check via the game's own grids
  let conn = await page.evaluate(([id, obs]) => window.__connCheck(id, obs), [mapId, obstacles]);
  if (conn.unreachable.length && central.length) {
    // retry without central furniture (the risky ones)
    const consolesOnly = obstacles.filter(o => !central.includes(o));
    const conn2 = await page.evaluate(([id, obs]) => window.__connCheck(id, obs), [mapId, consolesOnly]);
    if (!conn2.unreachable.length) {
      results[mapId] = { obstacles: consolesOnly, consoles: consolesOnly.length, central: 0, droppedCentral: central.length, conn: conn2 };
      console.log(`\n=== ${mapId.toUpperCase()}: +${consolesOnly.length} consoles (dropped ${central.length} central — would isolate ${conn.unreachable.join(',')}) — OK ===`);
      continue;
    }
    conn = conn2; obstacles.length = 0; obstacles.push(...consolesOnly);
  }
  results[mapId] = { obstacles, consoles: obstacles.length - central.length, central: central.length, conn };
  console.log(`\n=== ${mapId.toUpperCase()}: +${obstacles.length} obstacles (${obstacles.length - central.length} consoles, ${central.length} central) ===`);
  console.log(conn.unreachable.length ? '  !! UNREACHABLE: ' + conn.unreachable.join(', ') : '  connectivity OK — all rooms reachable');
}

if (apply) {
  for (const [mapId, rep] of Object.entries(results)) {
    if (rep.conn.unreachable.length) { console.log(`SKIP ${mapId}: connectivity issue`); continue; }
    const ws = src.indexOf('walls: (function()', src.indexOf(`${mapId}: {`));
    const ret = src.indexOf('          return w;', ws);
    const lines = rep.obstacles.map(o => `          w.push({ x: ${o.x}, y: ${o.y}, w: ${o.w}, h: ${o.h}, obj: true });  // added obstacle`).join('\n');
    src = src.slice(0, ret) + lines + '\n' + src.slice(ret);
  }
  fs.writeFileSync(file, src);
  console.log('\nAPPLIED.');
} else console.log('\n(dry run)');
await browser.close();
