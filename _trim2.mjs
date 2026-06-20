import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import path from 'path';
import fs from 'fs';

// Per-map trim rules (denylist style, so unlisted tasks are kept).
const RULES = {
  mira: {
    removeNames: ['Prep Launch', 'Fertilize Plants', 'Measure Humidity', 'Replace UV Bulb', 'Clean Engine',
      'Recharge Battery', 'Buy Beverage', 'Clean Table', 'Clean MedBay', 'View Balcony', 'Fuel Canisters',
      'Restore Comms', 'Clean Filter'],
    keepOnlyIn: { 'Fix Wiring': ['Admin', 'Cafeteria', 'Communications', 'Launchpad', 'Laboratory'] },
    removeIn: { 'Swipe Card': ['Office'], 'Download Data': ['Locker Room', 'Balcony'] },
    adds: [{ name: 'Clean O2 Filter', room: 'Greenhouse' }],
    dedupe: true,
  },
  polus: {
    removeNames: ['Prep Launch', 'Restore Comms', 'Clean Boiler'],
    keepOnlyIn: {
      'Fix Wiring': ['Electrical', 'Communications', 'Storage', 'Office', 'Admin'],
      'Calibrate Distributor': ['Electrical'],
      'Align Telescope': ['Laboratory'],
    },
    dedupe: true,
  },
  airship: {
    removeNames: ['Grill Steak', 'Clean Armory', 'Restore Comms'],
    keepOnlyIn: {
      'Fix Wiring': ['Cockpit', 'Communications', 'Electrical', 'Engine Room', 'Main Hall', 'Brig'],
      'Clear Asteroids': [],
      'Polish Ruby': ['Main Hall'],
    },
    dedupe: true,
  },
};

const apply = process.argv.includes('--apply');
const mapId = process.argv.find(a => RULES[a]) || 'mira';
const R = RULES[mapId];
const file = 'among-us copy.html';
const url = pathToFileURL(path.resolve(file)).href;
const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage();
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(300);
const d = await page.evaluate((id) => window.__audit(id), mapId);
await browser.close();

const remSet = new Set(R.removeNames || []);
const seen = new Set();
const keep = d.tasks.map(t => {
  if (remSet.has(t.name)) return false;
  if (R.keepOnlyIn?.[t.name] && !R.keepOnlyIn[t.name].includes(t.room)) return false;
  if (R.removeIn?.[t.name]?.includes(t.room)) return false;
  if (R.dedupe) { const k = t.name + '|' + t.room; if (seen.has(k)) return false; seen.add(k); }
  return true;
});
const removed = d.tasks.filter((_, i) => !keep[i]);
console.log(`\n=== ${mapId.toUpperCase()} trim: keep ${keep.filter(Boolean).length}, remove ${removed.length}, add ${(R.adds || []).length} (of ${d.tasks.length}) ===`);
const byRoom = {}; for (const t of removed) (byRoom[t.room] ||= []).push(t.name);
for (const [r, ns] of Object.entries(byRoom)) console.log(`  REMOVE  ${r}: ${ns.join(', ')}`);

// positions for adds
const overlap = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
const rectOf = {}; for (const r of d.rooms) rectOf[r.name] = r.rect;
const keptPts = d.tasks.filter((_, i) => keep[i]).map(t => ({ x: t.x, y: t.y }));
const addObjs = [];
for (const add of (R.adds || [])) {
  const r = rectOf[add.room]; let best = null;
  for (let off = 0; off <= r.w - 48 && !best; off += 16) {
    const x = r.x + 24 + off, y = r.y + r.h - 26, vr = { x: x - 20, y: y - 12, w: 40, h: 24 };
    if (d.walls.some(w => overlap(vr, w) > 150)) continue;
    if (d.vents.some(v => Math.hypot(v.x - x, v.y - y) < 28)) continue;
    if (keptPts.some(p => Math.hypot(p.x - x, p.y - y) < 36)) continue;
    best = { x, y };
  }
  best ||= { x: (r.x + r.w / 2) | 0, y: r.y + r.h - 26 };
  addObjs.push({ ...add, ...best }); keptPts.push(best);
  console.log(`  ADD     ${add.room}: ${add.name} @${best.x},${best.y}`);
}

let src = fs.readFileSync(file, 'utf8');
const ts = src.indexOf('tasks: [', src.indexOf(`${mapId}: {`));
const te = src.indexOf('\n        ],', ts);
const head = src.slice(0, ts), block = src.slice(ts, te), tail = src.slice(te);
let ti = 0; const out = [];
for (const ln of block.split('\n')) {
  if (/\{\s*x:\s*-?\d+/.test(ln) && /name:/.test(ln)) { if (keep[ti]) out.push(ln); ti++; }
  else out.push(ln);
}
const addLines = addObjs.map(a => `          { x: ${a.x}, y: ${a.y}, name: '${a.name}', room: '${a.room}' },  // added (canonical)`);
const newBlock = out.join('\n') + (addLines.length ? '\n' + addLines.join('\n') : '');
console.log(`\nParsed ${ti} task lines (expected ${d.tasks.length}).`);
if (apply && ti === d.tasks.length) { fs.writeFileSync(file, head + newBlock + tail); console.log('APPLIED.'); }
else if (apply) console.log('ABORTED: count mismatch.'); else console.log('(dry run)');
