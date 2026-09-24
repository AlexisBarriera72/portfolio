import type { CDPSession, Page } from '@playwright/test';
import { expect, test } from './fixtures';
import {
  PARA_TI,
  enlargeText,
  expectAligned,
  expectResting,
  installFeedHelpers,
  settle,
  visibleSlugs,
} from './helpers';

/**
 * Swipes. What is promised everywhere (rule B): when a gesture has ended and
 * the feed has settled, exactly one card fills the feed and no other card is
 * partly on screen — never halfway. Which card the browser picks for a given
 * distance or speed is its own physics, so the only direction claims are for
 * clear, long swipes: up lands on a later card, down on an earlier one.
 *
 * Touch gestures are real touch events sent over the Chrome DevTools
 * Protocol, so the browser's own scrolling, fling and snapping run — Chromium
 * only. They say nothing about an iPhone's or an Android phone's feel; that
 * needs the physical-device checks in the README. The wheel test at the end
 * runs in every browser, WebKit included.
 */

test.beforeEach(async ({ page }) => {
  await installFeedHelpers(page);
});

type Point = { x: number; y: number };

/** A finger: touch down at `from`, move to `to` in `steps` steps `stepMs` apart, then lift (unless `lift` is false). */
async function drag(cdp: CDPSession, from: Point, to: Point, steps: number, stepMs: number, lift = true) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] });
  for (let i = 1; i <= steps; i++) {
    const at = { x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps };
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [at] });
    await new Promise((r) => setTimeout(r, stepMs));
  }
  if (lift) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

/** Where a vertical swipe of `fraction` of the feed's height starts and ends (negative fraction = downwards). */
async function swipePoints(page: Page, fraction: number, x?: number) {
  const box = await page.evaluate(() => {
    const r = window.__feedScroller().getBoundingClientRect();
    const v = window.__feedView();
    return { left: r.left, width: r.width, top: v.top, height: v.bottom - v.top };
  });
  const cx = x ?? box.left + box.width / 2;
  const middle = box.top + box.height / 2;
  const half = (box.height * Math.abs(fraction)) / 2;
  const up = fraction > 0;
  return {
    from: { x: cx, y: up ? middle + half : middle - half },
    to: { x: cx, y: up ? middle - half : middle + half },
  };
}

/** Swipe up (content moves up, towards later cards) by `fraction` of the feed; negative swipes down. */
async function swipe(page: Page, cdp: CDPSession, fraction: number, speed: 'slow' | 'fast', x?: number) {
  const { from, to } = await swipePoints(page, fraction, x);
  if (speed === 'slow') await drag(cdp, from, to, 20, 25);
  else await drag(cdp, from, to, 4, 8);
}

const indexOf = async (page: Page, slug: string) => (await visibleSlugs(page)).indexOf(slug);

