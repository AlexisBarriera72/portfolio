import { appendFileSync } from 'node:fs';
import { expect, test, type APIRequestContext } from '@playwright/test';
import { isPlaceholder } from '../src/data/validate';

/**
 * Checks against a real deployment: no mocks, no routing, only what a
 * visitor actually gets. CI runs them right after each deploy
 * (.github/workflows/ci.yml):
 *
 *   DEPLOY_KIND=preview|production DEPLOY_URL=https://… npm run test:deployed
 *
 * - preview: the draft build. It must say so (noindex, robots "Disallow: /")
 *   and may lack exactly what its own /draft-missing.json lists: those media
 *   files, demo sites and share pictures, nothing else.
 * - production: the strict build. Nothing may be missing, fake or hidden from
 *   search engines, and every address it names is on the real domain.
 *
 * In production the pages must call DEPLOY_URL's origin their own (canonical,
 * og:url, og:image, sitemap). SITE_URL overrides that — only to check a copy
 * served elsewhere, e.g. under `wrangler dev`. A preview's pages name the
 * production domain, whatever it is; they are fetched from the preview.
 */

const KIND = process.env.DEPLOY_KIND;
const DEPLOY_URL = process.env.DEPLOY_URL;
if (KIND !== 'preview' && KIND !== 'production') throw new Error('Set DEPLOY_KIND to "preview" or "production".');
if (!DEPLOY_URL) throw new Error('Set DEPLOY_URL to the deployment to check.');
const PRODUCTION = KIND === 'production';
const HERE = new URL(DEPLOY_URL).origin;
const REAL_DOMAIN = new URL(process.env.SITE_URL || DEPLOY_URL).origin;
/** The origin the build calls its own, read from the home page's canonical link. */
let SITE = '';

/** What a draft declares missing (media paths, demo URLs, pages with no share image); none in production. */
let draft = { missing: [] as string[], placeholderDemos: [] as string[], noShareImage: [] as string[] };
/** Every page of the site: each card in both languages. */
let pages: string[] = [];

test.beforeAll(async ({ playwright }) => {
  const request = await playwright.request.newContext({ baseURL: HERE });
  // Production allows nothing, whatever the deployment claims.
  if (!PRODUCTION) {
    const manifest = await request.get('/draft-missing.json');
    expect(manifest.status(), 'a preview is a draft build and lists what it lacks').toBe(200);
    draft = await manifest.json();
  }
  const home = await (await request.get('/')).text();
  SITE = new URL(home.match(/<link rel="canonical" href="([^"]+)"/)?.[1] ?? HERE).origin;
  const paths = [...home.matchAll(/data-(?:alt-)?path="([^"]+)"/g)].map((m) => m[1]!);
  pages = [...new Set(['/', '/en/', ...paths])].sort();
  expect(pages.length, 'the home page lists its cards').toBeGreaterThan(4);
  await request.dispose();
});

/** A URL on this site as served here (absolute ones name the real domain). */
const served = (url: string) => {
  const u = new URL(url, HERE);
  return u.origin === SITE || u.origin === HERE ? `${HERE}${u.pathname}${u.search}` : u.href;
};

/** Attributes of every `<tag …>` in the HTML, as plain objects. */
function tags(html: string, name: string): Record<string, string>[] {
  return [...html.matchAll(new RegExp(`<${name}\\b([^>]*)>`, 'gi'))].map((m) =>
    Object.fromEntries([...m[1]!.matchAll(/([a-z:-]+)="([^"]*)"/gi)].map((a) => [a[1]!.toLowerCase(), a[2]!])),
  );
}

const EXPECTED_TYPE: Record<string, RegExp> = {
  avif: /^image\/avif/,
  webp: /^image\/webp/,
  jpg: /^image\/jpeg/,
  jpeg: /^image\/jpeg/,
  png: /^image\/png/,
  svg: /^image\/svg\+xml/,
  ico: /^image\//,
  webm: /^video\/webm/,
  mp4: /^video\/mp4/,
  vtt: /^text\/vtt/,
  css: /^text\/css/,
  js: /javascript/,
  woff2: /^font\/woff2/,
};

async function expectServed(request: APIRequestContext, url: string) {
  const response = await request.get(served(url));
  expect(response.status(), url).toBe(200);
  const ext = new URL(url, HERE).pathname.split('.').pop()?.toLowerCase() ?? '';
  const type = EXPECTED_TYPE[ext];
  if (type) expect(response.headers()['content-type'] ?? '', `content type of ${url}`).toMatch(type);
}

test('production is the strict build, on the real domain', async ({ request }) => {
  test.skip(!PRODUCTION, 'previews are draft builds');
  const manifest = await request.get('/draft-missing.json');
  expect(manifest.status(), 'a draft build (it publishes /draft-missing.json)').toBe(404);
  expect(SITE, 'the domain the build names as its own').toBe(REAL_DOMAIN);
});

test('every page is served, with the security headers', async ({ request }) => {
  for (const path of pages) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    const headers = response.headers();
    expect(headers['content-type'], path).toMatch(/^text\/html/);
    expect(headers['content-security-policy'], path).toContain("frame-ancestors 'none'");
    // The local test server leaves this one out (plain http); a real deployment must send it.
    expect(headers['content-security-policy'], path).toContain('upgrade-insecure-requests');
    expect(headers['x-content-type-options'], path).toBe('nosniff');
  }
  const missing = await request.get(`/no-existe-${Date.now()}/`);
  expect(missing.status()).toBe(404);
  expect(missing.headers()['content-type']).toMatch(/^text\/html/);
});

