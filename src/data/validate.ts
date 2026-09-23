import type { Card, Clip, Cta, Img, SiteConfig, SpokenClip } from './types';
import { DEFAULT_TAB, FEED_TABS, LOCALES } from './types';

/**
 * Build-time content checks — everything TypeScript cannot catch: duplicates,
 * ordering, references between cards, URL shapes, and (for a production build)
 * whether the site is actually ready to launch.
 *
 * Pure on purpose: the filesystem and today's date are passed in, so every rule
 * can be tested with fixtures (validate.test.ts) without touching real files.
 */

export interface CardEntry {
  /** Module path, e.g. "./cards/10-el-break.ts". The NN- prefix must match `order`. */
  path: string;
  card: Card;
}

export interface ValidateOptions {
  /**
   * Launch checks: no placeholder values, every media file exists, clips are
   * within budget. On for production builds; off in dev so you can work before
   * the photos and the real phone number exist.
   */
  strict?: boolean;
  /** Size in bytes of a file under public/, or undefined if it does not exist. */
  fileSize?: (publicPath: string) => number | undefined;
  /** Real size of an image under src/assets/media/, or undefined if it does not exist. */
  imageSize?: (imagePath: string) => { width: number; height: number } | undefined;
  /** Text of a file under public/ (caption files), or undefined if it does not exist. */
  readText?: (publicPath: string) => string | undefined;
  /** YYYY-MM-DD. Defaults to the current date. */
  today?: string;
}

/**
 * One media reference. Images live in src/assets/media/ and go through the
 * image pipeline; everything else is a file served from public/.
 */
export type MediaRef =
  | { kind: 'image'; src: string }
  | { kind: 'webm' | 'mp4' | 'vtt'; src: string };

/** What each kind of path must look like. */
const MEDIA_PATTERN: Record<MediaRef['kind'], { pattern: RegExp; example: string }> = {
  image: { pattern: /^(?!\/)[\w./-]+\.(avif|jpe?g|png|webp)$/i, example: 'el-break/antes.webp' },
  webm: { pattern: /^\/media\/[\w./-]+\.webm$/, example: '/media/intro/saludo.webm' },
  mp4: { pattern: /^\/media\/[\w./-]+\.mp4$/, example: '/media/intro/saludo.mp4' },
  vtt: { pattern: /^\/media\/[\w./-]+\.vtt$/, example: '/media/intro/saludo.es.vtt' },
};

/** Each clip file (WebM and MP4 separately) must stay under this. */
export const MAX_CLIP_BYTES = 2 * 1024 * 1024;

/**
 * Slugs that would collide with a real route: the locale prefixes, Astro's
 * 404 page, and the folder the media is served from.
 */
const RESERVED_SLUGS: readonly string[] = [...LOCALES, '404', 'media'];

/**
 * Values that mean "not filled in yet". Any match fails a production build.
 * TODO is matched case-sensitively on purpose: "todo" is an ordinary Spanish
 * word ("Eso es todo") and must not trip the check.
 */
