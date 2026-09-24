import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import {
  PARA_TI,
  PARA_TI_PATHS,
  atBottom,
  atTop,
  disableSnapping,
  enlargeText,
  expectAligned,
  installFeedHelpers,
  nextFrame,
  overflowing,
  placeCardTop,
  readThrough,
  scrollToVeryEnd,
  settle,
  tagControls,
  unreachable,
  visibleSlugs,
  withRealIntroMedia,
  withoutPendingClips,
  asIfIntroVideoExisted,
} from './helpers';

/**
 * Behaviour of the built feed, against a draft build. Every test is guarded
 * (./fixtures.ts): any failed request or console error fails it, except the
 * exact files the draft declares missing in /draft-missing.json.
 */

const LIVE_DEMO = 'https://consejeria-escolar.vercel.app';

test.beforeEach(async ({ page }) => {
  await installFeedHelpers(page);
});

const introVideo = (page: Page) => page.locator('#inicio video');

test.describe('feed', () => {
  test('home starts at the intro, with the right title and language', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('Alexis · Páginas web en Ponce, PR');
    await expect(page.locator('html')).toHaveAttribute('lang', 'es-PR');
    await expect(page.locator('#inicio h2')).toBeVisible();
    expect(await visibleSlugs(page)).toEqual(PARA_TI);
  });

  test('a card page opens on its card', async ({ page }) => {
    await page.goto('/el-break/');
    await expect(page).toHaveTitle(/^El Break Food Truck · /);
    await expectAligned(page, 'el-break');
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', /\/el-break\/$/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/$/);
  });

  test('scrolling puts the active card in the address bar and title', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => document.getElementById('precios')!.scrollIntoView({ behavior: 'instant' }));
    await expect(page).toHaveURL(/\/precios\/$/);
    await expect(page).toHaveTitle(/^Cuánto cuesta · /);
    await expect(page.locator('[data-lang-link]')).toHaveAttribute('href', '/en/precios/');
  });

  test('arrow keys move one card at a time and announce the position', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('ArrowDown');
    await expect(page).toHaveURL(/\/el-break\/$/);
    await expect(page.locator('[data-feed-status]')).toHaveText('Tarjeta 2 de 9: El Break Food Truck');
    await page.keyboard.press('End');
    await expect(page).toHaveURL(/\/fin\/$/);
    await page.keyboard.press('Home');
    await expect(page).toHaveURL(/\/$/);
  });

  test('a link to another card scrolls there', async ({ page }) => {
    await page.goto('/');
    await page.locator('#inicio').getByRole('link', { name: 'Ver precios' }).click();
    await expect(page).toHaveURL(/\/precios\/$/);
    await expectAligned(page, 'precios');
  });
});

test.describe('keyboard reading', () => {
  // At normal text size every card fits, so the keys move card by card; with
  // enlarged text or a phone on its side a card scrolls inside itself, and
  // the keys read through it before moving on.
  for (const { name, viewport, text } of [
    { name: 'a 390×844 phone', viewport: { width: 390, height: 844 }, text: '100%' },
    { name: 'a 360×640 phone', viewport: { width: 360, height: 640 }, text: '100%' },
    { name: 'a 360×640 phone with text at 150%', viewport: { width: 360, height: 640 }, text: '150%' },
    { name: 'a phone on its side, 844×390', viewport: { width: 844, height: 390 }, text: '100%' },
  ]) {
    test.describe(name, () => {
      test.beforeEach(async ({ page }) => {
        // Instant scrolling keeps hundreds of key presses fast; one test below runs smooth.
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.setViewportSize(viewport);
        await page.goto('/');
        await enlargeText(page, text);
        await settle(page);
        await tagControls(page);
      });

      test('PageDown shows every control of every card, in order, before moving on', async ({ page }) => {
        const run = await readThrough(page, () => page.keyboard.press('PageDown'), () => atBottom(page));
        expect(run.unseen).toEqual([]);
        expect(run.path).toEqual(PARA_TI_PATHS);
        expect(run.strayAnnouncements).toEqual([]);
      });

      test('PageUp reads back up the same way', async ({ page }) => {
        await page.keyboard.press('End');
        await settle(page);
        await scrollToVeryEnd(page);
        await settle(page);
        const run = await readThrough(page, () => page.keyboard.press('PageUp'), () => atTop(page));
        expect(run.unseen).toEqual([]);
        expect(run.path).toEqual([...PARA_TI_PATHS].reverse());
        expect(run.strayAnnouncements).toEqual([]);
      });

      test('↓ reads through too, a quarter screen at a time', async ({ page }) => {
        const run = await readThrough(page, () => page.keyboard.press('ArrowDown'), () => atBottom(page));
        expect(run.unseen).toEqual([]);
        expect(run.path).toEqual(PARA_TI_PATHS);
      });
    });
  }

  test('with smooth scrolling, PageDown shows the pricing card’s WhatsApp button before leaving it', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto('/precios/');
    await enlargeText(page, '150%');
    await settle(page);
    const whatsapp = page.locator('#precios .card-body > a.btn-whatsapp');
    expect(await whatsapp.evaluate((el) => el.getBoundingClientRect().top > window.__feedView().bottom)).toBe(true);
    let shown = false;
    for (let i = 0; i < 20 && new URL(page.url()).pathname === '/precios/'; i++) {
      await page.keyboard.press('PageDown');
      await settle(page);
      if (new URL(page.url()).pathname !== '/precios/') break;
      shown ||= await whatsapp.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const view = window.__feedView();
        return r.top >= view.top && r.bottom <= view.bottom;
      });
    }
    expect(shown).toBe(true);
    await expect(page).toHaveURL(/\/que-incluye\/$/);
  });
});

