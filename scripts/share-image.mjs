/**
 * Draws the share picture — what WhatsApp, Facebook and others show when the
 * site's link is sent — from the site's own look and words:
 *
 *   npm run share-image
 *
 * Writes src/assets/media/share-default.jpg (1200×630, the size the build
 * expects). The name, the line under it and the town come from src/data/
 * (site.ts and the intro card); the picture is the cut-out portrait. Run it
 * again after changing any of those.
 *
 * Needs Node 22.18 or newer (it reads the .ts data files directly) and
 * Chromium: `npx playwright install chromium` once, or PW_CHROMIUM.
 */
import { readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import intro from '../src/data/cards/00-intro.ts';
import { site } from '../src/data/site.ts';

const OUT = 'src/assets/media/share-default.jpg';
const dataUrl = async (path, type) => `data:${type};base64,${(await readFile(path)).toString('base64')}`;
const escape = (text) => text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const font = await dataUrl(
  'node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2',
  'font/woff2',
);
const picture = site.person.cutout ?? site.person.portrait;
const portrait = await dataUrl(`src/assets/media/${picture.src}`, 'image/webp');

const html = `<!doctype html><meta charset="utf-8"><style>
  @font-face { font-family: Display; src: url(${font}) format('woff2'); font-weight: 200 800; }
  * { box-sizing: border-box; margin: 0; }
  body {
    width: 1200px; height: 630px; overflow: hidden; position: relative;
    font-family: Display, system-ui, sans-serif; color: #fff;
    background:
      radial-gradient(520px 420px at 78% 38%, rgb(124 58 237 / 0.75), transparent 70%),
      radial-gradient(460px 380px at 96% 92%, rgb(219 39 119 / 0.6), transparent 70%),
      radial-gradient(700px 500px at 0% 0%, rgb(124 58 237 / 0.28), transparent 70%), #07070c;
  }
  .words { position: absolute; left: 72px; top: 0; bottom: 0; width: 640px; display: flex; flex-direction: column; justify-content: center; gap: 22px; }
  .name { font-size: 34px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #d0bfff; }
  h1 { font-size: 84px; line-height: 1; font-weight: 800; letter-spacing: -0.02em;
       background: linear-gradient(100deg, #fff 0%, #d0bfff 55%, #ff9ecb 100%); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .place { display: inline-flex; align-self: flex-start; padding: 10px 22px; border-radius: 999px; font-size: 30px; font-weight: 700;
           background: linear-gradient(135deg, #7c3aed, #db2777); }
  img { position: absolute; right: 30px; bottom: 0; height: 600px; filter: drop-shadow(0 30px 60px rgb(0 0 0 / 0.55)); }
</style>
<div class="words">
  <p class="name">${escape(site.person.name)}</p>
  <h1>${escape(intro.heading.es)}</h1>
  <p class="place">${escape(site.city)}, PR</p>
</div>
<img src="${portrait}" alt="">`;

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  const png = await page.screenshot({ type: 'png' });
  const { width, height, size } = await sharp(png).jpeg({ quality: 88, mozjpeg: true }).toFile(OUT);
  console.log(`${OUT}  ${width}×${height}  ${Math.round(size / 1024)} KB`);
} finally {
  await browser.close();
}
