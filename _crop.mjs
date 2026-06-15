import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import path from 'path';
import fs from 'fs';

const [file, cxs, cys, ws] = process.argv.slice(2);
const cx = +cxs, cy = +cys, half = +(ws || 200);
const url = pathToFileURL(path.resolve(file)).href;
const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage();
await page.goto('about:blank');
const dataUrl = 'data:image/png;base64,' + fs.readFileSync(file).toString('base64');
const out = await page.evaluate(async ({ dataUrl, cx, cy, half }) => {
  const img = new Image(); img.src = dataUrl; await img.decode();
  const sx = Math.max(0, cx - half), sy = Math.max(0, cy - half), s = half * 2, scale = 3;
  const cv = document.createElement('canvas'); cv.width = s * scale; cv.height = s * scale;
  const c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
  c.drawImage(img, sx, sy, s, s, 0, 0, s * scale, s * scale);
  return cv.toDataURL('image/png');
}, { dataUrl, cx, cy, half });
fs.writeFileSync('_crop.png', Buffer.from(out.replace(/^data:image\/png;base64,/, ''), 'base64'));
console.log('Saved _crop.png around', cx, cy);
await browser.close();