test.describe('active card', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  /**
   * Partial scrolls with a card boundary just above and just below the middle
   * of the feed, coming from both directions. Snapping is turned off
   * so each position holds exactly; the active card must be the one under
   * the middle. `from` is the card above the boundary, `to` the one below.
   */
  async function sweep(page: Page, from: string, to: string) {
    const down = [0.7, 0.55, 0.45, 0.3];
    for (const at of [...down, ...[...down].reverse()]) {
      await placeCardTop(page, to, at);
      await settle(page);
      const expected = at < 0.5 ? to : from;
      await expect(page, `boundary at ${at * 100}% of the visible area`).toHaveURL(new RegExp(`/${expected}/$`));
    }
  }

  for (const { name, viewport, text } of [
    { name: 'portrait 390×844', viewport: { width: 390, height: 844 }, text: '100%' },
    { name: 'landscape 844×390', viewport: { width: 844, height: 390 }, text: '100%' },
    { name: 'landscape 844×390 with text at 150%', viewport: { width: 844, height: 390 }, text: '150%' },
  ]) {
    test(`is the card under the middle of the visible area — ${name}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/');
      await enlargeText(page, text);
      await disableSnapping(page);
      await sweep(page, 'el-break', 'consejeria-escolar');
      await sweep(page, 'precios', 'que-incluye');
    });
  }

  test('follows the screen when it rotates', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await disableSnapping(page);
    await sweep(page, 'el-break', 'consejeria-escolar');
    await page.setViewportSize({ width: 844, height: 390 });
    // Let the feed react to the new size (it puts the current card back) before scrolling.
    await settle(page);
    await sweep(page, 'precios', 'que-incluye');
  });
});

test.describe('a resize in the middle of a jump', () => {
  // The jump is animated (no reduced motion), so there is a moment to resize in.
  test('lands on the card the jump was going to: screen, address, focus and announcement agree', async ({
    page,
    isMobile,
  }) => {
    await page.goto('/');
    await expectAligned(page, 'inicio');
    const end = await page.evaluate(() => {
      const s = window.__feedScroller();
      return s.scrollHeight - s.clientHeight;
    });
    await page.keyboard.press('End');
    // Provably in flight: past the first card, well short of the last.
    await page.waitForFunction(
      (end) => {
        const top = window.__feedScroller().scrollTop;
        return top > 20 && top < end - 200;
      },
      end,
      { polling: 'raf' },
    );
    const size = page.viewportSize()!;
    // A phone turned sideways; on a desktop, the window made shorter.
    await page.setViewportSize(
      isMobile ? { width: size.height, height: size.width } : { width: size.width, height: size.height - 150 },
    );
    await expectAligned(page, 'fin');
    await expect(page).toHaveURL(/\/fin\/$/);
    expect(await page.evaluate(() => document.activeElement?.closest('.card')?.id)).toBe('fin');
    await expect(page.locator('[data-feed-status]')).toContainText((await page.locator('#h-fin').textContent())!.trim());
  });
});

test.describe('one screen per card', () => {
  /**
   * At normal text size a card fits its panel — nothing to scroll inside it,
   * so a swipe always moves the feed — on every phone from 640px tall (most
   * phones, once the browser's own bars are counted). Swept every 20px up to
   * 1000, with both sides of the layout's 800px switch and the old 700px one.
   * Below 640 the pricing card scrolls inside itself: a known limit.
   */
  const HEIGHTS = [
    ...new Set([...Array.from({ length: 19 }, (_, i) => 640 + i * 20), 699, 700, 701, 740, 799, 800, 801]),
  ].sort((a, b) => a - b);

  for (const path of ['/', '/en/']) {
    test(`every card fits, 640 to 1000px tall, on ${path}`, async ({ page, isMobile }) => {
      test.setTimeout(120_000);
      // Phones from 360 to 430 wide; on a desktop, the column in a wide window.
      const widths = isMobile ? [360, 375, 390, 412, 430] : [1280];
      await page.goto(path);
      const tooTall: string[] = [];
      for (const width of widths) {
        for (const height of HEIGHTS) {
          await page.setViewportSize({ width, height });
          await nextFrame(page);
          for (const card of await overflowing(page)) tooTall.push(`${width}×${height}: ${card}`);
        }
      }
      expect(tooTall).toEqual([]);
    });
  }
});

test.describe('everything on a card can be read', () => {
  // Where a card is taller than its panel, it scrolls inside itself — and
  // every heading, paragraph and control must then be reachable, whole, and
  // not cut off or covered (not just the buttons).
  for (const path of ['/', '/en/']) {
    for (const { name, viewport, text } of [
      { name: 'a phone on its side, 844×390', viewport: { width: 844, height: 390 }, text: '100%' },
      { name: '390×844 with text at 150%', viewport: { width: 390, height: 844 }, text: '150%' },
      { name: '360×640 with text at 150%', viewport: { width: 360, height: 640 }, text: '150%' },
    ]) {
      test(`${name}, on ${path}`, async ({ page }) => {
        // The intro at its fullest: the player, its "not available" message and the transcript.
        await asIfIntroVideoExisted(page);
        await page.setViewportSize(viewport);
        await page.goto(path);
        await enlargeText(page, text);
        const problems: string[] = [];
        for (const slug of PARA_TI) problems.push(...(await unreachable(page, slug)));
        // And with the intro's transcript open.
        await page.locator('#inicio details.transcript').evaluate((d) => {
          (d as HTMLDetailsElement).open = true;
        });
        problems.push(...(await unreachable(page, 'inicio')).map((p) => `transcript open: ${p}`));
        expect(problems).toEqual([]);
      });
    }
  }
});

test.describe('project buttons', () => {
  for (const path of ['/', '/en/']) {
    test(`keep their label on one line and whole at 360×640 on ${path}`, async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 640 });
      await page.goto(path);
      const bad = await page.locator('.card-project .actions .btn').evaluateAll((buttons) =>
        buttons
          .filter((b) => b.checkVisibility())
          .filter((b) => b.scrollWidth > b.clientWidth + 1 || b.getBoundingClientRect().height > 52)
          .map((b) => `${b.closest('.card')!.id}: ${b.textContent!.trim()}`),
      );
      expect(bad).toEqual([]);
    });
  }
});

test.describe('pricing', () => {
  test('each plan opens its full list in a panel, and closing it returns to the card', async ({ page }) => {
    await page.goto('/precios/');
    const plan = page.getByRole('button', { name: /Página completa/ });
    await expect(plan).toHaveAttribute('aria-haspopup', 'dialog');
    await plan.click();
    const panel = page.getByRole('dialog', { name: 'Página completa' });
    await expect(panel).toBeVisible();
    await expect(panel.getByText('Formulario de órdenes o reservaciones')).toBeVisible();
    await expect(panel.locator('a.btn-whatsapp')).toBeVisible();
    const axe = await new AxeBuilder({ page }).include('#plan-precios-completa').analyze();
    expect(axe.violations.map((v) => v.id)).toEqual([]);

    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(plan).toBeFocused();
    await expect(page).toHaveURL(/\/precios\/$/);

    // A click on the backdrop closes it too.
    await page.getByRole('button', { name: /Mantenimiento/ }).click();
    const other = page.getByRole('dialog', { name: 'Mantenimiento' });
    await expect(other).toBeVisible();
    await page.mouse.click(5, 5);
    await expect(other).toBeHidden();
  });
});

test.describe('progress', () => {
  test('the line under the bar shows how far along the open tab the card on screen is', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const filled = () =>
      page.locator('[data-feed-progress]').evaluate((bar) => {
        const whole = bar.getBoundingClientRect().width;
        return bar.firstElementChild!.getBoundingClientRect().width / whole;
      });
    await expect.poll(filled).toBeCloseTo(1 / PARA_TI.length, 2);
    await page.keyboard.press('End');
    await expectAligned(page, 'fin');
    await expect.poll(filled).toBeCloseTo(1, 2);
    await page.getByRole('tab', { name: 'Precios' }).click();
    await expect.poll(filled).toBeCloseTo(1 / 3, 2);
    await expect(page.locator('[data-feed-progress]')).toHaveAttribute('aria-hidden', 'true');
  });
});

test.describe('what you get', () => {
  test('one card lists all six; each opens its explanation, and closing returns to it', async ({ page }) => {
    await page.goto('/que-incluye/');
    const items = page.locator('#que-incluye button.inclusion');
    await expect(items).toHaveCount(6);
    await expect(page.locator('#h-que-incluye')).toHaveText('Qué incluye');

    for (const item of await items.all()) {
      const title = (await item.locator('.inclusion-title').textContent())!.trim();
      await expect(item).toHaveAttribute('aria-haspopup', 'dialog');
      await item.click();
      const panel = page.getByRole('dialog', { name: title });
      await expect(panel).toBeVisible();
      await expect(panel.locator('.panel-body p')).not.toBeEmpty();
      await page.keyboard.press('Escape');
      await expect(panel).toBeHidden();
      await expect(item).toBeFocused();
    }

    // The backdrop closes it too, and the panel passes axe.
    await items.first().click();
    const axe = await new AxeBuilder({ page }).include('#que-incluye-1').analyze();
    expect(axe.violations.map((v) => v.id)).toEqual([]);
    await page.mouse.click(5, 5);
    await expect(page.locator('#que-incluye-1')).toBeHidden();
    await expect(page).toHaveURL(/\/que-incluye\/$/);
  });
});

test.describe('tabs', () => {
  test('filter the feed, go into the URL, and Back undoes them', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: 'Precios' }).click();
    await expect(page).toHaveURL(/\/precios\/\?tab=precios$/);
    await expect(page.getByRole('tab', { name: 'Precios' })).toHaveAttribute('aria-selected', 'true');
    expect(await visibleSlugs(page)).toEqual(['precios', 'que-incluye', 'fin']);
    await expect(page.locator('[data-lang-link]')).toHaveAttribute('href', '/en/precios/?tab=precios');

    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    expect(await visibleSlugs(page)).toEqual(PARA_TI);
    await expect(page.getByRole('tab', { name: 'Para ti' })).toHaveAttribute('aria-selected', 'true');
  });

  test('a shared ?tab= link is filtered before the first paint and starts at the tab’s first card', async ({ page }) => {
    await page.goto('/?tab=contacto');
    await expect(page.locator('html')).toHaveAttribute('data-tab', 'contacto');
    expect(await visibleSlugs(page)).toEqual(['contacto', 'fin']);
    await expect(page).toHaveURL(/\/contacto\/\?tab=contacto$/);
  });

  test('an unknown tab falls back to "Para ti"', async ({ page }) => {
    await page.goto('/?tab=nope');
    await expect(page.locator('html')).toHaveAttribute('data-tab', 'para-ti');
    expect(await visibleSlugs(page)).toEqual(PARA_TI);
  });

  test('arrow keys move between tabs without switching the feed', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: 'Para ti' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: 'Precios' })).toBeFocused();
    await expect(page).toHaveURL(/\/$/);
  });

  // Contacto is third, and wholly in view — clear of the fade at the row's
  // right edge (1rem) — on phones from 360px wide, in both languages.
  for (const viewport of [
    { width: 360, height: 640 },
    { width: 390, height: 844 },
  ]) {
    for (const path of ['/', '/en/']) {
      test(`the contact tab is in full view at ${viewport.width}×${viewport.height} on ${path}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto(path);
        const labels = await page.getByRole('tab').allTextContents();
        expect(labels.map((l) => l.trim()).slice(0, 3)).toEqual(
          path === '/' ? ['Para ti', 'Precios', 'Contacto'] : ['For you', 'Pricing', 'Contact'],
        );
        const room = await page.evaluate(() => {
          const row = document.querySelector('.tabs')!.getBoundingClientRect();
          const tab = document.querySelector('#tab-contacto')!.getBoundingClientRect();
          const fade = parseFloat(getComputedStyle(document.documentElement).fontSize); // 1rem
          return { left: tab.left - row.left, right: row.right - fade - tab.right };
        });
        expect(room.left, 'starts inside the row').toBeGreaterThanOrEqual(0);
        expect(room.right, 'ends before the fade').toBeGreaterThanOrEqual(0);
      });
    }
  }
});

