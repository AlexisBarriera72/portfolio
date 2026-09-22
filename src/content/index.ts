import type { Card, FeedTab } from './types';
import { FEED_TABS } from './types';

/**
 * Every .ts file in ./cards/ that default-exports a Card is in the feed.
 * Adding a project is one new file — there is no registry to remember to update.
 * Files starting with _ are skipped, which is how _template.project.ts stays
 * out of the feed while remaining a working, type-checked file to copy.
 *
 * `eager: true` inlines the modules at build time, so this stays a static site
 * with no runtime import and no client-side fetch.
 */
const modules = import.meta.glob<{ default: Card }>(['./cards/*.ts', '!./cards/_*.ts'], {
  eager: true,
});

const all: Card[] = Object.entries(modules)
  .map(([path, mod]) => {
    if (!mod.default) throw new Error(`${path} has no default export`);
    return mod.default;
  })
  .filter((card) => card.published !== false)
  .sort((a, b) => a.order - b.order);

/* ------------------------------------------------------------- build checks */

/**
 * These run during `astro build`, so a bad card fails the build instead of
 * shipping a dead link. Everything here is a mistake TypeScript cannot catch:
 * duplicates, ordering, and references between cards.
 */
function validate(cards: Card[]): void {
  const problems: string[] = [];
  const slugs = new Set<string>();

  for (const card of cards) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(card.slug)) {
      problems.push(`slug "${card.slug}" must be kebab-case — it becomes a URL fragment`);
    }
    if (slugs.has(card.slug)) {
      problems.push(`duplicate slug "${card.slug}" — two cards would answer the same link`);
    }
    slugs.add(card.slug);

    if (card.tabs.length === 0) {
      problems.push(`"${card.slug}" has no tabs, so no tab can ever show it`);
    }
    for (const tab of card.tabs) {
      if (!FEED_TABS.includes(tab)) problems.push(`"${card.slug}" has unknown tab "${tab}"`);
    }
  }

  // Internal CTA targets must point at a card that exists.
  for (const card of cards) {
    const ctas = [
      ...('cta' in card && card.cta ? [card.cta] : []),
      ...('primary' in card ? card.primary : []),
    ];
    for (const cta of ctas) {
      if (cta.kind === 'card' && (!cta.target || !slugs.has(cta.target))) {
        problems.push(`"${card.slug}" links to card "${cta.target}", which does not exist`);
      }
      if (cta.kind === 'external' && !cta.target?.startsWith('http')) {
        problems.push(`"${card.slug}" has an external CTA with no absolute URL`);
      }
    }
  }

  const intros = cards.filter((c) => c.type === 'intro');
  if (intros.length !== 1) problems.push(`expected exactly 1 intro card, found ${intros.length}`);
  else if (cards[0]?.type !== 'intro') problems.push('the intro card must have the lowest order');

  const ends = cards.filter((c) => c.type === 'end');
  if (ends.length !== 1) problems.push(`expected exactly 1 end card, found ${ends.length}`);
  else if (cards.at(-1)?.type !== 'end') problems.push('the end card must have the highest order');

  for (const tab of FEED_TABS) {
    if (!cards.some((c) => c.tabs.includes(tab))) {
      problems.push(`tab "${tab}" would render an empty feed`);
    }
  }

  if (problems.length > 0) {
    throw new Error(`Content errors:\n  - ${problems.join('\n  - ')}`);
  }
}

validate(all);

/* ------------------------------------------------------------------ exports */

export const cards = all;

/** Cards in one tab, already ordered. */
export function cardsForTab(tab: FeedTab): Card[] {
  return all.filter((card) => card.tabs.includes(tab));
}

export function getCard(slug: string): Card | undefined {
  return all.find((card) => card.slug === slug);
}

/** Municipios that actually have a project, for the "Local" tab copy. */
export const clientCities: string[] = [
  ...new Set(all.flatMap((c) => (c.type === 'project' ? [c.client.city] : []))),
].sort();