test('every page has its title, description, canonical and share image', async ({ request }) => {
  const images = new Set<string>();
  for (const path of pages) {
    const html = await (await request.get(path)).text();
    const meta = tags(html, 'meta');
    const links = tags(html, 'link');
    const metaContent = (key: string) => meta.find((m) => m.name === key || m.property === key)?.content ?? '';

    expect(html.match(/<title>([^<]*)<\/title>/)?.[1]?.trim(), `${path} title`).toBeTruthy();
    expect(metaContent('description').trim(), `${path} description`).not.toBe('');

    const canonical = links.find((l) => l.rel === 'canonical')?.href ?? '';
    const ogUrl = metaContent('og:url');
    const ogImage = metaContent('og:image');
    const absolute: [string, string][] = [
      ['canonical', canonical],
      ['og:url', ogUrl],
    ];
    // Only a draft may leave out a share picture, and only where it says so.
    if (ogImage || !draft.noShareImage.includes(path)) absolute.push(['og:image', ogImage]);
    for (const [label, url] of absolute) {
      expect(url, `${path} ${label}`).toMatch(/^https:\/\//);
      if (PRODUCTION) expect(new URL(url).origin, `${path} ${label} is on the real domain`).toBe(SITE);
    }
    expect(new URL(ogUrl).pathname, `${path} og:url is this page`).toBe(path);
    if (ogImage) images.add(ogImage);

    const noindex = /noindex/.test(metaContent('robots'));
    if (PRODUCTION) expect(noindex, `${path} must be indexable`).toBe(false);
    else expect(noindex, `${path} is a preview: must not be indexed`).toBe(true);

    if (PRODUCTION) expect(isPlaceholder(html), `${path} still has placeholder text`).toBe(false);
  }
  for (const image of images) {
    const response = await request.get(served(image));
    expect(response.status(), image).toBe(200);
    expect(response.headers()['content-type'], image).toMatch(/^image\/jpeg/);
  }
});

test('search engines: production is listed with a sitemap, a preview is kept out', async ({ request }) => {
  const robots = await request.get('/robots.txt');
  expect(robots.status()).toBe(200);
  const text = await robots.text();
  if (!PRODUCTION) {
    expect(text).toMatch(/^Disallow: \/$/m);
    return;
  }
  expect(text).not.toMatch(/^Disallow: \/$/m);
  expect(text).toContain(`Sitemap: ${SITE}/sitemap-index.xml`);
  const sitemap = await request.get('/sitemap-index.xml');
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).toContain(`${SITE}/`);
});

test('contact links are well formed, consistent and, in production, real', async ({ page }) => {
  await page.goto('/');
  const hrefs = await page.locator('a[href]').evaluateAll((els) => els.map((a) => a.getAttribute('href') ?? ''));

  const whatsapp = hrefs.filter((h) => h.startsWith('https://wa.me/'));
  expect(whatsapp.length, 'WhatsApp links').toBeGreaterThan(0);
  const numbers = new Set(whatsapp.map((h) => new URL(h).pathname.slice(1)));
  expect([...numbers], 'every WhatsApp link goes to the same number').toHaveLength(1);
  expect([...numbers][0]).toMatch(/^\d{10,15}$/);

  const phones = hrefs.filter((h) => h.startsWith('tel:'));
  for (const tel of phones) expect(tel).toMatch(/^tel:\+\d{10,15}$/);
  const emails = hrefs.filter((h) => h.startsWith('mailto:'));
  for (const mail of emails) expect(mail).toMatch(/^mailto:[^@\s?]+@[^@\s?]+\.[a-z]{2,}(\?.*)?$/i);

  if (PRODUCTION) {
    for (const href of [...whatsapp, ...phones, ...emails]) expect(isPlaceholder(href), href).toBe(false);
  }
});