export function isPlaceholder(value: string): boolean {
  return /\bTODO\b/.test(value) || /example\.(com|org|net)|\.example\b|555-?1234/i.test(value);
}

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Returns every problem found; an empty array means the content is valid. */
export function validate(
  entries: CardEntry[],
  site: SiteConfig,
  options: ValidateOptions = {},
): string[] {
  const problems: string[] = [];
  const today = options.today ?? new Date().toISOString().slice(0, 10);
  const cards = entries.map((e) => e.card);

  checkSite(site, problems);
  for (const ref of siteMedia(site)) checkMediaPath(ref, 'site', problems);

  const slugs = new Set<string>();
  const orders = new Map<number, string>();

  for (const { path, card } of entries) {
    const at = `"${card.slug}"`;

    if (!KEBAB.test(card.slug)) {
      problems.push(`slug ${at} must be kebab-case — it becomes a URL`);
    }
    if (RESERVED_SLUGS.includes(card.slug)) {
      problems.push(`slug ${at} is reserved — it would collide with /${card.slug}/`);
    }
    if (slugs.has(card.slug)) {
      problems.push(`duplicate slug ${at} — two cards would answer the same link`);
    }
    slugs.add(card.slug);

    if (!Number.isInteger(card.order) || card.order < 0) {
      problems.push(`${at} order must be a whole number ≥ 0`);
    }
    const clash = orders.get(card.order);
    if (clash !== undefined) {
      problems.push(`${at} and "${clash}" share order ${card.order} — their position would depend on file names`);
    }
    orders.set(card.order, card.slug);

    const prefix = /\/(\d+)-[^/]+$/.exec(path)?.[1];
    if (prefix === undefined) {
      problems.push(`${path} must be named after its order, e.g. ${card.order}-${card.slug}.ts`);
    } else if (Number(prefix) !== card.order) {
      problems.push(`${path} says ${prefix} in its name but order ${card.order} inside — keep them equal`);
    }

    if (card.tabs.length === 0) {
      problems.push(`${at} has no tabs, so no tab can ever show it`);
    }
    for (const tab of card.tabs) {
      if (!FEED_TABS.includes(tab)) problems.push(`${at} has unknown tab "${tab}"`);
    }
    if (new Set(card.tabs).size !== card.tabs.length) {
      problems.push(`${at} lists the same tab twice`);
    }

    walkStrings(card, card.slug, (value, where) => {
      if (value.trim() === '') problems.push(`empty text at ${where}`);
    });

    for (const { where, url } of urlsOf(card)) {
      checkHttps(url, `${at} ${where}`, problems);
    }
    for (const ref of mediaOf(card)) checkMediaPath(ref, at, problems);

    checkCardType(card, site, today, problems);
  }

  // Links between cards.
  for (const card of cards) {
    for (const cta of ctasOf(card)) {
      if (cta.kind === 'card' && !slugs.has(cta.target)) {
        problems.push(`"${card.slug}" links to card "${cta.target}", which does not exist`);
      }
    }
  }

  // Feed shape. Assumes `cards` is already sorted by order.
  const intros = cards.filter((c) => c.type === 'intro');
  if (intros.length !== 1) problems.push(`expected exactly 1 intro card, found ${intros.length}`);
  else if (cards[0]?.type !== 'intro') problems.push('the intro card must have the lowest order');
  else if (!cards[0].tabs.includes(DEFAULT_TAB)) {
    problems.push(`the intro card is the home page, so it must be in the "${DEFAULT_TAB}" tab`);
  }

  const ends = cards.filter((c) => c.type === 'end');
  if (ends.length !== 1) problems.push(`expected exactly 1 end card, found ${ends.length}`);
  else if (cards.at(-1)?.type !== 'end') problems.push('the end card must have the highest order');

  // Intro and end cards sit in every tab, so they cannot be what fills one.
  for (const tab of FEED_TABS) {
    const own = cards.filter((c) => c.tabs.includes(tab) && c.type !== 'intro' && c.type !== 'end');
    if (own.length === 0) {
      problems.push(`tab "${tab}" has no cards of its own — only the intro and end would show`);
    }
  }

  if (options.strict) checkLaunch(entries, site, options, problems);

  return problems;
}

/* ------------------------------------------------------------------ per type */

function checkCardType(card: Card, site: SiteConfig, today: string, problems: string[]): void {
  const at = `"${card.slug}"`;

  switch (card.type) {
    case 'project': {
      if (card.demo.mode === 'recorded') checkClip(card.demo.clip, `${at} demo clip`, problems);
      if (card.demo.mode === 'live') {
        const checked = card.demo.framingCheckedOn;
        if (!isIsoDate(checked)) {
          problems.push(`${at} framingCheckedOn "${checked}" must be a real date, YYYY-MM-DD`);
        } else if (checked > today) {
          problems.push(`${at} framingCheckedOn ${checked} is in the future`);
        }
      }
      if (card.outcomes.length === 0) problems.push(`${at} needs at least one outcome`);

      const isLocal = site.serviceArea.includes(card.client.city);
      if (card.tabs.includes('local') && !isLocal) {
        problems.push(`${at} is in the "local" tab but ${card.client.city} is not in site.serviceArea`);
      }
      if (!card.tabs.includes('local') && isLocal) {
        problems.push(`${at} is in ${card.client.city}, which you serve — add it to the "local" tab`);
      }
      return;
    }

    case 'pricing': {
      if (card.tiers.length === 0) problems.push(`${at} has no tiers`);
      if (card.tiers.filter((t) => t.featured).length > 1) {
        problems.push(`${at} features more than one tier — at most one can be "most chosen"`);
      }
      const ids = card.tiers.map((t) => t.id);
      if (new Set(ids).size !== ids.length) problems.push(`${at} has duplicate tier ids`);
      for (const tier of card.tiers) {
        if (!Number.isInteger(tier.priceFrom) || tier.priceFrom <= 0) {
          problems.push(`${at} tier "${tier.id}" price must be a whole number of dollars above 0`);
        }
      }
      return;
    }

    case 'contact': {
      if (card.primary.length === 0) problems.push(`${at} has no primary contact buttons`);
      if (card.form?.mode === 'post') {
        const names = card.form.fields.map((f) => f.name);
        if (names.length === 0) problems.push(`${at} form has no fields`);
        if (new Set(names).size !== names.length) problems.push(`${at} form has duplicate field names`);
      }
      return;
    }

    case 'inclusions':
      if (card.items.length === 0) problems.push(`${at} has no items`);
      return;

    case 'intro':
      checkClip(card.clip, `${at} clip`, problems);
      return;

    case 'about':
    case 'end':
      return;

    default:
      assertNever(card);
  }
}