test.describe('touch swipes (Chromium, over CDP)', () => {
  test.skip(({ browserName, isMobile }) => browserName !== 'chromium' || !isMobile, 'touch over CDP: Chromium phone only');

  let cdp: CDPSession;
  test.beforeEach(async ({ page }) => {
    cdp = await page.context().newCDPSession(page);
  });

  test('a short, slow drag comes to rest on one card', async ({ page }) => {
    await page.goto('/el-break/');
    await expectAligned(page, 'el-break');
    await swipe(page, cdp, 60 / 788, 'slow');
    await expectResting(page, 'after a 60px drag');
    await swipe(page, cdp, -60 / 788, 'slow');
    await expectResting(page, 'after a 60px drag back');
  });

  test('slow drags released at a quarter, just under half, just over half and three quarters come to rest', async ({ page }) => {
    await page.goto('/consejeria-escolar/');
    for (const fraction of [0.25, 0.45, 0.55, 0.75, -0.25, -0.45, -0.55, -0.75]) {
      await swipe(page, cdp, fraction, 'slow');
      await expectResting(page, `after a slow drag of ${fraction * 100}% of the feed`);
    }
  });

  test('a fast flick comes to rest on one card, later in the feed', async ({ page }) => {
    await page.goto('/');
    await expectAligned(page, 'inicio');
    await swipe(page, cdp, 0.2, 'fast');
    const landed = await expectResting(page, 'after a fast flick');
    expect(await indexOf(page, landed)).toBeGreaterThan(0);
  });

  test('clear long swipes: up goes to a later card, down to an earlier one', async ({ page }) => {
    await page.goto('/melanie-creations/');
    const start = await indexOf(page, 'melanie-creations');
    await swipe(page, cdp, 0.7, 'slow');
    const later = await indexOf(page, await expectResting(page, 'after a long swipe up'));
    expect(later).toBeGreaterThan(start);
    await swipe(page, cdp, -0.7, 'slow');
    const earlier = await indexOf(page, await expectResting(page, 'after a long swipe down'));
    expect(earlier).toBeLessThan(later);
  });

  test('changing direction mid-gesture still comes to rest', async ({ page }) => {
    await page.goto('/precios/');
    const { from, to } = await swipePoints(page, 0.5);
    await drag(cdp, from, to, 10, 20, false); // up, finger still down…
    await drag(cdp, to, { x: to.x, y: from.y + 60 }, 10, 20); // …then back down past the start, and lift
    await expectResting(page, 'after reversing mid-gesture');
  });

  test('touching down during a fling or a smooth scroll still comes to rest', async ({ page }) => {
    await page.goto('/');
    // A fling, caught by a finger a moment later.
    await swipe(page, cdp, 0.25, 'fast');
    await page.waitForTimeout(40);
    await drag(cdp, { x: 195, y: 500 }, { x: 195, y: 500 }, 1, 0);
    await expectResting(page, 'after catching a fling');

    // A smooth keyboard scroll, interrupted by a small drag.
    await page.keyboard.press('PageDown');
    await page.waitForTimeout(60);
    await swipe(page, cdp, 0.08, 'slow');
    await expectResting(page, 'after interrupting a smooth scroll');
  });

  test('on the before/after picture: vertical swipes move the feed, sideways drags move the slider', async ({ page }) => {
    await page.goto('/el-break/');
    const frame = page.locator('#el-break .compare-frame');
    const box = (await frame.boundingBox())!;
    const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

    // Sideways: the slider moves, the feed stays.
    const before = await page.evaluate(() => window.__feedScroller().scrollTop);
    await drag(cdp, centre, { x: box.x + box.width * 0.85, y: centre.y }, 12, 20);
    await settle(page);
    const pos = await frame.evaluate((el) => (el as HTMLElement).style.getPropertyValue('--pos'));
    expect(parseFloat(pos)).toBeGreaterThan(60);
    expect(await page.evaluate(() => window.__feedScroller().scrollTop)).toBe(before);
    await expectAligned(page, 'el-break');

    // Vertical, starting on the picture: the feed moves and comes to rest.
    await drag(cdp, { x: centre.x, y: box.y + box.height - 10 }, { x: centre.x, y: box.y - 250 }, 20, 20);
    const landed = await expectResting(page, 'after a vertical swipe that started on the slider');
    expect(landed).not.toBe('el-break');
  });

  test('after a tab change, swipes come to rest within the tab', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: 'Precios' }).click();
    await expectAligned(page, 'precios');
    await swipe(page, cdp, 0.7, 'slow');
    const landed = await expectResting(page, 'after a swipe in the Precios tab');
    expect(['que-incluye', 'que-mas-incluye', 'fin']).toContain(landed);
  });

  test('turning the phone keeps the same card, aligned', async ({ page }) => {
    await page.goto('/consejeria-escolar/');
    await expectAligned(page, 'consejeria-escolar');
    await page.setViewportSize({ width: 844, height: 390 });
    await expectAligned(page, 'consejeria-escolar');
    await expect(page).toHaveURL(/\/consejeria-escolar\/$/);
    await page.setViewportSize({ width: 390, height: 844 });
    await expectAligned(page, 'consejeria-escolar');
  });

  test('a shorter or taller viewport (as when a toolbar shows or hides) keeps the same card, aligned', async ({ page }) => {
    // Emulated by resizing the viewport; a real toolbar is only checked on a real phone.
    await page.goto('/precios/');
    await page.setViewportSize({ width: 390, height: 780 });
    await expectAligned(page, 'precios');
    await page.setViewportSize({ width: 390, height: 844 });
    await expectAligned(page, 'precios');
    await swipe(page, cdp, 0.7, 'slow');
    await expectResting(page, 'after a swipe once the viewport is back');
  });

  // The in-between heights where cards used to scroll inside themselves, so a
  // flick moved the card's own content instead of the feed.
  for (const height of [701, 740, 801]) {
    test(`at 390×${height}, a flick on every card moves on to the next one`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height });
      await page.goto('/');
      for (const [i, slug] of PARA_TI.slice(0, -1).entries()) {
        await expectAligned(page, slug);
        await swipe(page, cdp, 0.2, 'fast');
        expect(await expectResting(page, `after a flick on ${slug}`), `a flick on ${slug}`).toBe(PARA_TI[i + 1]);
        const scrolledInside = await page.evaluate(() =>
          [...document.querySelectorAll<HTMLElement>('.card-body')].filter((b) => b.scrollTop > 0).map((b) => b.parentElement!.id),
        );
        expect(scrolledInside, `cards scrolled inside themselves after a flick on ${slug}`).toEqual([]);
      }
    });
  }

  test('enlarged text: swipes reach the end of a tall card, then leave it, in both directions', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto('/precios/');
    await enlargeText(page, '150%');
    await settle(page);
    const whatsapp = page.locator('#precios .card-body > a.btn-whatsapp');
    const heading = page.locator('#h-precios');
    const fullyShown = (el: typeof whatsapp) =>
      el.evaluate((node) => {
        const r = node.getBoundingClientRect();
        const v = window.__feedView();
        return r.top >= v.top - 1 && r.bottom <= v.bottom + 1;
      });
    expect(await fullyShown(whatsapp)).toBe(false);

    // Down through the card: its last control comes fully into view before the feed moves on.
    let sawEnd = false;
    for (let i = 0; i < 12 && new URL(page.url()).pathname === '/precios/'; i++) {
      await swipe(page, cdp, 0.45, 'slow');
      await expectResting(page, `swipe ${i + 1} through the tall pricing card`);
      if (new URL(page.url()).pathname === '/precios/') sawEnd ||= await fullyShown(whatsapp);
    }
    expect(sawEnd, 'the WhatsApp button was fully on screen before leaving').toBe(true);
    await expect(page).toHaveURL(/\/que-incluye\/$/);

    // And back up: into the card's end, through it to its heading, then out the top.
    let sawTop = false;
    for (let i = 0; i < 14 && !/\/melanie-creations\/$/.test(page.url()); i++) {
      await swipe(page, cdp, -0.45, 'slow');
      await expectResting(page, `swipe ${i + 1} back up`);
      if (new URL(page.url()).pathname === '/precios/') sawTop ||= await fullyShown(heading);
    }
    expect(sawTop, 'the heading was fully on screen before leaving upwards').toBe(true);
    await expect(page).toHaveURL(/\/melanie-creations\/$/);
  });
});

test.describe('wheel (every browser)', () => {
  test.skip(({ isMobile }) => isMobile, 'mobile emulation has no mouse wheel');

  test('small wheel movements come to rest on one card', async ({ page }) => {
    await page.goto('/');
    const box = (await page.locator('.feed').boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    for (const delta of [40, 120, -40, 300, -300]) {
      await page.mouse.wheel(0, delta);
      await expectResting(page, `after a wheel movement of ${delta}px`);
    }
  });

  test('the wheel over the desktop margin scrolls the feed too', async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) < 900, 'needs a margin beside the column');
    await page.goto('/');
    const feedHeight = await page.evaluate(() => window.__feedScroller().clientHeight);
    // A clear scroll of more than one card, well outside the column.
    await page.mouse.move(40, 400);
    await page.mouse.wheel(0, Math.round(feedHeight * 1.2));
    const landed = await expectResting(page, 'after the wheel over the margin');
    expect(landed).not.toBe('inicio');
  });
});
