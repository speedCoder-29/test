import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import path from 'path';
import fs from 'fs';

// Canonical Among Us task -> allowed rooms (The Skeld), with the user's adjustments.
const SKELD = {
  'Swipe Card': ['Admin'], 'Upload Data': ['Admin'],
  'Download Data': ['Cafeteria', 'Communications', 'Weapons', 'Navigation', 'Electrical'],
  'Fix Wiring': ['Electrical', 'Admin', 'Navigation', 'Cafeteria', 'Storage', 'Security'],
  'Calibrate Distributor': ['Electrical'], 'Divert Power': ['Electrical'],
  'Reset Breakers': ['Electrical'], 'View Camera': ['Security'],
  'Accept Diverted Power': ['Communications', 'Navigation', 'O2', 'Security', 'Shields', 'Weapons', 'Upper Engine', 'Lower Engine'],
  'Clean O2 Filter': ['O2'], 'Empty Garbage': ['O2', 'Cafeteria', 'Storage'],
  'Chart Course': ['Navigation'], 'Stabilize Steering': ['Navigation'],
  'Clear Asteroids': ['Weapons'], 'Prime Shields': ['Shields'],
  'Fuel Engines': ['Storage', 'Upper Engine', 'Lower Engine'],
  'Align Engine Output': ['Upper Engine', 'Lower Engine'],
  'Start Reactor': ['Reactor'], 'Unlock Manifolds': ['Reactor'],
  'Submit Scan': ['MedBay'], 'Inspect Sample': ['MedBay'],
};
const REF = { skeld: SKELD };
const ADDS = { skeld: [{ name: 'Empty Garbage', room: 'O2' }] };

const apply = process.argv.includes('--apply');
const mapId = process.argv.find(a => REF[a]) || 'skeld';
const canon = REF[mapId];
const file = 'among-us copy.html';
const url = pathToFileURL(path.resolve(file)).href;
const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage();
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(300);
const d = await page.evaluate((id) => window.__audit(id), mapId);
await browser.close();

// keep/drop with dedupe of identical (name,room)
const seen = new Set();
const keep = d.tasks.map(t => {
  const ok = canon[t.name] && canon[t.name].includes(t.room);
  if (!ok) return false;
  const k = t.name + '|' + t.room;
  if (seen.has(k)) return false; // duplicate
  seen.add(k); return true;
});
const removed = d.tasks.filter((_, i) => !keep[i]);
console.log(`\n=== ${mapId.toUpperCase()} trim: keep ${keep.filter(Boolean).length}, remove ${removed.length} (of ${d.tasks.length}) ===`);
const byRoomRem = {}; for (const t of removed) (byRoomRem[t.room] ||= []).push(t.name);
for (const [r, ns] of Object.entries(byRoomRem)) console.log(`  REMOVE  ${r}: ${ns.join(', ')}`);

// compute positions for ADD tasks (at a wall, clear of vents/kept tasks)
const overlap = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
const rectOf = {}; for (const r of d.rooms) rectOf[r.name] = r.rect;
const keptPts = d.tasks.filter((_, i) => keep[i]).map(t => ({ x: t.x, y: t.y }));
const addObjs = [];
for (const add of (ADDS[mapId] || [])) {
  const r = rectOf[add.room];
  let best = null;
  for (let off = 0; off <= r.w - 48 && !best; off += 16) {
    const x = r.x + 24 + off, y = r.y + r.h - 24;
    const vr = { x: x - 20, y: y - 12, w: 40, h: 24 };
    if (d.walls.some(w => overlap(vr, w) > 150)) continue;
    if (d.vents.some(v => Math.hypot(v.x - x, v.y - y) < 28)) continue;
    if (keptPts.some(p => Math.hypot(p.x - x, p.y - y) < 36)) continue;
    best = { x, y };
  }
  best ||= { x: r.x + r.w / 2 | 0, y: r.y + r.h - 24 };
  addObjs.push({ ...add, ...best });
  console.log(`  ADD     ${add.room}: ${add.name} @${best.x},${best.y}`);
}

// rewrite source: drop removed task lines, append adds before the closing bracket
const ks = src_idx => src.indexOf('tasks: [', src.indexOf(`${mapId}: {`));
let src = fs.readFileSync(file, 'utf8');
const ts = src.indexOf('tasks: [', src.indexOf(`${mapId}: {`));
const te = src.indexOf('\n        ],', ts);
const head = src.slice(0, ts), block = src.slice(ts, te), tail = src.slice(te);
const lines = block.split('\n');
let ti = 0; const outLines = [];
for (const ln of lines) {
  if (/\{\s*x:\s*-?\d+/.test(ln) && /name:/.test(ln)) {
    if (keep[ti]) outLines.push(ln);     // else drop
    ti++;
  } else outLines.push(ln);
}
const addLines = addObjs.map(a => `          { x: ${a.x}, y: ${a.y}, name: '${a.name}', room: '${a.room}' },  // added (canonical)`);
const newBlock = outLines.join('\n') + (addLines.length ? '\n' + addLines.join('\n') : '');
console.log(`\nParsed ${ti} task lines (expected ${d.tasks.length}).`);
if (apply && ti === d.tasks.length) { fs.writeFileSync(file, head + newBlock + tail); console.log('APPLIED.'); }
else if (apply) console.log('ABORTED: task line count mismatch.');
else console.log('(dry run)');
