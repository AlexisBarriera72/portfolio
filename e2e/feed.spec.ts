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
  panelHeight,
  placeCardTop,
  readThrough,
  scrollToVeryEnd,
  settle,
  tagControls,
  visibleSlugs,
  withRealIntroMedia,
} from './helpers';

/**
 * Behaviour of the built feed, against a draft build. Every test is guarded
 * (./fixtures.ts): any failed request or console error fails it, except the
 * exact files the draft declares missing in /draft-missing.json.
 */

const LIVE_DEMO = 'https://elbreak.example';

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
    await expect(page.locator('[data-feed-status]')).toHaveText('Tarjeta 2 de 10: El Break Food Truck');
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
    await sweep(page, 'precios', 'que-incluye');
  });
});

test.describe('one screen per card', () => {
  // A card must fit its panel at normal text size — no scrolling inside it.
  for (const viewport of [
    { width: 360, height: 640 },
    { width: 390, height: 844 },
  ]) {
    for (const path of ['/', '/en/']) {
      test(`every card fits at ${viewport.width}×${viewport.height} on ${path}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto(path);
        const panel = await panelHeight(page);
        const tooTall = await page.locator('.feed > .card').evaluateAll(
          (cards, panel) =>
            cards
              .filter((c) => getComputedStyle(c).display !== 'none')
              .map((c) => ({ id: c.id, need: c.querySelector<HTMLElement>('.card-body')!.scrollHeight }))
              .filter(({ need }) => need > panel + 1)
              .map(({ id, need }) => `${id} needs ${need}px of ${Math.round(panel)}px`),
          panel,
        );
        expect(tooTall).toEqual([]);
      });
    }
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

test.describe('tabs', () => {
  test('filter the feed, go into the URL, and Back undoes them', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: 'Precios' }).click();
    await expect(page).toHaveURL(/\/precios\/\?tab=precios$/);
    await expect(page.getByRole('tab', { name: 'Precios' })).toHaveAttribute('aria-selected', 'true');
    expect(await visibleSlugs(page)).toEqual(['precios', 'que-incluye', 'que-mas-incluye', 'fin']);
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
    await expect(page.getByRole('tab', { name: 'Local' })).toBeFocused();
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe('video', () => {
  test('only the active card and its neighbours fetch their clip', async ({ page }) => {
    await page.goto('/');
    const intro = page.locator('#inicio video source').first();
    await expect(intro).toHaveAttribute('src', '/media/intro/saludo.webm');
    await expect(page.locator('#inicio video')).not.toHaveAttribute('autoplay', /.*/);

    await page.goto('/precios/');
    await expect(page.locator('#inicio video source').first()).not.toHaveAttribute('src', /.*/);
  });

  test('has a pause/play button with a name', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#inicio').getByRole('button', { name: /video/ })).toBeVisible();
    await expect(page.locator('#inicio').getByRole('button', { name: 'Activar el sonido' })).toBeVisible();
  });
});

test.describe('intro clip', () => {
  test('fills the whole intro card, with its controls at the top', async ({ page }) => {
    await page.goto('/');
    const card = await page.locator('#inicio .intro').boundingBox();
    const clip = await page.locator('#inicio .intro-clip').boundingBox();
    const controls = await page.locator('#inicio .clip-controls').boundingBox();
    expect(clip!.height).toBeGreaterThan(card!.height - 2);
    expect(controls!.y - card!.y).toBeLessThan(24);
  });
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
    // The draft really has no intro video: both files 404 (declared in /draft-missing.json).
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
    const pos = await page.locator('#el-break .compare-frame').evaluate((el) => el.style.getPropertyValue('--pos'));
    expect(pos).toBe('55%');
    // The feed did not move: arrow keys belong to the slider here.
    await expect(page).toHaveURL(/\/el-break\/$/);
  });

  test('the demo loads the live site only when opened, and unloads it on close', async ({ page }) => {
    await page.route(`${LIVE_DEMO}/**`, (route) =>
      route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>demo</title><p>live site</p>' }),
    );
    await page.goto('/el-break/');
    const iframe = page.locator('#demo-el-break iframe');
    await expect(iframe).not.toHaveAttribute('src', /.*/);

    await page.getByRole('button', { name: /Probar el sitio de El Break/ }).click();
    const dialog = page.getByRole('dialog', { name: 'El Break Food Truck' });
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

test.describe('projects without an old site', () => {
  test('show the new site alone, with no slider', async ({ page }) => {
    await page.goto('/melanie-creations/');
    const card = page.locator('#melanie-creations');
    await expect(card.getByRole('img', { name: /Melanie Creations en un teléfono/ })).toBeVisible();
    await expect(card.getByRole('slider')).toHaveCount(0);
    await expect(card.getByText('Antes sus trabajos estaban solo en Instagram y Facebook.')).toBeVisible();
    await expect(card.getByText('League City, Texas', { exact: false })).toBeVisible();
  });

  test('Melanie is not in "Local" — League City, Texas is outside the service area', async ({ page }) => {
    await page.goto('/?tab=local');
    expect(await visibleSlugs(page)).not.toContain('melanie-creations');
  });
});

test.describe('screenshots demo', () => {
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
    // Only the sites shown live may be framed; Melanie's refuses framing and is shown as screenshots.
    expect(csp).toMatch(/frame-src [^;]*https:\/\/consejeria-escolar\.vercel\.app/);
    expect(csp).not.toContain('melaniecreations.net');
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
