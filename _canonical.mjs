import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import path from 'path';

// Canonical Among Us task -> allowed rooms (The Skeld). Names match the game's task names.
const SKELD = {
  'Swipe Card': ['Admin'],
  'Upload Data': ['Admin'],
  'Download Data': ['Cafeteria', 'Communications', 'Weapons', 'Navigation', 'Electrical', 'Admin'],
  'Fix Wiring': ['Electrical', 'Admin', 'Navigation', 'Cafeteria', 'Storage', 'Security'],
  'Calibrate Distributor': ['Electrical'],
  'Divert Power': ['Electrical'],
  'Accept Diverted Power': ['Communications', 'Navigation', 'O2', 'Reactor', 'Security', 'Shields', 'Weapons', 'Upper Engine', 'Lower Engine'],
  'Clean O2 Filter': ['O2'],
  'Empty Garbage': ['O2', 'Cafeteria', 'Storage'],
  'Empty Chute': ['O2', 'Storage'],
  'Chart Course': ['Navigation'],
  'Stabilize Steering': ['Navigation'],
  'Clear Asteroids': ['Weapons'],
  'Prime Shields': ['Shields'],
  'Fuel Engines': ['Storage', 'Upper Engine', 'Lower Engine'],
  'Align Engine Output': ['Upper Engine', 'Lower Engine'],
  'Start Reactor': ['Reactor'],
  'Unlock Manifolds': ['Reactor'],
  'Submit Scan': ['MedBay'],
  'Inspect Sample': ['MedBay'],
  'Inspect Samples': ['MedBay'],
};
const REF = { skeld: SKELD };

const mapId = process.argv[2] || 'skeld';
const canon = REF[mapId];
const url = pathToFileURL(path.resolve('among-us copy.html')).href;
const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage();
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(300);
const d = await page.evaluate((id) => window.__audit(id), mapId);
await browser.close();

const byRoom = {}; for (const t of d.tasks) (byRoom[t.room] ||= []).push(t);
let keep = 0, remove = 0;
console.log(`\n=== ${mapId.toUpperCase()} — canonical task trim preview ===`);
for (const r of d.rooms) {
  const ts = byRoom[r.name] || []; if (!ts.length) continue;
  console.log(`\n${r.name}`);
  for (const t of ts) {
    const ok = canon[t.name] && canon[t.name].includes(r.name);
    if (ok) keep++; else remove++;
    console.log(`   ${ok ? 'KEEP  ' : 'REMOVE'}  ${t.name}`);
  }
}
// canonical tasks that SHOULD exist but are missing
const present = new Set(d.tasks.map(t => t.name + '@' + t.room));
const missing = [];
for (const [name, rooms] of Object.entries(canon)) for (const rm of rooms) if (![...present].some(p => p === name + '@' + rm)) missing.push(`${name} @ ${rm}`);
console.log(`\nKEEP: ${keep}   REMOVE: ${remove}   (of ${d.tasks.length})`);
console.log(`\nCanonical placements with no current task (optional to ADD):\n  ` + (missing.join('\n  ') || 'none'));
