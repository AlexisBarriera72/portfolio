/**
 * Screenshots a site for its project card, at the three device sizes the demo
 * uses (src/data/types.ts → DEVICE_PRESETS):
 *
 *   npm run capture -- https://elsitio.com el-slug
 *   npm run capture -- https://elsitio.com/menu/ el-slug --wait 3000
 *   npm run capture -- https://elsitio.com el-slug --click "Aceptar"
 *
 * Writes src/assets/media/<slug>/phone.webp, tablet.webp and desktop.webp.
 * phone.webp doubles as the card's "after" image. Captures are taken with
 * reduced motion on, so nothing is caught mid-animation; --wait adds time
 * for slow pages (3D, big images) after the network goes quiet; --click
 * presses a button or link by its text first (a cookie banner, a welcome
 * screen) so the capture shows the page itself.
 *
 * Needs Chromium: `npx playwright install chromium` once, or point
 * PW_CHROMIUM at an installed one.
 */
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const DEVICES = [
  { id: 'phone', width: 390, height: 844, mobile: true },
  { id: 'tablet', width: 820, height: 1180, mobile: true },
  { id: 'desktop', width: 1280, height: 800, mobile: false },
];

const args = process.argv.slice(2);
/** Removes `--name value` from args and returns the value. */
const option = (name) => {
  const at = args.indexOf(name);
  return at >= 0 ? args.splice(at, 2)[1] : undefined;
};
const extraWait = Number(option('--wait') ?? 1500);
const click = option('--click');
const [url, slug] = args;

if (!url || !slug || !/^https?:\/\//.test(url) || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
  console.error(
    'Usage: npm run capture -- <url> <slug> [--wait ms] [--click "button text"]\n' +
      '  e.g. npm run capture -- https://elsitio.com panaderia-rosa',
  );
  process.exit(1);
}

const outDir = join('src/assets/media', slug);
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });
try {
  for (const device of DEVICES) {
    const context = await browser.newContext({
      viewport: { width: device.width, height: device.height },
      deviceScaleFactor: 2,
      isMobile: device.mobile,
      hasTouch: device.mobile,
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });
    if (click) {
      await page.getByRole('button', { name: click }).or(page.getByRole('link', { name: click })).first().click();
      await page.waitForLoadState('networkidle');
    }
    await page.waitForTimeout(extraWait);
    const png = await page.screenshot({ type: 'png' });
    const file = join(outDir, `${device.id}.webp`);
    const { width, height, size } = await sharp(png).webp({ quality: 85 }).toFile(file);
    console.log(`${file}  ${width}×${height}  ${Math.round(size / 1024)} KB`);
    await context.close();
  }
} finally {
  await browser.close();
}