test('every image, video, caption, style and script the pages use is served', async ({ page, request }) => {
  const urls = new Set<string>();
  for (const path of ['/', '/en/']) {
    await page.goto(path);
    const found = await page.evaluate(() => {
      const out: string[] = [];
      const add = (url: string | null | undefined) => {
        if (url) out.push(new URL(url, location.href).href);
      };
      const addSrcset = (srcset: string | null) => {
        for (const candidate of (srcset ?? '').split(',')) add(candidate.trim().split(/\s+/)[0]);
      };
      for (const img of document.querySelectorAll('img')) {
        add(img.getAttribute('src'));
        addSrcset(img.getAttribute('srcset'));
      }
      for (const source of document.querySelectorAll<HTMLSourceElement>('source')) {
        addSrcset(source.getAttribute('srcset'));
        add(source.dataset.src ?? source.getAttribute('src'));
      }
      for (const video of document.querySelectorAll('video')) add(video.getAttribute('poster'));
      for (const track of document.querySelectorAll('track')) add(track.getAttribute('src'));
      for (const script of document.querySelectorAll('script[src]')) add(script.getAttribute('src'));
      for (const link of document.querySelectorAll('link[href]')) {
        if (/\b(stylesheet|icon|preload|modulepreload|manifest|apple-touch-icon)\b/.test(link.getAttribute('rel') ?? '')) {
          add(link.getAttribute('href'));
        }
      }
      return out;
    });
    for (const url of found) if ([HERE, SITE].includes(new URL(url).origin)) urls.add(new URL(url).pathname);
  }
  expect(urls.size).toBeGreaterThan(10);
  const skipped = [...urls].filter((path) => draft.missing.includes(path));
  for (const path of urls) {
    if (skipped.includes(path)) continue;
    await expectServed(request, path);
  }
  // Every declared exception must really be referenced: a stale list hides nothing.
  expect(skipped.sort()).toEqual([...draft.missing].sort());
});

test('every live demo site answers and allows being framed here', async ({ page, request }) => {
  await page.goto('/');
  const demos = await page
    .locator('iframe[data-demo-src]')
    .evaluateAll((frames) => [...new Set(frames.map((f) => (f as HTMLIFrameElement).dataset.demoSrc!))]);
  for (const url of demos) {
    if (draft.placeholderDemos.includes(url)) continue;
    const response = await request.get(url, { maxRedirects: 5, timeout: 20_000 });
    expect(response.status(), url).toBeLessThan(400);
    const headers = response.headers();
    expect(headers['x-frame-options'], `${url} sends X-Frame-Options`).toBeUndefined();
    for (const [, sources] of (headers['content-security-policy'] ?? '').matchAll(/frame-ancestors([^;,]*)/gi)) {
      const list = sources!.trim().split(/\s+/);
      const allowed = list.some((s) => s === '*' || s === 'https:' || s.replace(/\/$/, '') === HERE);
      expect(allowed, `${url} frame-ancestors ${sources!.trim()} excludes ${HERE}`).toBe(true);
    }
  }
});

/** Each project card's own link to the client's site, and why its demo isn't live (if it isn't). */
const projectSites = (page: import('@playwright/test').Page) =>
  page.locator('.card-project').evaluateAll((cards) =>
    cards.map((card) => ({
      url: card.querySelector<HTMLAnchorElement>('.actions a.btn-primary')!.href,
      reason: card.querySelector<HTMLElement>('dialog[data-demo]')?.dataset.demoReason,
    })),
  );

test('every project links to a site that answers', async ({ page, request }) => {
  await page.goto('/');
  const sites = await projectSites(page);
  expect(sites.length).toBeGreaterThan(0);
  for (const { url } of sites) {
    if (draft.placeholderDemos.includes(new URL(url).origin)) continue;
    const response = await request.get(url, { maxRedirects: 5, timeout: 20_000 });
    expect(response.status(), url).toBeLessThan(400);
  }
});

