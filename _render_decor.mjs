import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import path from 'path';
import fs from 'fs';

const mapId = process.argv[2] || 'skeld';
const DIMS = { skeld: [3200, 2000] };
const [DW, DH] = DIMS[mapId] || [3200, 2000];
const url = pathToFileURL(path.resolve('among-us copy.html')).href;
const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const errs = []; page.on('pageerror', e => errs.push(String(e)));
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(400);

const out = await page.evaluate(({ mapId, DW, DH }) => {
  const made = [];
  const orig = document.createElement.bind(document);
  document.createElement = function (t) { const el = orig(t); if (String(t).toLowerCase() === 'canvas') made.push(el); return el; };
  const data = window.__audit(mapId);                 // loadMap + prerenderStaticMap
  document.createElement = orig;
  const off = made.find(c => c.width === DW && c.height === DH);
  if (!off) return { ok: false, why: 'no static canvas; ' + made.map(c => c.width + 'x' + c.height) };
  const cv = document.getElementById('game');
  cv.width = DW; cv.height = DH;
  const c = cv.getContext('2d');
  c.filter = 'brightness(1.55)'; c.drawImage(off, 0, 0); c.filter = 'none';
  // draw live decor props + task props at full-map coords (ox=oy=0 => screen=world)
  let dErr = null;
  try {
    for (const d of data.decs) if (typeof drawDecorObject === 'function') drawDecorObject(d.x, d.y, d.type);
    for (const t of data.tasks) if (typeof drawTaskDecor === 'function') drawTaskDecor(t.x, t.y, t.name, t.room, false);
  } catch (e) { dErr = String(e); }
  return { ok: true, data: cv.toDataURL('image/png'), dErr, nDec: data.decs.length };
}, { mapId, DW, DH });

if (!out.ok) { console.error('FAIL', out.why); if (errs.length) console.error(errs.join('\n')); await browser.close(); process.exit(1); }
fs.writeFileSync(`_decor_${mapId}.png`, Buffer.from(out.data.replace(/^data:image\/png;base64,/, ''), 'base64'));
console.log(`Saved _decor_${mapId}.png (decs=${out.nDec})` + (out.dErr ? ' drawErr=' + out.dErr : ''));
await browser.close();