test.describe('video', () => {
  test('only the active card and its neighbours fetch their clip', async ({ page }) => {
    await withRealIntroMedia(page);
    await page.goto('/');
    const intro = page.locator('#inicio video source').first();
    await expect(intro).toHaveAttribute('src', '/media/intro/saludo.webm');
    await expect(page.locator('#inicio video')).not.toHaveAttribute('autoplay', /.*/);

    await page.goto('/precios/');
    await expect(page.locator('#inicio video source').first()).not.toHaveAttribute('src', /.*/);
  });

  test('has a pause/play button with a name', async ({ page }) => {
    await asIfIntroVideoExisted(page);
    await page.goto('/');
    await expect(page.locator('#inicio').getByRole('button', { name: /video/ })).toBeVisible();
    await expect(page.locator('#inicio').getByRole('button', { name: 'Activar el sonido' })).toBeVisible();
  });
});

/**
 * A home page with four more clip cards after the intro, cloned from its
 * markup with unique ids, paths and media URLs (each served the fixture WebM
 * and captions), so resource handling can be watched across several real
 * clips. Returns the media requests seen per clip.
 */
async function withManyClips(page: Page) {
  await withRealIntroMedia(page);
  const requests = new Map<string, number>();
  await page.route('**/media/test/**', (route) => {
    const url = new URL(route.request().url()).pathname;
    const clip = url.match(/clip-\d/)?.[0] ?? url;
    requests.set(clip, (requests.get(clip) ?? 0) + 1);
    return url.endsWith('.vtt')
      ? route.fulfill({ path: 'e2e/fixtures/clip.vtt', contentType: 'text/vtt' })
      : route.fulfill({ path: 'e2e/fixtures/clip.webm', contentType: 'video/webm' });
  });
  await page.route(/\/$/, async (route) => {
    const response = await route.fetch();
    const html = withoutPendingClips(await response.text());
    const start = html.indexOf('<li class="card is-start" id="inicio"');
    const end = html.indexOf('<li class="card', start + 10);
    const intro = html.slice(start, end).replace('card is-start', 'card');
    const clones = [1, 2, 3, 4]
      .map((n) =>
        intro
          .replaceAll('id="inicio"', `id="clip-${n}"`)
          .replaceAll('h-inicio', `h-clip-${n}`)
          .replace('data-path="/"', `data-path="/clip-${n}/"`)
          .replace('data-alt-path="/en/"', `data-alt-path="/en/clip-${n}/"`)
          .replaceAll('/media/intro/saludo', `/media/test/clip-${n}`),
      )
      .join('');
    await route.fulfill({ response, body: html.slice(0, end) + clones + html.slice(end) });
  });
  return requests;
}

