/**
 * The feed's behaviour. The markup and CSS already work without this.
 *
 * Scrolling: the feed list (`.feed`) is the page's only scroller. Every card
 * is exactly as tall as the list, and the list snaps to one card at a time
 * (`scroll-snap-type: y mandatory`). Nothing here intercepts touch or the
 * wheel — the browser keeps its own physics; it only has to come to rest on a
 * card. A card whose content is taller than its panel (enlarged text, a phone
 * on its side) scrolls inside itself; at normal text size none does.
 *
 * The script adds:
 *  - the active card: the one under the middle of the feed. Its page path
 *    goes into the address bar (replaceState — scrolling never adds history
 *    entries), its title into the tab, and the language link follows it;
 *  - video: only the active card and its neighbours hold their clip (every
 *    other clip is unloaded), and only the active one plays;
 *  - tabs: filter the feed, go into the URL (?tab=), and Back undoes them;
 *  - keyboard: ↑/↓, PageUp/PageDown and Space read through a card that
 *    scrolls inside itself before moving to the next one; Home/End jump to
 *    the ends;
 *  - the desktop arrows (like PageUp/PageDown), card-to-card links, and
 *    "start over";
 *  - after a resize (rotation, a toolbar), the same card stays on screen —
 *    or, in the middle of a jump, the card the jump is going to.
 */
import { DEFAULT_TAB, FEED_TABS, type FeedTab } from '../data/types';
import { format } from '../i18n/format';
import { autoplayClip, loadClip, pauseClip, unloadClip } from './clips';

const root = document.documentElement;
const feed = document.querySelector<HTMLElement>('.feed');

if (feed) init(feed);

