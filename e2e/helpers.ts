import type { Page } from '@playwright/test';
import { expect } from './fixtures';

/**
 * Helpers shared by the feed and swipe specs. They measure against whatever
 * element actually scrolls the feed — the feed list in this build, the
 * document in older builds — so the same tests can be run against an old
 * build and fail there on geometry, not on a missing selector.
 */

declare global {
  interface Window {
    /** The element that scrolls the feed. */
    __feedScroller(): HTMLElement;
    /** The part of the window the cards show in, in viewport coordinates. */
    __feedView(): { top: number; bottom: number };
  }
}

/** The "Para ti" feed, in order. */
export const PARA_TI = [
  'inicio',
  'el-break',
  'consejeria-escolar',
  'melanie-creations',
  'precios',
  'que-incluye',
  'que-mas-incluye',
  'sobre-mi',
  'contacto',
  'fin',
];
export const PARA_TI_PATHS = PARA_TI.map((slug) => (slug === 'inicio' ? '/' : `/${slug}/`));

/** Call before page.goto: defines window.__feedScroller and window.__feedView. */
export const installFeedHelpers = (page: Page) =>
  page.addInitScript(() => {
    window.__feedScroller = () => {
      const feed = document.querySelector<HTMLElement>('.feed');
      return feed && /auto|scroll/.test(getComputedStyle(feed).overflowY)
        ? feed
        : (document.scrollingElement as HTMLElement);
    };
    window.__feedView = () => {
      const scroller = window.__feedScroller();
      if (scroller !== document.scrollingElement) {
        const top = scroller.getBoundingClientRect().top;
        return { top, bottom: top + scroller.clientHeight };
      }
      return { top: document.querySelector('.topbar')!.getBoundingClientRect().bottom, bottom: innerHeight };
    };
  });

export const visibleSlugs = (page: Page) =>
  page.locator('.feed > .card').evaluateAll((cards) =>
    cards.filter((c) => getComputedStyle(c).display !== 'none').map((c) => c.id),
  );

/** Resolves once nothing in the feed has scrolled for several frames (and the observer has had a frame to react). */
export const settle = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const position = () =>
          window.__feedScroller().scrollTop +
          [...document.querySelectorAll<HTMLElement>('.card-body')].reduce((sum, body) => sum + body.scrollTop, 0);
        let last = position();
        let still = 0;
        const tick = () => {
          const now = position();
          still = now === last ? still + 1 : 0;
          last = now;
          if (still >= 8) resolve();
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
  );

/**
 * Like a larger default font in the browser's settings. (Via the CSSOM: the
 * CSP rightly blocks a <style> tag.) The bar grows with the text, so the feed
 * changes size and puts its card back: wait for that before going on.
 */
export async function enlargeText(page: Page, size: string) {
  await page.evaluate((s) => {
    document.documentElement.style.fontSize = s;
  }, size);
  await settle(page);
}

/** Turn snapping off, so a test can hold the feed at an exact in-between position. */
export const disableSnapping = (page: Page) =>
  page.evaluate(() => {
    window.__feedScroller().style.scrollSnapType = 'none';
    document.documentElement.style.scrollSnapType = 'none';
  });

/** The height a card gets: the feed's box. */
export const panelHeight = (page: Page) =>
  page.evaluate(() => {
    const view = window.__feedView();
    return view.bottom - view.top;
  });

/**
 * Where the feed rests: the shown cards whose top is within 2px of the feed's
 * top (`aligned`), and those partly on screen without being aligned
 * (`partial`). Settled means exactly one aligned and none partial.
 */
export const restingState = (page: Page) =>
  page.evaluate(() => {
    const view = window.__feedView();
    const aligned: string[] = [];
    const partial: string[] = [];
    for (const card of document.querySelectorAll<HTMLElement>('.feed > .card')) {
      if (getComputedStyle(card).display === 'none') continue;
      const r = card.getBoundingClientRect();
      const overlap = Math.min(r.bottom, view.bottom) - Math.max(r.top, view.top);
      if (Math.abs(r.top - view.top) <= 2) aligned.push(card.id);
      else if (overlap > 1) partial.push(card.id);
    }
    return { aligned, partial };
  });

/** Rule B: after settling, exactly one card fills the feed and no other is partly visible. */
export async function expectResting(page: Page, message = 'the feed at rest') {
  await settle(page);
  const state = await restingState(page);
  expect(state, message).toEqual({ aligned: [expect.any(String)], partial: [] });
  return state.aligned[0]!;
}

/**
 * `slug` is the card on screen: the feed starts right under the bar, the
 * card's top is within 2px of the feed's top, it is exactly the feed's height,
 * and neither neighbour is partly visible.
 */
export async function expectAligned(page: Page, slug: string) {
  await settle(page);
  const m = await page.evaluate((id) => {
    const view = window.__feedView();
    const shown = [...document.querySelectorAll<HTMLElement>('.feed > .card')].filter(
      (c) => getComputedStyle(c).display !== 'none',
    );
    const card = document.getElementById(id)!;
    const i = shown.indexOf(card);
    const r = card.getBoundingClientRect();
    const prev = shown[i - 1]?.getBoundingClientRect();
    const next = shown[i + 1]?.getBoundingClientRect();
    return {
      // The feed itself must start right under the bar, not slide beneath it.
      underBar: view.top - document.querySelector('.topbar')!.getBoundingClientRect().bottom,
      offset: r.top - view.top,
      height: r.height,
      feedHeight: view.bottom - view.top,
      prevBottom: prev ? prev.bottom - view.top : null,
      nextTop: next ? next.top - view.bottom : null,
    };
  }, slug);
  expect(Math.abs(m.underBar), `${slug}: the feed's top vs the bar's bottom`).toBeLessThanOrEqual(1);
  expect(Math.abs(m.offset), `${slug}: distance from the feed's top`).toBeLessThanOrEqual(2);
  expect(Math.abs(m.height - m.feedHeight), `${slug}: height vs the feed's`).toBeLessThanOrEqual(1);
  if (m.prevBottom !== null) expect(m.prevBottom, `${slug}: previous card still showing`).toBeLessThanOrEqual(1);
  if (m.nextTop !== null) expect(m.nextTop, `${slug}: next card already showing`).toBeGreaterThanOrEqual(-1);
}

