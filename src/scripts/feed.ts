/**
 * The feed's behaviour. The markup and CSS already work without this; the
 * script adds:
 *  - the active card: the one crossing the middle of the screen. Its page path
 *    goes into the address bar (replaceState — scrolling never adds history
 *    entries), its title into the tab, and the language link follows it;
 *  - video: only the active card and its neighbours fetch their clip, and only
 *    the active one plays;
 *  - tabs: filter the feed, go into the URL (?tab=), and Back undoes them;
 *  - keyboard: ↑/↓, PageUp/PageDown, Home/End move card by card;
 *  - the desktop arrows, card-to-card links, and "start over".
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

  const scrollToCard = (card: HTMLElement, smooth: boolean) => {
    card.scrollIntoView({ block: 'start', behavior: smooth && !reducedMotion.matches ? 'smooth' : 'instant' });
  };

  /** Move to a card on purpose (keys, arrows, links): focus it and say where we are. */
  const goTo = (card: HTMLElement) => {
    scrollToCard(card, true);
    card.querySelector<HTMLElement>('article')?.focus({ preventScroll: true });
    const list = visibleCards();
    const heading = card.querySelector('h2')?.textContent?.trim() ?? '';
    if (status) {
      status.textContent = `${format(status.dataset.template ?? '', { index: list.indexOf(card as HTMLLIElement) + 1, total: list.length })}: ${heading}`;
    }
  };

  const step = (delta: number) => {
    const list = visibleCards();
    const from = active && list.includes(active) ? list.indexOf(active) : 0;
    const target = list[Math.min(list.length - 1, Math.max(0, from + delta))];
    if (target) goTo(target);
  };

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
    if (prev) prev.disabled = i <= 0;
    if (next) next.disabled = i >= list.length - 1;

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

  const KEYS: Record<string, number | 'first' | 'last'> = {
    ArrowDown: 1,
    PageDown: 1,
    ArrowUp: -1,
    PageUp: -1,
    Home: 'first',
    End: 'last',
  };

  document.addEventListener('keydown', (e) => {
    const move = KEYS[e.key];
    if (move === undefined || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    // Leave keys alone where they already mean something: typing, the
    // before/after slider, the tab row, the demo dialog, an embedded site.
    const target = e.target as HTMLElement;
    if (target.closest('input, textarea, select, [contenteditable], iframe, [role="tablist"], dialog')) return;
    e.preventDefault();
    const list = visibleCards();
    if (move === 'first') goTo(list[0]!);
    else if (move === 'last') goTo(list[list.length - 1]!);
    else step(move);
  });

  prev?.addEventListener('click', () => step(-1));
  next?.addEventListener('click', () => step(1));

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