function init(feed: HTMLElement): void {
  const cards = [...feed.querySelectorAll<HTMLLIElement>(':scope > .card')];
  const tabs = [...document.querySelectorAll<HTMLButtonElement>('.tabs [role="tab"]')];
  const panel = document.getElementById('feed');
  const langLink = document.querySelector<HTMLAnchorElement>('[data-lang-link]');
  const status = document.querySelector<HTMLElement>('[data-feed-status]');
  const prev = document.querySelector<HTMLButtonElement>('[data-feed-prev]');
  const next = document.querySelector<HTMLButtonElement>('[data-feed-next]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let active: HTMLLIElement | undefined;
  /**
   * The card a key, arrow or link is still scrolling to. The next press
   * continues from there, and a resize puts this card on screen, not the one
   * the scroll happened to be passing. It lasts until the card arrives, or
   * the reader takes over (a finger, the wheel, a click in the feed), or the
   * tab changes — not merely until some scroll ends.
   */
  let destination: HTMLElement | undefined;

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  /* ------------------------------------------------------------- helpers */

  const currentTab = (): FeedTab => {
    const tab = root.dataset.tab as FeedTab | undefined;
    return tab && FEED_TABS.includes(tab) ? tab : DEFAULT_TAB;
  };

  const inTab = (card: HTMLElement, tab: FeedTab = currentTab()) =>
    (card.dataset.tabs ?? '').split(' ').includes(tab);

  const visibleCards = () => cards.filter((card) => inTab(card));

  const tabSearch = (tab: FeedTab) => (tab === DEFAULT_TAB ? '' : `?tab=${tab}`);

  const behavior = (smooth: boolean): ScrollBehavior => (smooth && !reducedMotion.matches ? 'smooth' : 'instant');

  /** A card's own content box — it scrolls only when its content is taller than the card. */
  const bodyOf = (card: HTMLElement) => card.querySelector<HTMLElement>('.card-body')!;

  /** The feed's scroll position that puts `card` exactly in it. */
  const positionOf = (card: HTMLElement) =>
    feed.scrollTop + card.getBoundingClientRect().top - feed.getBoundingClientRect().top;

  /**
   * Bring a card into the feed. `end` (arriving from below) also shows the end
   * of a card whose content scrolls inside it, so reading upwards skips
   * nothing; otherwise the card is shown from its start.
   */
  const scrollToCard = (card: HTMLElement, smooth: boolean, edge: 'start' | 'end' = 'start') => {
    const body = bodyOf(card);
    body.scrollTop = edge === 'end' ? body.scrollHeight : 0;
    feed.scrollTo({ top: positionOf(card), behavior: behavior(smooth) });
  };

  /** Move to a card on purpose (keys, arrows, links): focus it and say where we are. */
  const goTo = (card: HTMLElement, edge: 'start' | 'end' = 'start') => {
    destination = card;
    scrollToCard(card, true, edge);
    bodyOf(card).focus({ preventScroll: true });
    const list = visibleCards();
    const heading = card.querySelector('h2')?.textContent?.trim() ?? '';
    if (status) {
      status.textContent = `${format(status.dataset.template ?? '', { index: list.indexOf(card as HTMLLIElement) + 1, total: list.length })}: ${heading}`;
    }
  };

  /** Slack, in px, for rounding when asking whether an edge is on screen. */
  const EDGE = 2;

  const CONTROLS = 'a[href], button, input, select, textarea, summary';

  /**
   * How far one press scrolls inside a card: a quarter of its height (`line`)
   * or 90% of it (`page`). A page step stops short where it would cut a
   * control in two — it brings that control's top edge (or bottom, going up)
   * to the edge instead — so no control is skipped half-seen.
   */
  const stepSize = (body: HTMLElement, direction: 1 | -1, size: 'line' | 'page') => {
    const { top, bottom } = body.getBoundingClientRect();
    const height = bottom - top;
    if (size === 'line') return height * 0.25;
    let amount = height * 0.9;
    for (const el of body.querySelectorAll<HTMLElement>(CONTROLS)) {
      if (el.closest('dialog')) continue;
      const r = el.getBoundingClientRect();
      if (r.height === 0 || r.height > height) continue;
      if (direction > 0 && r.top > top + EDGE && r.top < bottom && r.bottom > bottom) amount = Math.min(amount, r.top - top);
      if (direction < 0 && r.bottom < bottom - EDGE && r.bottom > top && r.top < top) amount = Math.min(amount, bottom - r.bottom);
    }
    return Math.max(amount, height * 0.25);
  };

  /**
   * One press of ↑/↓ (`line`), PageUp/PageDown, Space or a desktop arrow
   * (`page`). If the current card scrolls inside itself and has more in that
   * direction, scroll through it — never past its end. Otherwise move the
   * feed to the next card. Nothing is announced until the card changes.
   */
  const move = (direction: 1 | -1, size: 'line' | 'page') => {
    const list = visibleCards();
    // Pressed again before the last move arrived: continue from where it is going.
    if (destination && list.includes(destination as HTMLLIElement) && destination !== active) {
      const target = list[list.indexOf(destination as HTMLLIElement) + direction];
      if (target) goTo(target, direction > 0 ? 'start' : 'end');
      return;
    }
    const card = active && list.includes(active) ? active : undefined;
    if (card) {
      const body = bodyOf(card);
      const room = body.scrollHeight - body.clientHeight;
      const left = direction > 0 ? room - body.scrollTop : body.scrollTop;
      if (room > EDGE && left > EDGE) {
        const amount = Math.min(stepSize(body, direction, size), left);
        body.scrollTo({ top: body.scrollTop + direction * amount, behavior: behavior(true) });
        return;
      }
    }
    const from = card ? list.indexOf(card) : 0;
    const target = list[from + direction];
    if (target) goTo(target, direction > 0 ? 'start' : 'end');
  };

  /** The desktop arrows are off only at the very ends: first/last card, read to its edge. */
  const updateArrows = () => {
    const list = visibleCards();
    const i = active ? list.indexOf(active) : 0;
    const body = active ? bodyOf(active) : undefined;
    const atStart = !body || body.scrollTop <= EDGE;
    const atEnd = !body || body.scrollTop >= body.scrollHeight - body.clientHeight - EDGE;
    if (prev) prev.disabled = i <= 0 && atStart;
    if (next) next.disabled = i >= list.length - 1 && atEnd;
  };
  // `scrollend` doesn't bubble: listen in the capture phase for the feed and the cards.
  document.addEventListener('scrollend', updateArrows, true);

  // The reader taking over ends a jump: from then on the feed goes where they take it.
  for (const type of ['touchstart', 'wheel', 'pointerdown'] as const) {
    feed.addEventListener(
      type,
      () => {
        destination = undefined;
      },
      { passive: true },
    );
  }
  // A jump that stopped short of its card (the browser cut the scroll off —
  // a resize re-snapping the feed, say) carries on to it.
  feed.addEventListener('scrollend', () => {
    if (!destination || destination === active || !inTab(destination)) return;
    const top = positionOf(destination);
    if (Math.abs(feed.scrollTop - top) > EDGE) feed.scrollTo({ top, behavior: behavior(true) });
  });

  /* ------------------------------------------------------- active card */

  const activate = (card: HTMLLIElement) => {
    if (card === destination) destination = undefined;
    if (card === active) return;
    active = card;

    const url = `${card.dataset.path}${location.search}`;
    if (`${location.pathname}${location.search}` !== url) history.replaceState(history.state, '', url);
    if (card.dataset.title) document.title = card.dataset.title;
    if (langLink && card.dataset.altPath) langLink.href = `${card.dataset.altPath}${location.search}`;

    const list = visibleCards();
    const i = list.indexOf(card);
    updateArrows();

    // Clips: held only for this card and its neighbours (the rest are
    // unloaded — sources detached, buffer released); only this one plays.
    const near = new Set([list[i - 1], card, list[i + 1]]);
    for (const other of cards) {
      for (const clip of other.querySelectorAll<HTMLElement>('[data-clip]')) {
        if (clip.closest('dialog')) continue; // demo recordings belong to the dialog
        if (!near.has(other)) {
          unloadClip(clip);
          continue;
        }
        loadClip(clip);
        if (other === card) autoplayClip(clip);
        else pauseClip(clip);
      }
    }
  };

  /** The reading line: halfway down the feed. */
  const readingLine = () => feed.getBoundingClientRect().top + feed.clientHeight / 2;

  /**
   * The active card is the one under the reading line — a single answer,
   * whatever order the observer reports its entries in. Should the line fall
   * on a gap, the nearest card wins.
   */
  const pickActive = (): HTMLLIElement | undefined => {
    const line = readingLine();
    let nearest: HTMLLIElement | undefined;
    let distance = Infinity;
    for (const card of visibleCards()) {
      const rect = card.getBoundingClientRect();
      if (rect.top <= line && rect.bottom > line) return card;
      const d = Math.min(Math.abs(rect.top - line), Math.abs(rect.bottom - line));
      if (d < distance) [nearest, distance] = [card, d];
    }
    return nearest;
  };

  const check = () => {
    const card = pickActive();
    if (card) activate(card);
  };

  // The observer only says when to check. Its root is the feed, shrunk to a
  // 1px band on the reading line, in pixels from the feed's real height.
  let observer: IntersectionObserver | undefined;
  const observe = () => {
    observer?.disconnect();
    const above = Math.floor(feed.clientHeight / 2);
    const below = Math.max(0, feed.clientHeight - above - 1);
    observer = new IntersectionObserver(check, { root: feed, rootMargin: `${-above}px 0px ${-below}px 0px` });
    for (const card of cards) observer.observe(card);
  };
  observe();

  // A resize (rotation, a toolbar, the on-screen keyboard) changes every
  // card's height. Keep the same card on screen — put it back exactly, rather
  // than trust the browser's re-snap to pick the same one — and rebuild the
  // observer's band for the new height. In the middle of a jump, "the same
  // card" is the one the jump is going to: the one already focused and
  // announced, so what is on screen, the address and the focus agree.
  let lastHeight = feed.clientHeight;
  new ResizeObserver(() => {
    if (feed.clientHeight === lastHeight) return;
    lastHeight = feed.clientHeight;
    observe();
    const keep = [destination, active].find((card) => card && inTab(card));
    if (keep) feed.scrollTo({ top: positionOf(keep), behavior: 'instant' });
    check();
  }).observe(feed);

  /* ---------------------------------------------------------------- tabs */

  const showTab = (tab: FeedTab) => {
    root.dataset.tab = tab;
    delete root.dataset.start;
    for (const button of tabs) {
      const on = button.dataset.tab === tab;
      button.setAttribute('aria-selected', String(on));
      button.tabIndex = on ? 0 : -1;
      if (on) button.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
    panel?.setAttribute('aria-labelledby', `tab-${tab}`);
  };

  /** Pick a tab: filter, start at its first card, and record it so Back returns here. */
  const selectTab = (tab: FeedTab) => {
    const first = cards.find((card) => inTab(card, tab));
    if (!first) return;
    showTab(tab);
    history.pushState({ tab }, '', `${first.dataset.path}${tabSearch(tab)}`);
    active = undefined;
    destination = undefined;
    bodyOf(first).scrollTop = 0;
    feed.scrollTo({ top: 0, behavior: 'instant' });
    activate(first);
  };

  showTab(currentTab());

  for (const button of tabs) {
    button.addEventListener('click', () => {
      const tab = button.dataset.tab as FeedTab;
      if (tab !== currentTab()) selectTab(tab);
    });
  }

  // ARIA tabs keyboard pattern: arrows move between tabs, Enter/Space picks one.
  document.querySelector('.tabs')?.addEventListener('keydown', (event) => {
    const e = event as KeyboardEvent;
    const i = tabs.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    const to =
      e.key === 'ArrowRight' ? (i + 1) % tabs.length
      : e.key === 'ArrowLeft' ? (i - 1 + tabs.length) % tabs.length
      : e.key === 'Home' ? 0
      : e.key === 'End' ? tabs.length - 1
      : -1;
    if (to < 0) return;
    e.preventDefault();
    tabs[to]?.focus();
  });

  window.addEventListener('popstate', () => {
    const tab = (new URLSearchParams(location.search).get('tab') ?? DEFAULT_TAB) as FeedTab;
    showTab(FEED_TABS.includes(tab) ? tab : DEFAULT_TAB);
    const card = visibleCards().find((c) => c.dataset.path === location.pathname) ?? visibleCards()[0];
    active = undefined;
    destination = undefined;
    if (card) {
      scrollToCard(card, false);
      activate(card);
    }
  });

  /* ----------------------------------------------------------- keyboard */

  type Step = [1 | -1, 'line' | 'page'] | 'first' | 'last';
  const KEYS: Record<string, Step> = {
    ArrowDown: [1, 'line'],
    PageDown: [1, 'page'],
    ArrowUp: [-1, 'line'],
    PageUp: [-1, 'page'],
    Home: 'first',
    End: 'last',
  };

  document.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    // Leave keys alone where they already mean something: typing, the
    // before/after slider, the tab row, a dialog, an embedded site.
    const target = e.target as HTMLElement;
    if (target.closest('input, textarea, select, [contenteditable], iframe, [role="tablist"], dialog')) return;
    let step: Step | undefined = e.shiftKey ? undefined : KEYS[e.key];
    if (e.key === ' ') {
      // Space pages down (Shift+Space up), except where Space presses something.
      if (target.closest('a[href], button, summary, [role="button"]')) return;
      step = [e.shiftKey ? -1 : 1, 'page'];
    }
    if (step === undefined) return;
    e.preventDefault();
    const list = visibleCards();
    if (step === 'first') goTo(list[0]!);
    else if (step === 'last') goTo(list[list.length - 1]!);
    else move(...step);
  });

  prev?.addEventListener('click', () => move(-1, 'page'));
  next?.addEventListener('click', () => move(1, 'page'));

  /* -------------------------------------------------------------- links */

  // A link to another card scrolls there instead of loading its page. If the
  // open tab hides that card, switch to a tab that shows it first.
  document.addEventListener('click', (e) => {
    const link = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[data-card-link], a[data-feed-restart]');
    if (!link || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    if (link.hasAttribute('data-feed-restart')) {
      const first = visibleCards()[0];
      if (first) goTo(first);
      return;
    }
    const target = cards.find((card) => card.id === link.dataset.cardLink);
    if (!target) return;
    if (!inTab(target)) {
      const tab = inTab(target, DEFAULT_TAB) ? DEFAULT_TAB : ((target.dataset.tabs ?? '').split(' ')[0] as FeedTab);
      selectTab(tab);
    }
    goTo(target);
  });
}