/** Scroll the feed so the top of card `id` sits at `at` (0–1) of the way down it. */
export const placeCardTop = (page: Page, id: string, at: number) =>
  page.evaluate(
    ([id, at]) => {
      const view = window.__feedView();
      const target = view.top + (view.bottom - view.top) * at;
      const scroller = window.__feedScroller();
      scroller.scrollTop += document.getElementById(id)!.getBoundingClientRect().top - target;
    },
    [id, at] as const,
  );

/** Tag every control in the shown cards (outside dialogs and closed disclosures) with data-reach. */
export const tagControls = (page: Page) =>
  page.evaluate(() => {
    let n = 0;
    for (const card of document.querySelectorAll<HTMLElement>('.feed > .card')) {
      if (getComputedStyle(card).display === 'none') continue;
      const controls = card.querySelectorAll<HTMLElement>(
        'a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])',
      );
      for (const el of controls) {
        // The card's own <article> is focusable too, but it is the card, not a control in it.
        if (el.matches('.card-body') || el.closest('dialog') || !el.checkVisibility()) continue;
        el.dataset.reach = `${card.id}: ${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 40)} #${n++}`;
      }
    }
    return n;
  });

/** The tagged controls wholly inside the feed's visible area. */
export const fullyOnScreen = (page: Page) =>
  page.evaluate(() => {
    const { top, bottom } = window.__feedView();
    return [...document.querySelectorAll<HTMLElement>('[data-reach]')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.height > 0 && r.top >= top - 1 && r.bottom <= bottom + 1;
      })
      .map((el) => el.dataset.reach!);
  });

/** The feed is at its very end: last card, read to its bottom. */
export const atBottom = (page: Page) =>
  page.evaluate(() => {
    const s = window.__feedScroller();
    const shown = [...document.querySelectorAll<HTMLElement>('.feed > .card')].filter(
      (c) => getComputedStyle(c).display !== 'none',
    );
    const body = shown.at(-1)?.querySelector<HTMLElement>('.card-body');
    const bodyAtEnd = !body || body.scrollTop + body.clientHeight >= body.scrollHeight - 1;
    return s.scrollTop + s.clientHeight >= s.scrollHeight - 1 && bodyAtEnd;
  });

/** The feed is at its very start: first card, read from its top. */
export const atTop = (page: Page) =>
  page.evaluate(() => {
    const body = document.querySelector<HTMLElement>('.feed > .card .card-body');
    return window.__feedScroller().scrollTop <= 0 && (!body || body.scrollTop <= 0);
  });

/** Scroll the feed, and the last card's own box, to the very end. */
export const scrollToVeryEnd = (page: Page) =>
  page.evaluate(() => {
    const s = window.__feedScroller();
    s.scrollTop = s.scrollHeight;
    const shown = [...document.querySelectorAll<HTMLElement>('.feed > .card')].filter(
      (c) => getComputedStyle(c).display !== 'none',
    );
    const body = shown.at(-1)?.querySelector<HTMLElement>('.card-body');
    if (body) body.scrollTop = body.scrollHeight;
  });

/**
 * Press (or click) until `done`, and record what came on screen. Returns the
 * controls never seen, the order cards became active in, and every
 * announcement made while the card did NOT change (should be none).
 */
export async function readThrough(page: Page, press: () => Promise<void>, done: () => Promise<boolean>) {
  const all = new Set<string>(
    await page.locator('[data-reach]').evaluateAll((els) => els.map((el) => (el as HTMLElement).dataset.reach!)),
  );
  const seen = new Set<string>(await fullyOnScreen(page));
  const path = [new URL(page.url()).pathname];
  const strayAnnouncements: string[] = [];
  const status = page.locator('[data-feed-status]');
  for (let i = 0; i < 400 && !(await done()); i++) {
    const before = await status.textContent();
    await press();
    await settle(page);
    for (const id of await fullyOnScreen(page)) seen.add(id);
    const now = new URL(page.url()).pathname;
    if (now !== path.at(-1)) path.push(now);
    else if ((await status.textContent()) !== before) strayAnnouncements.push((await status.textContent()) ?? '');
  }
  return { unseen: [...all].filter((id) => !seen.has(id)), path, strayAnnouncements };
}

/** Serve a real WebM and caption file in place of the intro media the draft doesn't have yet. */
export async function withRealIntroMedia(page: Page) {
  await page.route('**/media/intro/saludo.webm', (route) =>
    route.fulfill({ path: 'e2e/fixtures/clip.webm', contentType: 'video/webm' }),
  );
  await page.route('**/media/intro/saludo.*.vtt', (route) =>
    route.fulfill({ path: 'e2e/fixtures/clip.vtt', contentType: 'text/vtt' }),
  );
}