/**
 * TypeScript already requires captions and a transcript on a clip with sound;
 * this repeats it at runtime for a card file that skipped its type annotation.
 */
function checkClip(clip: Clip, where: string, problems: string[]): void {
  if (!clip.sound) return;
  const spoken = clip as Partial<Pick<SpokenClip, 'captions' | 'transcript'>>;
  if (!spoken.captions) problems.push(`${where} has sound, so it needs captions (a WebVTT file per language)`);
  if (!spoken.transcript) problems.push(`${where} has sound, so it needs a transcript`);
}

function checkSite(site: SiteConfig, problems: string[]): void {
  checkHttps(site.url, 'site.url', problems);
  if (site.url.endsWith('/')) problems.push('site.url must not end with a slash');
  if (!/^\d{10,15}$/.test(site.contact.whatsapp)) {
    problems.push('site.contact.whatsapp must be digits only, with country code — e.g. 17875551234');
  }
  if (!/^\+\d{10,15}$/.test(site.contact.phone.e164)) {
    problems.push('site.contact.phone.e164 must be + and digits — e.g. +17875551234');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(site.contact.email)) {
    problems.push('site.contact.email is not an email address');
  }
  if (!site.serviceArea.includes(site.city)) {
    problems.push(`site.serviceArea must include your own city, ${site.city}`);
  }
}

/* -------------------------------------------------------------------- launch */

function checkLaunch(
  entries: CardEntry[],
  site: SiteConfig,
  { fileSize, imageSize, readText }: ValidateOptions,
  problems: string[],
): void {
  if (!fileSize || !imageSize) {
    problems.push('launch checks need fileSize and imageSize to verify media');
    return;
  }

  walkStrings(site, 'site', (value, where) => {
    if (isPlaceholder(value)) problems.push(`placeholder at ${where}: "${value}"`);
  });

  const refs = new Map<string, MediaRef>(siteMedia(site).map((ref) => [ref.src, ref]));

  for (const { card } of entries) {
    walkStrings(card, card.slug, (value, where) => {
      if (isPlaceholder(value)) problems.push(`placeholder at ${where}: "${value}"`);
    });
    for (const ref of mediaOf(card)) refs.set(ref.src, ref);

    if (card.type === 'project' && card.beforeAfter.before) {
      const before = imageSize(card.beforeAfter.before.src);
      const after = imageSize(card.beforeAfter.after.src);
      if (before && after && (before.width !== after.width || before.height !== after.height)) {
        problems.push(
          `"${card.slug}" before (${before.width}×${before.height}) and after (${after.width}×${after.height}) ` +
            'must be shot at the same size, or the comparison is not honest',
        );
      }
    }
  }

  for (const ref of refs.values()) {
    if (ref.kind === 'image') {
      if (!imageSize(ref.src)) problems.push(`missing image src/assets/media/${ref.src}`);
      continue;
    }
    const bytes = fileSize(ref.src);
    if (bytes === undefined) {
      problems.push(`missing file public${ref.src}`);
    } else if (ref.kind !== 'vtt' && bytes > MAX_CLIP_BYTES) {
      problems.push(`${ref.src} is ${(bytes / 1024 / 1024).toFixed(1)} MB — clips must stay under 2 MB`);
    } else if (ref.kind === 'vtt' && readText && !/^\uFEFF?WEBVTT(\s|$)/.test(readText(ref.src) ?? '')) {
      problems.push(`${ref.src} is not a WebVTT file — it must start with "WEBVTT"`);
    }
  }
}