test('each screenshots or recorded demo opens and shows its content', async ({ page }) => {
  // Live demos are checked by the framing tests above and below.
  await page.goto('/');
  for (const opener of await page.locator('[data-demo-open]').all()) {
    const dialog = page.locator(`#${await opener.getAttribute('data-demo-open')}`);
    if ((await dialog.locator('iframe[data-demo-src]').count()) > 0) continue;
    const name = (await dialog.locator('.demo-title').textContent())!.trim();
    await opener.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await opener.click();
    await expect(dialog, name).toBeVisible();

    if ((await dialog.locator('[data-demo-shots]').count()) > 0) {
      // Every device's capture, as the visitor switches to it, really loads.
      for (const device of await dialog.locator('.demo-device').all()) {
        await device.click();
        const shot = dialog.locator(`.demo-shot[data-device="${await device.getAttribute('data-device')}"]`);
        await expect(shot, `${name}: ${await device.getAttribute('data-device')}`).toBeVisible();
        // A placeholder instead of a capture only happens in a draft, for a file
        // it declares missing; "every image … is served" holds it to that.
        if ((await shot.locator('img').count()) === 0) continue;
        await expect
          .poll(() => shot.locator('img').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0), {
            message: `${name}: the ${await device.getAttribute('data-device')} capture loads`,
            timeout: 15_000,
          })
          .toBe(true);
      }
    } else {
      // A screen recording: its video gets far enough to know what it is.
      await expect
        .poll(() => dialog.locator('video').evaluate((v: HTMLVideoElement) => v.readyState), {
          message: `${name}: the recording loads`,
          timeout: 20_000,
        })
        .toBeGreaterThan(0);
    }
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  }
});

test('a site shown as screenshots because it refuses framing: a change is reported, not failed', async ({
  page,
  request,
}) => {
  // A client site that starts allowing framing breaks nothing here — the
  // screenshots still work — but the demo could now be live. Say so, in the
  // test's annotations and the CI job's summary, without failing the deploy.
  await page.goto('/');
  const notices: string[] = [];
  for (const { url, reason } of await projectSites(page)) {
    if (reason !== 'x-frame-options' && reason !== 'frame-ancestors') continue;
    const response = await request.get(url, { maxRedirects: 5, timeout: 20_000 }).catch(() => undefined);
    // Whether the site answers at all is "every project links to a site that answers".
    if (!response || response.status() >= 400) continue;
    const headers = response.headers();
    const ancestors = [...(headers['content-security-policy'] ?? '').matchAll(/frame-ancestors([^;,]*)/gi)].map((m) =>
      m[1]!.trim(),
    );
    const refuses =
      /deny|sameorigin/i.test(headers['x-frame-options'] ?? '') ||
      ancestors.some((list) => !list.split(/\s+/).some((s) => s === '*' || s === 'https:' || s.replace(/\/$/, '') === HERE));
    if (!refuses) notices.push(`${url} no longer refuses to be framed (${reason}): its demo could be live again.`);
  }
  for (const description of notices) test.info().annotations.push({ type: 'notice', description });
  if (notices.length && process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n### Demo notices\n\n${notices.map((n) => `- ${n}`).join('\n')}\n`);
  }
});

test('the browser shows each live demo without refusing the frame', async ({ page }) => {
  const refusals: string[] = [];
  page.on('console', (msg) => {
    if (/Refused to (display|frame)/i.test(msg.text())) refusals.push(msg.text());
  });
  await page.goto('/');
  const openers = page.locator('[data-demo-open]');
  for (const opener of await openers.all()) {
    const dialog = page.locator(`#${await opener.getAttribute('data-demo-open')}`);
    const live = dialog.locator('iframe[data-demo-src]');
    if ((await live.count()) === 0) continue; // a screenshots or recorded demo
    const src = (await live.getAttribute('data-demo-src'))!;
    if (draft.placeholderDemos.includes(src)) continue;
    await opener.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await opener.click();
    const frame = dialog.locator('iframe');
    await expect(frame).toHaveAttribute('src', src);
    await page.waitForTimeout(4000);
    await page.keyboard.press('Escape');
  }
  expect(refusals).toEqual([]);
});

test('the intro video really plays, with its captions', async ({ page }) => {
  test.skip(
    draft.missing.some((path) => path.startsWith('/media/intro/')),
    'this draft has no intro video yet (listed in /draft-missing.json)',
  );
  await page.goto('/');
  const video = page.locator('#inicio video');
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime), { timeout: 20_000 }).toBeGreaterThan(0.5);
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.textTracks[0]?.cues?.length ?? 0), { timeout: 10_000 })
    .toBeGreaterThan(0);
});