/** Which clips hold sources, and which are playing. */
const clipState = (page: Page) =>
  page.evaluate(() => {
    const held: string[] = [];
    const playing: string[] = [];
    for (const card of document.querySelectorAll<HTMLElement>('.feed > .card')) {
      const video = card.querySelector<HTMLVideoElement>(':scope > article > .intro > [data-clip] video');
      if (!video) continue;
      if ([...video.querySelectorAll('source')].some((s) => s.hasAttribute('src'))) held.push(card.id);
      if (!video.paused) playing.push(card.id);
    }
    return { held, playing };
  });

test.describe('video window', () => {
  test('only the card on screen and its neighbours hold a clip; only it plays; choices survive', async ({ page }) => {
    const requests = await withManyClips(page);
    await page.goto('/');
    await expectAligned(page, 'inicio');
    await expect.poll(() => clipState(page)).toEqual({ held: ['inicio', 'clip-1'], playing: ['inicio'] });

    // Rapid moves: three cards down.
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowDown');
    await expectAligned(page, 'clip-3');
    await expect.poll(() => clipState(page)).toEqual({ held: ['clip-2', 'clip-3', 'clip-4'], playing: ['clip-3'] });

    // Choices on clip-3: sound on, captions off, then pause by hand. (Sound
    // comes first: turning the sound on starts a paused clip, on purpose.)
    const clip3 = page.locator('#clip-3');
    await clip3.getByRole('button', { name: 'Activar el sonido' }).click();
    await clip3.getByRole('button', { name: 'Subtítulos' }).click();
    await clip3.getByRole('button', { name: 'Pausar el video' }).click();
    await expect.poll(() => clipState(page).then((s) => s.playing)).toEqual([]);

    // Far away and back, fast: End, Home, End.
    await page.keyboard.press('End');
    await page.keyboard.press('Home');
    await page.keyboard.press('End');
    await expectAligned(page, 'fin');
    await expect.poll(() => clipState(page)).toEqual({ held: [], playing: [] });
    const clip1Requests = requests.get('clip-1') ?? 0;
    await page.waitForTimeout(500);
    expect(requests.get('clip-1') ?? 0, 'an unloaded clip fetches nothing more').toBe(clip1Requests);

    // Back to clip-3: reloaded, still paused, still unmuted, captions still off.
    await page.evaluate(() => document.getElementById('clip-3')!.scrollIntoView({ behavior: 'instant' }));
    await expectAligned(page, 'clip-3');
    await expect.poll(() => clipState(page)).toEqual({ held: ['clip-2', 'clip-3', 'clip-4'], playing: [] });
    expect(await clip3.locator('video').evaluate((v: HTMLVideoElement) => v.muted)).toBe(false);
    await expect(clip3.getByRole('button', { name: 'Subtítulos' })).toHaveAttribute('aria-pressed', 'false');
    await expect
      .poll(() => clip3.locator('video').evaluate((v: HTMLVideoElement) => [...v.textTracks].map((t) => t.mode)))
      .toEqual(['hidden']);
    await expect(clip3.locator('[data-clip-error-text]')).toHaveText('');
  });
});

