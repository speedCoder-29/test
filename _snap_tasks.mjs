import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import path from 'path';
import fs from 'fs';

const apply = process.argv.includes('--apply');
const onlyMap = process.argv.find(a => ['skeld', 'mira', 'polus', 'airship'].includes(a));
const maps = onlyMap ? [onlyMap] : ['skeld', 'mira', 'polus', 'airship'];
const file = 'among-us copy.html';
const url = pathToFileURL(path.resolve(file)).href;

const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage();
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(300);

let src = fs.readFileSync(file, 'utf8');

const overlap = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

for (const mapId of maps) {
  const d = await page.evaluate((id) => window.__audit(id), mapId);
  const rectOf = {}; for (const r of d.rooms) rectOf[r.name] = r.rect;
  const hitsBad = (x, y) => {
    const vr = { x: x - 20, y: y - 12, w: 40, h: 24 };
    if (d.walls.some(w => overlap(vr, w) > 150)) return true;
    if (d.vents.some(v => Math.hypot(v.x - x, v.y - y) < 24)) return true;
    return false;
  };
  const placed = []; // snapped positions, to avoid stacking
  const moves = [];  // {old, new}
  for (const t of d.tasks) {
    if (t.visual) continue;                       // visual tasks sit at specific equipment
    const r = rectOf[t.room]; if (!r) continue;
    const depth = Math.min(t.x - r.x, r.x + r.w - t.x, t.y - r.y, r.y + r.h - t.y);
    const thresh = Math.max(70, 0.30 * Math.min(r.w, r.h));
    if (depth <= thresh) continue;                // already near a wall — leave it
    // nearest of 4 walls, inset 24
    const inset = 24;
    const cands = [
      { x: r.x + inset, y: t.y, d: t.x - r.x },        // left
      { x: r.x + r.w - inset, y: t.y, d: r.x + r.w - t.x }, // right
      { x: t.x, y: r.y + inset, d: t.y - r.y },        // top
      { x: t.x, y: r.y + r.h - inset, d: r.y + r.h - t.y }, // bottom
    ].sort((a, b) => a.d - b.d);
    let chosen = null;
    for (const c of cands) {
      // slide along the wall up to ±120px to dodge walls/vents/other tasks
      const along = c.x === r.x + inset || c.x === r.x + r.w - inset ? 'y' : 'x';
      for (let off = 0; off <= 120 && !chosen; off += 12) {
        for (const s of (off === 0 ? [0] : [off, -off])) {
          const nx = Math.round(along === 'x' ? c.x + s : c.x);
          const ny = Math.round(along === 'y' ? c.y + s : c.y);
          if (nx < r.x + 12 || nx > r.x + r.w - 12 || ny < r.y + 12 || ny > r.y + r.h - 12) continue;
          if (hitsBad(nx, ny)) continue;
          if (placed.some(p => Math.hypot(p.x - nx, p.y - ny) < 34)) continue;
          chosen = { x: nx, y: ny }; break;
        }
      }
      if (chosen) break;
    }
    if (chosen && (chosen.x !== t.x || chosen.y !== t.y)) { placed.push(chosen); moves.push({ t, n: chosen, depth: Math.round(depth) }); }
    else if (chosen) placed.push(chosen);
  }

  // Locate this map's tasks: [ ... ] block and rewrite the i-th task object in order
  const key = `${mapId}: {`;
  const ks = src.indexOf(key);
  const ts = src.indexOf('tasks: [', ks);
  const te = src.indexOf('\n        ],', ts);
  let block = src.slice(ts, te);
  const objs = block.match(/\{[^{}]*\}/g) || [];
  // map by order: __audit tasks order === source task-object order
  let mi = 0, changed = 0;
  const moveByTask = new Map(moves.map(m => [m.t, m.n]));
  // Build index of which source obj corresponds to which audit task (same order)
  const newBlock = block.replace(/\{[^{}]*\}/g, (obj) => {
    const t = d.tasks[mi++];
    const nv = t && moveByTask.get(t);
    if (!nv) return obj;
    changed++;
    return obj.replace(/x:\s*-?\d+/, `x: ${nv.x}`).replace(/y:\s*-?\d+/, `y: ${nv.y}`);
  });
  console.log(`\n=== ${mapId.toUpperCase()}: ${moves.length} floaters to snap (of ${d.tasks.length} tasks); source objs=${objs.length}, rewritten=${changed} ===`);
  for (const m of moves.slice(0, 50)) console.log(`  ${m.t.name.padEnd(22)} ${m.t.x},${m.t.y} -> ${m.n.x},${m.n.y}  (was ${m.depth}px deep, room ${m.t.room})`);
  if (apply) src = src.slice(0, ts) + newBlock + src.slice(te);
}

if (apply) { fs.writeFileSync(file, src); console.log('\nAPPLIED to', file); }
else console.log('\n(dry run — pass --apply to write)');
await browser.close();
