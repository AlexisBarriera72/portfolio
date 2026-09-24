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

/** Resolves after the next frame has been laid out (e.g. after a resize). */
export const nextFrame = (page: Page) =>
  page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));

/** The shown cards whose content is taller than the card, as "id +Npx". */
export const overflowing = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('.feed > .card')]
      .filter((card) => getComputedStyle(card).display !== 'none')
      .map((card) => {
        const body = card.querySelector<HTMLElement>('.card-body')!;
        return { id: card.id, over: body.scrollHeight - body.clientHeight };
      })
      .filter(({ over }) => over > 1)
      .map(({ id, over }) => `${id} +${over}px`),
  );

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

/**
 * What on card `id` a reader can't get to: each shown heading, paragraph, list
 * item, quote, caption, summary, link and button (dialogs aside) that can't be
 * scrolled wholly into view, or is cut off by an ancestor that clips, or is
 * covered by something else. The feed is put on the card, then the card's own
 * box is scrolled to each one — its top, and its bottom if it is taller than
 * the view — exactly as a reader scrolling inside the card would.
 */
export const unreachable = (page: Page, id: string) =>
  page.evaluate((id) => {
    const card = document.getElementById(id)!;
    const scroller = window.__feedScroller();
    scroller.scrollTo({ top: scroller.scrollTop + card.getBoundingClientRect().top - window.__feedView().top, behavior: 'instant' });
    const body = card.querySelector<HTMLElement>('.card-body')!;
    const view = window.__feedView();
    const problems: string[] = [];

    /** The part of the screen `el` can show in: the feed's view, cut down by the card and every clipping ancestor. */
    const region = (el: HTMLElement) => {
      let top = view.top;
      let bottom = view.bottom;
      for (let a = el.parentElement; a && a !== card.parentElement; a = a.parentElement) {
        const style = getComputedStyle(a);
        // No box of its own (display: contents), so nothing to clip with.
        if (style.display === 'contents' || (style.overflowY === 'visible' && style.overflowX === 'visible')) continue;
        const r = a.getBoundingClientRect();
        top = Math.max(top, r.top);
        bottom = Math.min(bottom, r.bottom);
      }
      return { top, bottom };
    };
    const scrollBodyBy = (dy: number) => body.scrollTo({ top: body.scrollTop + dy, behavior: 'instant' });
    /** Whether `e` puts anything on screen itself: a background, an image, or its own text. */
    const paints = (e: Element) => {
      if (e.matches('img, svg, video, iframe, canvas, input')) return true;
      const style = getComputedStyle(e);
      if (style.visibility === 'hidden' || style.opacity === '0') return false;
      if (style.backgroundImage !== 'none' || !/^(transparent|rgba\(0, 0, 0, 0\))$/.test(style.backgroundColor)) return true;
      return [...e.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim() !== '');
    };
    /** Nothing that paints is stacked above `el`, across the middle of the part of it that is showing. */
    const uncovered = (el: HTMLElement, top: number, bottom: number) => {
      const r = el.getBoundingClientRect();
      const y = (Math.max(r.top, top) + Math.min(r.bottom, bottom)) / 2;
      for (const f of [0.1, 0.3, 0.5, 0.7, 0.9]) {
        const x = r.left + r.width * f;
        if (x < 0 || x > innerWidth) continue;
        for (const hit of document.elementsFromPoint(x, y)) {
          if (hit === el || el.contains(hit) || hit.contains(el)) break; // reached it (or what holds it)
          if (paints(hit)) return false;
        }
      }
      return true;
    };

    // Hit-testing skips anything that takes no pointer events (a message laid
    // over the video, the text on a picture): count everything, for now.
    const sheet = document.styleSheets[0]!;
    const rule = sheet.insertRule('.feed * { pointer-events: auto !important; }', sheet.cssRules.length);

    const SELECTOR = 'h2, h3, h4, p, li, blockquote, figcaption, summary, a[href], button';
    for (const el of body.querySelectorAll<HTMLElement>(SELECTOR)) {
      if (el.closest('dialog, .sr-only') || !el.checkVisibility()) continue;
      const size = el.getBoundingClientRect();
      if (size.width < 1 || size.height < 1) continue;
      const name = `${id}: <${el.tagName.toLowerCase()}> "${(el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40)}"`;

      // Its top to the top of the space it can show in.
      scrollBodyBy(el.getBoundingClientRect().top - region(el).top);
      let r = el.getBoundingClientRect();
      let room = region(el);
      if (r.top < room.top - 1 || r.top > room.bottom - 1) {
        problems.push(`${name}: its top can't be brought into view (${Math.round(r.top - room.top)}px from it)`);
        continue;
      }
      if (r.height <= room.bottom - room.top + 1) {
        if (r.bottom > room.bottom + 1) problems.push(`${name}: cut off at the bottom by ${Math.round(r.bottom - room.bottom)}px`);
        else if (!uncovered(el, room.top, room.bottom)) problems.push(`${name}: covered by something else`);
        continue;
      }
      // Taller than the view: its bottom must be reachable too.
      scrollBodyBy(el.getBoundingClientRect().bottom - region(el).bottom);
      r = el.getBoundingClientRect();
      room = region(el);
      if (r.bottom > room.bottom + 1) problems.push(`${name}: its bottom can't be brought into view`);
    }
    sheet.deleteRule(rule);
    body.scrollTo({ top: 0, behavior: 'instant' });
    return problems;
  }, id);

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