test.describe('video window: stale results', () => {
  test('a late failure from an earlier load never marks the reloaded clip as failed', async ({ page }) => {
    await withManyClips(page);
    // clip-1's first play() only settles 1.5s later, as a failure ("no playable
    // source") — by then that load has been unloaded and a new one is playing.
    await page.addInitScript(() => {
      const realPlay = HTMLMediaElement.prototype.play;
      let first = true;
      HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
        if (first && this.closest('#clip-1')) {
          first = false;
          return new Promise<void>((_, reject) =>
            setTimeout(() => reject(new DOMException('late', 'NotSupportedError')), 1500),
          );
        }
        return realPlay.call(this);
      };
    });
    await page.goto('/');
    await page.keyboard.press('ArrowDown');
    await expectAligned(page, 'clip-1'); // autoplay: the slow, failing play()
    await page.keyboard.press('End'); // clip-1 unloaded
    await expectAligned(page, 'fin');
    await page.keyboard.press('Home');
    await expectAligned(page, 'inicio');
    await page.keyboard.press('ArrowDown'); // clip-1 loaded and played again
    await expectAligned(page, 'clip-1');
    await page.waitForTimeout(1800); // the stale rejection has arrived
    const clip1 = page.locator('#clip-1');
    await expect(clip1.locator('.clip')).not.toHaveClass(/is-error/);
    await expect(clip1.locator('[data-clip-error-text]')).toHaveText('');
    await expect.poll(() => clipState(page).then((s) => s.playing)).toEqual(['clip-1']);
  });
});

test.describe('a draft without the intro video', () => {
  test('the first screen shows the picture and words: no error, no video buttons, no transcript, no video fetched', async ({
    page,
    request,
  }) => {
    const gaps = (await (await request.get('/draft-missing.json')).json()) as { missing: string[] };
    test.skip(!gaps.missing.includes('/media/intro/saludo.webm'), 'this build has the intro video');
    const videoRequests: string[] = [];
    page.on('request', (r) => {
      if (/\/media\/intro\/.*\.(webm|mp4)$/.test(r.url())) videoRequests.push(r.url());
    });
    await page.goto('/');
    const intro = page.locator('#inicio');
    await expect(intro.locator('[data-clip]')).toHaveAttribute('data-clip-pending', '');
    await expect(intro.locator('h2')).toBeVisible();
    await expect(intro.getByRole('link', { name: 'Ver precios' })).toBeVisible();
    await page.waitForTimeout(500);
    await expect(intro.locator('.clip-controls')).toBeHidden();
    await expect(intro.locator('.clip-error')).toBeHidden();
    await expect(intro.locator('[data-clip-error-text]')).toHaveText('');
    await expect(intro.locator('.transcript')).toBeHidden();
    expect(videoRequests).toEqual([]);
  });
});

test.describe('intro clip', () => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 360, height: 640 },
  ]) {
    test(`fills the whole intro card, with its controls at the top, at ${viewport.width}×${viewport.height}`, async ({ page }) => {
      await asIfIntroVideoExisted(page);
      await page.setViewportSize(viewport);
      await page.goto('/');
      const slot = (await page.locator('#inicio').boundingBox())!;
      const card = (await page.locator('#inicio .intro').boundingBox())!;
      expect(Math.abs(card.y - slot.y), 'the intro starts at the top of its card').toBeLessThanOrEqual(1);
      expect(card.height).toBeGreaterThan(slot.height - 2);
      // The clip's own box steps aside; its poster and video are the layers that fill the card.
      for (const layer of ['.clip-poster', '.clip-video']) {
        const box = (await page.locator(`#inicio ${layer}`).boundingBox())!;
        expect(box.height, layer).toBeGreaterThan(card.height - 2);
        expect(box.width, layer).toBeGreaterThan(card.width - 2);
      }
      const controls = (await page.locator('#inicio .clip-controls').boundingBox())!;
      expect(controls.y - card.y).toBeLessThan(24);
    });
  }
});

test.describe('captions and transcript', () => {
  test('a spoken clip has a captions toggle and a visible transcript', async ({ page }) => {
    await withRealIntroMedia(page);
    await page.goto('/');
    const intro = page.locator('#inicio');
    const cc = intro.getByRole('button', { name: 'Subtítulos' });
    await expect(cc).toHaveAttribute('aria-pressed', 'true');
    await expect(intro.locator('track[kind="captions"]')).toHaveAttribute('label', 'Español');
    await cc.click();
    await expect(cc).toHaveAttribute('aria-pressed', 'false');

    const transcript = intro.getByText('Leer lo que dice el video');
    await expect(transcript).toBeVisible();
    await expect(intro.getByText(/Hola, soy Alexis/)).toBeHidden();
    await transcript.click();
    await expect(intro.getByText(/Hola, soy Alexis/)).toBeVisible();
  });
});


