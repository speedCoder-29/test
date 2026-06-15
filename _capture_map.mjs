import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import path from 'path';

const DIMS = { skeld: [3200, 2000], mira: [2600, 2200], polus: [3400, 2200], airship: [4200, 2600], fungle: [3200, 2400] };
const mapId = process.argv[2] || 'skeld';
const [DW, DH] = DIMS[mapId] || [3200, 2000];
const htmlPath = path.resolve('among-us copy.html');
const url = pathToFileURL(htmlPath).href;

const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(600);

const result = await page.evaluate(({ mapId, DW, DH }) => {
  try {
    if (typeof loadMap !== 'function') return { ok: false, why: 'loadMap not global' };
    if (typeof prerenderStaticMap !== 'function') return { ok: false, why: 'prerenderStaticMap not global' };
    // Hook createElement to grab the offscreen static-map canvas (full map size)
    const made = [];
    const orig = document.createElement.bind(document);
    document.createElement = function (tag) { const el = orig(tag); if (String(tag).toLowerCase() === 'canvas') made.push(el); return el; };
    loadMap(mapId);
    prerenderStaticMap();
    document.createElement = orig;
    const off = made.find(c => c.width === DW && c.height === DH) || made.reverse().find(c => c.width > 1000);
    if (!off) return { ok: false, why: 'offscreen canvas not found; sizes=' + made.map(c => c.width + 'x' + c.height).join(',') };
    const cv = document.getElementById('game');
    cv.width = off.width; cv.height = off.height;
    const c2 = cv.getContext('2d');
    c2.filter = 'brightness(1.55)';   // same filter drawMap() applies
    c2.drawImage(off, 0, 0);
    c2.filter = 'none';
    return { ok: true, data: cv.toDataURL('image/png'), w: cv.width, h: cv.height };
  } catch (e) {
    return { ok: false, why: String(e && e.stack || e) };
  }
}, { mapId, DW, DH });

if (!result.ok) {
  console.error('CAPTURE FAILED:', result.why);
  if (errors.length) console.error('PAGE ERRORS:', errors.join('\n'));
  await browser.close();
  process.exit(1);
}

const b64 = result.data.replace(/^data:image\/png;base64,/, '');
const fs = await import('fs');
const out = `_map_${mapId}.png`;
fs.writeFileSync(out, Buffer.from(b64, 'base64'));
console.log(`Saved ${out} (${result.w}x${result.h})`);
await browser.close();
