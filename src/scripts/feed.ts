/**
 * The feed's behaviour. The markup and CSS already work without this; the
 * script adds:
 *  - the active card: the one crossing the middle of the screen. Its page path
 *    goes into the address bar (replaceState — scrolling never adds history
 *    entries), its title into the tab, and the language link follows it;
 *  - video: only the active card and its neighbours fetch their clip, and only
 *    the active one plays;
 *  - tabs: filter the feed, go into the URL (?tab=), and Back undoes them;
 *  - keyboard: ↑/↓ and PageUp/PageDown read through a card taller than the
 *    screen before moving to the next one; Home/End jump to the ends;
 *  - the desktop arrows (like PageUp/PageDown), card-to-card links, and
 *    "start over".
 */
import { DEFAULT_TAB, FEED_TABS, type FeedTab } from '../data/types';
import { format } from '../i18n/format';
import { autoplayClip, loadClip, pauseClip } from './clips';

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
  const bar = document.querySelector<HTMLElement>('.topbar');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let active: HTMLLIElement | undefined;

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

  /** The part of the screen cards show in: from under the sticky bar to the bottom. */
  const visibleArea = () => ({
    top: bar ? Math.max(0, bar.getBoundingClientRect().bottom) : 0,
    bottom: window.innerHeight,
  });

  const behavior = (smooth: boolean): ScrollBehavior => (smooth && !reducedMotion.matches ? 'smooth' : 'instant');

  /**
   * Bring a card on screen. `end` (arriving from below) shows the end of a
   * card taller than the screen, so reading upwards skips nothing; a card
   * that fits is always shown from its top.
   */
  const scrollToCard = (card: HTMLElement, smooth: boolean, edge: 'start' | 'end' = 'start') => {
    const rect = card.getBoundingClientRect();
    const { top, bottom } = visibleArea();
    if (edge === 'end' && rect.height > bottom - top) {
      window.scrollTo({ top: window.scrollY + rect.bottom - bottom, behavior: behavior(smooth) });
    } else {
      card.scrollIntoView({ block: 'start', behavior: behavior(smooth) });
    }
  };

  /** Move to a card on purpose (keys, arrows, links): focus it and say where we are. */
  const goTo = (card: HTMLElement, edge: 'start' | 'end' = 'start') => {
    scrollToCard(card, true, edge);
    card.querySelector<HTMLElement>('article')?.focus({ preventScroll: true });
    const list = visibleCards();
    const heading = card.querySelector('h2')?.textContent?.trim() ?? '';
    if (status) {
      status.textContent = `${format(status.dataset.template ?? '', { index: list.indexOf(card as HTMLLIElement) + 1, total: list.length })}: ${heading}`;
    }
  };

  /** Slack, in px, for rounding when asking whether a card's edge is on screen. */
  const EDGE = 2;

  /**
   * One press of ↑/↓ (`line`: a quarter screen), PageUp/PageDown or a desktop
   * arrow (`page`: a screen, less a little overlap). While the current card
   * still has content off screen in that direction, scroll through it —
   * never past its edge. Only once its edge is on screen, move to the next
   * card. Nothing is announced until the card changes.
   */
  const move = (direction: 1 | -1, size: 'line' | 'page') => {
    const list = visibleCards();
    const card = active && list.includes(active) ? active : undefined;
    if (card) {
      const { top, bottom } = visibleArea();
      const rect = card.getBoundingClientRect();
      const offScreen = direction > 0 ? rect.bottom - bottom : top - rect.top;
      if (offScreen > EDGE) {
        const amount = (bottom - top) * (size === 'page' ? 0.9 : 0.25);
        window.scrollTo({ top: window.scrollY + direction * Math.min(amount, offScreen), behavior: behavior(true) });
        return;
      }
    }
    const from = card ? list.indexOf(card) : 0;
    const target = list[from + direction];
    if (target) goTo(target, direction > 0 ? 'start' : 'end');
  };

  /** The desktop arrows are off only at the very ends: first/last card, with its edge on screen. */
  const updateArrows = () => {
    const list = visibleCards();
    const i = active ? list.indexOf(active) : 0;
    const rect = active?.getBoundingClientRect();
    const { top, bottom } = visibleArea();
    if (prev) prev.disabled = i <= 0 && (!rect || rect.top >= top - EDGE);
    if (next) next.disabled = i >= list.length - 1 && (!rect || rect.bottom <= bottom + EDGE);
  };
  // Where supported, also after reading through the first or last card.
  window.addEventListener('scrollend', updateArrows);

  /* ------------------------------------------------------- active card */

  const activate = (card: HTMLLIElement) => {
    if (card === active) return;
    active = card;

    const url = `${card.dataset.path}${location.search}`;
    if (`${location.pathname}${location.search}` !== url) history.replaceState(history.state, '', url);
    if (card.dataset.title) document.title = card.dataset.title;
    if (langLink && card.dataset.altPath) langLink.href = `${card.dataset.altPath}${location.search}`;

    const list = visibleCards();
    const i = list.indexOf(card);
    updateArrows();

    // Clips: fetch for this card and its neighbours, play only this one.
    const near = new Set([list[i - 1], card, list[i + 1]]);
    for (const other of cards) {
      for (const clip of other.querySelectorAll<HTMLElement>('[data-clip]')) {
        if (clip.closest('dialog')) continue; // demo recordings belong to the dialog
        if (near.has(other)) loadClip(clip);
        if (other === card) autoplayClip(clip);
        else pauseClip(clip);
      }
    }
  };

  // A 1%-tall band across the middle of the screen: whichever card crosses it
  // is active. Works for cards taller than the screen too.
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) activate(entry.target as HTMLLIElement);
      }
    },
    { rootMargin: '-49% 0px -50% 0px' },
  );
  cards.forEach((card) => observer.observe(card));

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
    window.scrollTo({ top: 0, behavior: 'instant' });
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
    if (card) {
      scrollToCard(card, false);
      activate(card);
    }
  });

  /* ----------------------------------------------------------- keyboard */

  const KEYS: Record<string, [1 | -1, 'line' | 'page'] | 'first' | 'last'> = {
    ArrowDown: [1, 'line'],
    PageDown: [1, 'page'],
    ArrowUp: [-1, 'line'],
    PageUp: [-1, 'page'],
    Home: 'first',
    End: 'last',
  };

  document.addEventListener('keydown', (e) => {
    const key = KEYS[e.key];
    if (key === undefined || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    // Leave keys alone where they already mean something: typing, the
    // before/after slider, the tab row, the demo dialog, an embedded site.
    const target = e.target as HTMLElement;
    if (target.closest('input, textarea, select, [contenteditable], iframe, [role="tablist"], dialog')) return;
    e.preventDefault();
    const list = visibleCards();
    if (key === 'first') goTo(list[0]!);
    else if (key === 'last') goTo(list[list.length - 1]!);
    else move(...key);
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
