import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

/**
 * Behaviour of the built feed, against a draft build. Every test is guarded
 * (./fixtures.ts): any failed request or console error fails it, except the
 * exact files the draft declares missing in /draft-missing.json.
 */

const LIVE_DEMO = 'https://elbreak.example';

/** The "Para ti" feed, in order. */
const PARA_TI = [
  'inicio',
  'el-break',
  'consejeria-escolar',
  'melanie-creations',
  'precios',
  'que-incluye',
  'sobre-mi',
  'contacto',
  'fin',
];

const visibleSlugs = (page: Page) =>
  page.locator('.feed > .card').evaluateAll((cards) =>
    cards.filter((c) => getComputedStyle(c).display !== 'none').map((c) => c.id),
  );

/** Distance from the card's top to just under the sticky bar — ~0 means "this card is on screen". */
const offsetFromBar = (page: Page, slug: string) =>
  page.evaluate((id) => {
    const bar = document.querySelector('.topbar')!.getBoundingClientRect().bottom;
    return Math.round(document.getElementById(id)!.getBoundingClientRect().top - bar);
  }, slug);

/** Serve a real WebM and caption file in place of the intro media the draft doesn't have yet. */
async function withRealIntroMedia(page: Page) {
  await page.route('**/media/intro/saludo.webm', (route) =>
    route.fulfill({ path: 'e2e/fixtures/clip.webm', contentType: 'video/webm' }),
  );
  await page.route('**/media/intro/saludo.*.vtt', (route) =>
    route.fulfill({ path: 'e2e/fixtures/clip.vtt', contentType: 'text/vtt' }),
  );
}

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
    await expect.poll(() => offsetFromBar(page, 'el-break')).toBeLessThanOrEqual(2);
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
    await expect.poll(() => offsetFromBar(page, 'precios')).toBeLessThanOrEqual(2);
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