test.describe('playback', () => {
  test('the active card’s clip really plays, with its captions', async ({ page }) => {
    await withRealIntroMedia(page);
    await page.goto('/');
    await expect.poll(() => introVideo(page).evaluate((v: HTMLVideoElement) => v.currentTime), { timeout: 10_000 }).toBeGreaterThan(0.5);
    await expect(page.locator('#inicio .clip')).toHaveClass(/is-playing/);
    await expect
      .poll(() => introVideo(page).evaluate((v: HTMLVideoElement) => v.textTracks[0]?.cues?.length ?? 0))
      .toBeGreaterThan(0);
    await expect(page.locator('#inicio [data-clip-error-text]')).toHaveText('');
  });

  test('nothing autoplays when the visitor prefers reduced motion', async ({ page }) => {
    await withRealIntroMedia(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.locator('#inicio video source').first()).toHaveAttribute('src', /.+/);
    await page.waitForTimeout(800);
    expect(await introVideo(page).evaluate((v: HTMLVideoElement) => [v.paused, v.currentTime])).toEqual([true, 0]);
    // The play button still works.
    await page.locator('#inicio').getByRole('button', { name: 'Reproducir el video' }).click();
    await expect.poll(() => introVideo(page).evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0.3);
  });

  test('a missing video says so, disables its controls and offers a retry', async ({ page }) => {
    // Served as if the video existed, while the draft really has none: both
    // files 404 (declared in /draft-missing.json).
    await asIfIntroVideoExisted(page);
    await page.goto('/');
    const intro = page.locator('#inicio');
    await expect(intro.getByRole('status')).toHaveText('El video no está disponible ahora.');
    await expect(intro.getByRole('button', { name: /video/ })).toBeDisabled();
    await expect(intro.getByRole('button', { name: 'Activar el sonido' })).toBeDisabled();
    const retry = intro.getByRole('button', { name: 'Reintentar' });
    await expect(retry).toBeVisible();
    await retry.click();
    // Still missing: back to the same honest state, not a silent spinner.
    await expect(intro.getByRole('status')).toHaveText('El video no está disponible ahora.');
  });

  test('blocked autoplay is not an error: the clip waits with its play button', async ({ page }) => {
    await withRealIntroMedia(page);
    await page.addInitScript(() => {
      HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException('blocked', 'NotAllowedError'));
    });
    await page.goto('/');
    await page.waitForTimeout(800);
    const intro = page.locator('#inicio');
    await expect(intro.locator('[data-clip-error-text]')).toHaveText('');
    await expect(intro.getByRole('button', { name: 'Reintentar' })).toBeHidden();
    await expect(intro.getByRole('button', { name: 'Reproducir el video' })).toBeEnabled();
    await expect(intro.locator('.clip')).not.toHaveClass(/is-error/);
  });
});