/* ----------------------------------------------------------------- traversal */

/**
 * Every CTA on a card. A switch over every card type, so adding a card type
 * that has buttons fails to compile until it is handled here.
 */
export function ctasOf(card: Card): Cta[] {
  switch (card.type) {
    case 'intro':
    case 'pricing':
    case 'end':
      return [card.cta];
    case 'contact':
      return card.primary;
    case 'project':
    case 'inclusions':
    case 'about':
      return [];
    default:
      return assertNever(card);
  }
}

/** Every outbound URL on a card, labelled with where it came from. */
export function urlsOf(card: Card): { where: string; url: string }[] {
  const urls = ctasOf(card).flatMap((cta) =>
    cta.kind === 'external' ? [{ where: 'external link', url: cta.href }] : [],
  );
  switch (card.type) {
    case 'project':
      urls.push({ where: 'liveUrl', url: card.liveUrl });
      break;
    case 'contact':
      if (card.form?.mode === 'post') urls.push({ where: 'form endpoint', url: card.form.endpoint });
      break;
    case 'intro':
    case 'pricing':
    case 'inclusions':
    case 'about':
    case 'end':
      break;
    default:
      assertNever(card);
  }
  return urls;
}

function clipsOf(card: Card): Clip[] {
  switch (card.type) {
    case 'intro':
      return [card.clip];
    case 'project':
      return card.demo.mode === 'recorded' ? [card.demo.clip] : [];
    case 'pricing':
    case 'inclusions':
    case 'about':
    case 'contact':
    case 'end':
      return [];
    default:
      return assertNever(card);
  }
}

/** Every media file a card references: images, posters, videos, captions. */
export function mediaOf(card: Card): MediaRef[] {
  const images: Img[] = [];
  switch (card.type) {
    case 'project':
      if (card.beforeAfter.before) images.push(card.beforeAfter.before);
      images.push(card.beforeAfter.after);
      if (card.demo.mode !== 'recorded') images.push(...Object.values(card.demo.shots));
      if (card.client.owner) images.push(card.client.owner.photo);
      break;
    case 'about':
      images.push(card.portrait);
      break;
    case 'intro':
    case 'pricing':
    case 'inclusions':
    case 'contact':
    case 'end':
      break;
    default:
      assertNever(card);
  }
  return [
    ...images.map((img): MediaRef => ({ kind: 'image', src: img.src })),
    ...clipsOf(card).flatMap(clipMedia),
    ...(card.share ? [{ kind: 'image', src: card.share.image } as const] : []),
  ];
}

function clipMedia(clip: Clip): MediaRef[] {
  return [
    { kind: 'webm', src: clip.webm },
    { kind: 'mp4', src: clip.mp4 },
    { kind: 'image', src: clip.poster },
    ...(clip.captions ? Object.values(clip.captions).map((src): MediaRef => ({ kind: 'vtt', src })) : []),
  ];
}

function siteMedia(site: SiteConfig): MediaRef[] {
  return [
    { kind: 'image', src: site.person.portrait.src },
    { kind: 'image', src: site.defaultShareImage },
  ];
}

/* ------------------------------------------------------------------- helpers */

function checkMediaPath(ref: MediaRef, where: string, problems: string[]): void {
  const { pattern, example } = MEDIA_PATTERN[ref.kind];
  if (!pattern.test(ref.src)) {
    problems.push(`${where} ${ref.kind} path "${ref.src}" should look like "${example}"`);
  }
}

function checkHttps(url: string, where: string, problems: string[]): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    problems.push(`${where} "${url}" is not a full URL`);
    return;
  }
  if (parsed.protocol !== 'https:') problems.push(`${where} "${url}" must use https://`);
}

function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

/** Calls `visit` for every string inside `value`, with a readable path to it. */
function walkStrings(value: unknown, where: string, visit: (value: string, where: string) => void): void {
  if (typeof value === 'string') {
    visit(value, where);
  } else if (Array.isArray(value)) {
    value.forEach((item, i) => walkStrings(item, `${where}[${i}]`, visit));
  } else if (value !== null && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) walkStrings(item, `${where}.${key}`, visit);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled card type: ${JSON.stringify(value)}`);
}
