import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import path from 'path';
import fs from 'fs';

const mapId = process.argv[2] || 'skeld';
const url = pathToFileURL(path.resolve('among-us copy.html')).href;

const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(500);

const out = await page.evaluate((mapId) => {
  if (typeof window.__audit !== 'function') return { ok: false, why: '__audit hook missing' };
  // Hook createElement to grab the full-size offscreen static map canvas
  const made = [];
  const orig = document.createElement.bind(document);
  document.createElement = function (t) { const el = orig(t); if (String(t).toLowerCase() === 'canvas') made.push(el); return el; };
  let data;
  try { data = window.__audit(mapId); } catch (e) { return { ok: false, why: String(e && e.stack || e) }; }
  document.createElement = orig;
  const off = made.find(c => c.width === data.W && c.height === data.H);
  if (!off) return { ok: false, why: 'static canvas not found; sizes=' + made.map(c => c.width + 'x' + c.height).join(',') };

  // Composite: brightened static map + annotation overlay
  const cv = document.getElementById('game');
  cv.width = data.W; cv.height = data.H;
  const c = cv.getContext('2d');
  c.filter = 'brightness(1.55)'; c.drawImage(off, 0, 0); c.filter = 'none';

  const ring = (x, y, r, col) => { c.lineWidth = 3; c.strokeStyle = col; c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke(); };
  const tag = (x, y, s, col) => { c.font = 'bold 13px Arial'; c.textAlign = 'left'; c.fillStyle = 'rgba(0,0,0,0.7)'; c.fillRect(x + 8, y - 9, c.measureText(s).width + 6, 15); c.fillStyle = col; c.fillText(s, x + 11, y + 3); };

  // Decor objects (yellow squares)
  for (const d of data.decs) { c.fillStyle = 'rgba(255,210,40,0.9)'; c.fillRect(d.x - 4, d.y - 4, 8, 8); tag(d.x, d.y, d.type, 'rgba(255,225,120,0.95)'); }
  // Vents (magenta)
  for (const v of data.vents) { c.strokeStyle = 'rgba(255,60,220,0.95)'; c.lineWidth = 3; c.strokeRect(v.x - 20, v.y - 12, 40, 24); }
  // Tasks (cyan ring; visual tasks get a thicker ring)
  for (const t of data.tasks) { ring(t.x, t.y, t.visual ? 11 : 7, t.visual ? 'rgba(120,255,120,0.95)' : 'rgba(60,220,255,0.95)'); tag(t.x, t.y, t.name, 'rgba(150,240,255,0.95)'); }
  // Emergency button (red)
  if (data.emergency) { c.fillStyle = 'rgba(255,40,40,0.95)'; c.beginPath(); c.arc(data.emergency.x, data.emergency.y, 12, 0, 7); c.fill(); }
  // Room labels (white)
  c.textAlign = 'center';
  for (const r of data.rooms) { c.font = 'bold 22px Arial'; c.lineWidth = 4; c.strokeStyle = 'rgba(0,0,0,0.85)'; c.strokeText(r.name, r.x, r.y); c.fillStyle = '#fff'; c.fillText(r.name, r.x, r.y); }

  return { ok: true, data: cv.toDataURL('image/png'), counts: { rooms: data.rooms.length, tasks: data.tasks.length, vents: data.vents.length, decs: data.decs.length } };
}, mapId);

if (!out.ok) { console.error('AUDIT FAILED:', out.why); if (errors.length) console.error('ERRORS:', errors.join('\n')); await browser.close(); process.exit(1); }
fs.writeFileSync(`_audit_${mapId}.png`, Buffer.from(out.data.replace(/^data:image\/png;base64,/, ''), 'base64'));
console.log(`Saved _audit_${mapId}.png`, JSON.stringify(out.counts));
await browser.close();