test.describe('project card', () => {
  test('the before/after slider moves with the keyboard', async ({ page }) => {
    await page.goto('/el-break/');
    const range = page.getByRole('slider', { name: 'El sitio de El Break Food Truck, antes y después' });
    await range.focus();
    for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
    await expect(range).toHaveValue('55');
    const pos = await page.locator('#el-break .card-body > .compare .compare-frame').evaluate((el) => el.style.getPropertyValue('--pos'));
    expect(pos).toBe('55%');
    // The feed did not move: arrow keys belong to the slider here.
    await expect(page).toHaveURL(/\/el-break\/$/);
  });

  test('the demo loads the live site only when opened, and unloads it on close', async ({ page }) => {
    await page.route(`${LIVE_DEMO}/**`, (route) =>
      route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>demo</title><p>live site</p>' }),
    );
    await page.goto('/consejeria-escolar/');
    const iframe = page.locator('#demo-consejeria-escolar iframe');
    await expect(iframe).not.toHaveAttribute('src', /.*/);

    await page.getByRole('button', { name: /Probar el sitio de Consejería Escolar/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Consejería Escolar' });
    await expect(dialog).toBeVisible();
    await expect(iframe).toHaveAttribute('src', LIVE_DEMO);
    await expect(iframe).toHaveAttribute('sandbox', /allow-scripts/);
    await expect(iframe).not.toHaveAttribute('sandbox', /allow-top-navigation/);

    await dialog.getByRole('button', { name: /Computadora/ }).click();
    await expect(dialog.getByRole('button', { name: /Computadora/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(iframe).toHaveAttribute('width', '1280');
    const scale = await iframe.evaluate((el) => el.style.transform);
    expect(scale).toMatch(/^scale\(0\.\d+\)$/);

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(iframe).toHaveAttribute('src', 'about:blank');
  });
});

test.describe('before/after, enlarged', () => {
  test('opens both shots whole in a dialog, with the same slider; closing returns to the button', async ({ page }) => {
    await page.goto('/el-break/');
    const open = page.getByRole('button', { name: 'Ver en grande: El Break Food Truck' });
    await expect(open).toHaveAttribute('aria-haspopup', 'dialog');
    await open.click();
    const dialog = page.getByRole('dialog', { name: 'El Break Food Truck: antes y después' });
    await expect(dialog).toBeVisible();

    // Both shots load and show whole: contained, not cropped, inside the frame.
    const frame = dialog.locator('.compare-frame');
    for (const img of await frame.locator('img').all()) {
      await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
      expect(await img.evaluate((i) => getComputedStyle(i).objectFit)).toBe('contain');
    }
    const [box, card] = [await frame.boundingBox(), await page.locator('#el-break .card-body > .compare .compare-frame').boundingBox()];
    expect(box!.height, 'larger than in the card').toBeGreaterThan(card!.height);

    // The same slider, by keyboard.
    const range = dialog.getByRole('slider', { name: 'El sitio de El Break Food Truck, antes y después' });
    await range.focus();
    for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
    await expect(range).toHaveValue('55');
    expect(await frame.evaluate((el) => (el as HTMLElement).style.getPropertyValue('--pos'))).toBe('55%');

    const axe = await new AxeBuilder({ page }).include('#zoom-el-break').analyze();
    expect(axe.violations.map((v) => v.id)).toEqual([]);

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(open).toBeFocused();
    await expect(page).toHaveURL(/\/el-break\/$/);
  });

  test('a project with no old site opens its new site large', async ({ page }) => {
    await page.goto('/en/consejeria-escolar/');
    await page.getByRole('button', { name: 'See it larger: Consejería Escolar' }).click();
    const dialog = page.getByRole('dialog', { name: /: the new site$/ });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('slider')).toHaveCount(0);
    await expect.poll(() => dialog.locator('img').evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
    // Full screen on a phone, so no backdrop to tap: its close button.
    await dialog.getByRole('button', { name: 'Close' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('button', { name: 'See it larger: Consejería Escolar' })).toBeFocused();
  });
});

test.describe('projects without an old site', () => {
  test('show the new site alone, with no slider', async ({ page }) => {
    await page.goto('/melanie-creations/');
    const card = page.locator('#melanie-creations');
    await expect(card.getByRole('img', { name: /Melanie Creations en un teléfono/ })).toBeVisible();
    await expect(card.getByRole('slider')).toHaveCount(0);
    await expect(card.locator('.compare-note')).toHaveText('Antes sus trabajos estaban solo en Instagram y Facebook.');
    await expect(card.getByText('League City, Texas', { exact: false })).toBeVisible();
  });

  test('Melanie is not in "Local" — League City, Texas is outside the service area', async ({ page }) => {
    await page.goto('/?tab=local');
    expect(await visibleSlugs(page)).not.toContain('melanie-creations');
  });
});

test.describe('screenshots demo', () => {
  test('El Break refuses framing, so it is shown as screenshots of the real site', async ({ page }) => {
    await page.goto('/el-break/');
    const card = page.locator('#el-break');
    await expect(card.getByRole('link', { name: /Ver el sitio de El Break Food Truck/ })).toHaveAttribute(
      'href',
      'https://elbreak.vercel.app',
    );
    await card.getByRole('button', { name: /Ver el sitio de El Break Food Truck en teléfono/ }).click();
    const dialog = page.getByRole('dialog', { name: 'El Break Food Truck' });
    await expect(dialog.locator('iframe')).toHaveCount(0);
    await expect(dialog.getByRole('img', { name: /Abierto ahora/ })).toBeVisible();
    await dialog.getByRole('button', { name: /Tableta/ }).click();
    await expect(dialog.getByRole('img', { name: /En una tableta/ })).toBeVisible();
  });

  test('swaps real captures per device, with no iframe', async ({ page }) => {
    await page.goto('/melanie-creations/');
    await page.getByRole('button', { name: /Ver el sitio de Melanie Creations en teléfono/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Melanie Creations' });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('iframe')).toHaveCount(0);
    await expect(dialog.getByRole('img', { name: /En un teléfono/ })).toBeVisible();

    await dialog.getByRole('button', { name: /Computadora/ }).click();
    await expect(dialog.getByRole('img', { name: /En una computadora/ })).toBeVisible();
    await expect(dialog.getByRole('img', { name: /En un teléfono/ })).toBeHidden();
  });

  test('each capture fits whole inside the dialog', async ({ page }) => {
    await page.goto('/melanie-creations/');
    await page.getByRole('button', { name: /Ver el sitio de Melanie Creations en teléfono/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Melanie Creations' });
    const stage = dialog.locator('[data-demo-shots]');
    // The device buttons just name the device: no pixel widths for this audience.
    expect((await dialog.locator('.demo-device').allTextContents()).map((t) => t.trim())).toEqual([
      'Teléfono',
      'Tableta',
      'Computadora',
    ]);
    for (const [device, alt] of [
      ['Teléfono', /En un teléfono/],
      ['Tableta', /En una tableta/],
      ['Computadora', /En una computadora/],
    ] as const) {
      await dialog.getByRole('button', { name: new RegExp(device) }).click();
      const shot = dialog.getByRole('img', { name: alt });
      await expect(shot).toBeVisible();
      await expect(shot).toHaveJSProperty('complete', true);
      const [box, area] = [await shot.boundingBox(), await stage.boundingBox()];
      expect(box!.y + box!.height, device).toBeLessThanOrEqual(area!.y + area!.height + 0.5);
      expect(box!.x + box!.width, device).toBeLessThanOrEqual(area!.x + area!.width + 0.5);
    }
  });
});

test.describe('live demo of a real client site', () => {
  test('Consejería Escolar frames its own URL', async ({ page }) => {
    const url = 'https://consejeria-escolar.vercel.app';
    await page.route(`${url}/**`, (route) =>
      route.fulfill({ contentType: 'text/html; charset=utf-8', body: '<!doctype html><title>demo</title>' }),
    );
    await page.goto('/consejeria-escolar/');
    await page.getByRole('button', { name: /Probar el sitio de Consejería Escolar/ }).click();
    await expect(page.locator('#demo-consejeria-escolar iframe')).toHaveAttribute('src', url);
  });

  test('a visible switch trades the frame for screenshots, and back', async ({ page }) => {
    const url = 'https://consejeria-escolar.vercel.app';
    let loads = 0;
    await page.route(`${url}/**`, (route) => {
      loads += 1;
      return route.fulfill({ contentType: 'text/html; charset=utf-8', body: '<!doctype html><title>demo</title>' });
    });
    await page.goto('/consejeria-escolar/');
    await page.getByRole('button', { name: /Probar el sitio de Consejería Escolar/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Consejería Escolar' });
    const iframe = dialog.locator('iframe');
    const live = dialog.getByRole('button', { name: 'En vivo' });
    const shots = dialog.getByRole('button', { name: 'Capturas' });
    const phoneShot = dialog.getByRole('img', { name: /^En un teléfono/ });

    await expect(iframe).toHaveAttribute('src', url);
    await expect(live).toHaveAttribute('aria-pressed', 'true');
    await expect(dialog.getByText('¿No carga? Mira las capturas.')).toBeVisible();
    await expect(phoneShot).toBeHidden();
    await expect.poll(() => loads).toBe(1);

    // Screenshots: the site is unloaded, the capture for the chosen size shows.
    await shots.click();
    await expect(shots).toHaveAttribute('aria-pressed', 'true');
    await expect(live).toHaveAttribute('aria-pressed', 'false');
    await expect(iframe).toHaveAttribute('src', 'about:blank');
    await expect(iframe).toBeHidden();
    await expect(phoneShot).toBeVisible();

    // The device buttons drive the screenshots too.
    await dialog.getByRole('button', { name: /Tableta/ }).click();
    await expect(dialog.getByRole('img', { name: /^En una tableta/ })).toBeVisible();
    await expect(phoneShot).toBeHidden();

    // The choice sticks across closing and reopening, without loading the site.
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: /Probar el sitio de Consejería Escolar/ }).click();
    await expect(shots).toHaveAttribute('aria-pressed', 'true');
    await expect(iframe).toHaveAttribute('src', 'about:blank');

    // Back to live: the site loads again, at the size chosen meanwhile.
    await live.click();
    await expect(iframe).toBeVisible();
    await expect(iframe).toHaveAttribute('src', url);
    await expect(iframe).toHaveAttribute('width', '820');
    expect(await iframe.evaluate((el) => el.style.transform)).toMatch(/^scale\(0\.\d+\)$/);
    await expect.poll(() => loads).toBe(2);
  });
});

test.describe('language', () => {
  test('the English page mirrors the Spanish one', async ({ page }) => {
    await page.goto('/en/el-break/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('tab', { name: 'For you' })).toBeVisible();
    await expect(page.locator('[data-lang-link]')).toHaveAttribute('href', '/el-break/');
    await expect(page.locator('link[hreflang="x-default"]')).toHaveAttribute('href', /\/$/);
  });
});

test.describe('accessibility', () => {
  test('no axe violations on the home page', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length} × ${v.help}`)).toEqual([]);
  });

  test('every card is a labelled article with an h2', async ({ page }) => {
    await page.goto('/');
    const cards = page.locator('.feed > .card');
    for (const card of await cards.all()) {
      await expect(card.locator('> article h2')).toHaveCount(1);
      const label = await card.locator('> article').getAttribute('aria-labelledby');
      await expect(page.locator(`#${label}`)).toHaveCount(1);
    }
  });
});

test.describe('desktop', () => {
  test.skip(({ isMobile }) => isMobile, 'arrows are a desktop control');

  test('the arrows step through the feed', async ({ page }) => {
    await page.goto('/');
    const up = page.getByRole('button', { name: 'Anterior' });
    const down = page.getByRole('button', { name: 'Siguiente' });
    await expect(up).toBeDisabled();
    await down.click();
    await expect(page).toHaveURL(/\/el-break\/$/);
    await expect(up).toBeEnabled();
  });

  test('the arrows read through cards taller than the window, then stop at the end', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1280, height: 600 });
    await page.goto('/');
    await enlargeText(page, '150%');
    await settle(page);
    await tagControls(page);
    const down = page.getByRole('button', { name: 'Siguiente' });
    const run = await readThrough(page, () => down.click(), () => atBottom(page));
    expect(run.unseen).toEqual([]);
    expect(run.path).toEqual(PARA_TI_PATHS);
    expect(run.strayAnnouncements).toEqual([]);
    await expect(down).toBeDisabled();
  });
});

test.describe('security headers', () => {
  test('pages are served with a strict CSP that the page itself does not violate', async ({ page }) => {
    const response = await page.goto('/el-break/?tab=local');
    const csp = response?.headers()['content-security-policy'] ?? '';
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toContain('unsafe-inline');
    // Only the sites shown live may be framed; Melanie's and El Break's refuse
    // framing and are shown as screenshots.
    expect(csp).toMatch(/frame-src [^;]*https:\/\/consejeria-escolar\.vercel\.app/);
    expect(csp).not.toContain('melaniecreations.net');
    expect(csp).not.toContain('elbreak');
    // The inline tab script and start script ran under the policy:
    await expect(page.locator('html')).toHaveAttribute('data-tab', 'local');
    expect(await visibleSlugs(page)).toEqual(['el-break', 'consejeria-escolar', 'fin']);
  });
});

test.describe('404', () => {
  test('unknown paths get the bilingual not-found page', async ({ page, guard }) => {
    guard.allow('/no-existe/');
    const response = await page.goto('/no-existe/');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'Esta página no existe' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'This page does not exist' })).toBeVisible();
  });
});
