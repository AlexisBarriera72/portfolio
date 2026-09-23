import { statSync } from 'node:fs';
import { join } from 'node:path';
import { localePath } from '../i18n';
import { resolveImage } from './media';
import { site } from './site';
import type { Card, CardType, FeedTab, Locale } from './types';
import { LOCALES } from './types';
import { type CardEntry, isPlaceholder, mediaOf, validate } from './validate';

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

/**
 * The glob's type parameter is a promise, not a check — a file that forgets its
 * `: ProjectCard` annotation would slip through `astro check`. This catches the
 * most likely version of that mistake at runtime. The Record makes TypeScript
 * fail here if a card type is added without being listed.
 */
const CARD_TYPES: Record<CardType, true> = {
  intro: true,
  project: true,
  pricing: true,
  inclusions: true,
  about: true,
  contact: true,
  end: true,
};

const entries: CardEntry[] = Object.entries(modules)
  .map(([path, mod]) => {
    const card: unknown = mod.default;
    if (typeof card !== 'object' || card === null || !((card as Card).type in CARD_TYPES)) {
      throw new Error(`${path} does not default-export a card`);
    }
    return { path, card: card as Card };
  })
  .filter(({ card }) => card.published !== false)
  .sort((a, b) => a.card.order - b.card.order);

/* ------------------------------------------------------------- build checks */

/**
 * All problems in the real content. `strict` adds the launch checks
 * (placeholders, missing media, clip sizes, before/after dimensions) — see
 * validate.ts.
 */
export function contentProblems(strict: boolean): string[] {
  return validate(entries, site, { strict, fileSize: publicFileSize, imageSize: resolveImage });
}

/** Resolved from the project root: at build time this module runs from a bundled chunk, not from src/. */
function publicFileSize(publicPath: string): number | undefined {
  try {
    return statSync(join(process.cwd(), 'public', publicPath)).size;
  } catch {
    return undefined;
  }
}

/**
 * Runs whenever a page imports this module, so a bad card fails the build
 * instead of shipping a dead link. `npm run build` also refuses to ship
 * placeholders or missing media; `npm run build:draft` (astro build --mode
 * draft) skips only those launch checks while the real phone number and
 * photos are still missing. `npm run dev` never runs them.
 */
const STRICT = import.meta.env.PROD && import.meta.env.MODE !== 'draft';
const problems = contentProblems(STRICT);
if (problems.length > 0) {
  throw new Error(`Content errors:\n  - ${problems.join('\n  - ')}`);
}

/* ------------------------------------------------------------------ exports */

export const cards: Card[] = entries.map((e) => e.card);

/** Cards in one tab, already ordered. */
export function cardsForTab(tab: FeedTab): Card[] {
  return cards.filter((card) => card.tabs.includes(tab));
}

export function getCard(slug: string): Card | undefined {
  return cards.find((card) => card.slug === slug);
}

/**
 * A card's own page. Each card is pre-rendered at its own path so a shared
 * link gets that card's title and preview image; the intro is the home page.
 *   pathForCard(elBreak, 'es') → "/el-break/"
 *   pathForCard(elBreak, 'en') → "/en/el-break/"
 *   pathForCard(intro, 'en')   → "/en/"
 */
export function pathForCard(card: Card, locale: Locale): string {
  return localePath(locale, card.type === 'intro' ? '/' : `/${card.slug}/`);
}

/** Every page to pre-render: one per card per locale. Feed this to getStaticPaths. */
export function cardPages(): { locale: Locale; card: Card; path: string }[] {
  return LOCALES.flatMap((locale) =>
    cards.map((card) => ({ locale, card, path: pathForCard(card, locale) })),
  );
}

/**
 * What a draft build knowingly ships without: public media files (video,
 * captions) that are referenced but not added yet, and live-demo URLs that
 * are still placeholders. Published only by draft builds as
 * /draft-missing.json, so tests can allow exactly these and nothing else.
 */
export function draftGaps(): { missing: string[]; placeholderDemos: string[] } {
  const files = new Set<string>();
  const demos = new Set<string>();
  for (const { card } of entries) {
    for (const ref of mediaOf(card)) {
      if (ref.kind !== 'image' && publicFileSize(ref.src) === undefined) files.add(ref.src);
    }
    if (card.type === 'project' && card.demo.mode === 'live' && isPlaceholder(card.liveUrl)) {
      demos.add(new URL(card.liveUrl).origin);
    }
  }
  return { missing: [...files].sort(), placeholderDemos: [...demos].sort() };
}

/** Municipios that actually have a project, for the "Local" tab copy. */
export const clientCities: string[] = [
  ...new Set(cards.flatMap((c) => (c.type === 'project' ? [c.client.city] : []))),
].sort();
