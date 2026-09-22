/**
 * Content schema for the feed.
 *
 * Rules this file enforces at build time:
 *  - Nothing ships half-translated: every author-written string is an { es, en } pair.
 *  - A card cannot be rendered without the data its layout needs (discriminated union).
 *  - Images and video always carry intrinsic size, so the feed never shifts while loading.
 *  - UI chrome ("Antes", "Ver sitio", "Siguiente") is NOT here. It lives in src/i18n/.
 */

/* ------------------------------------------------------------------ locales */

export const LOCALES = ['es', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

/** Spanish first — this is the default, English is the alternate. */
export const DEFAULT_LOCALE: Locale = 'es';

/**
 * A translated value. Both locales are required on purpose: an optional `en`
 * would let a card ship in Spanish only and silently fall back on the English
 * page, which reads as broken to the exact visitor you were trying to reach.
 */
export type L10n<T = string> = Record<Locale, T>;

/** Body copy as an array of paragraphs, so no data file ever contains HTML. */
export type L10nText = L10n<string[]>;

/* -------------------------------------------------------------------- media */

export interface Img {
  /** Path under /public, e.g. "/media/el-break/after.webp". */
  src: string;
  /** Required. Describes what is IN the image, for screen readers and for SEO. */
  alt: L10n;
  /** Intrinsic size. Required so width/height render on the tag and CLS stays 0. */
  width: number;
  height: number;
}

/**
 * A short clip. Always muted + looping + playsinline; the components add those.
 * Keep each file under 2MB — there is no build step that can enforce that, so
 * `sizeKb` is recorded by hand and checked by scripts/check-media.mjs.
 */
export interface Clip {
  webm: string;
  mp4: string;
  /** Shown before play and whenever the clip is not the active card. */
  poster: string;
  posterAlt: L10n;
  width: number;
  height: number;
  durationSec: number;
  /** Combined WebM + MP4 weight, kilobytes. Budget check reads this. */
  sizeKb: number;
  /**
   * What is said or shown. Rendered as visually-hidden text next to the video
   * so the content exists for screen readers and for crawlers, which never
   * play the file.
   */
  transcript?: L10nText;
}

/* --------------------------------------------------------------------- tabs */

export const FEED_TABS = ['para-ti', 'local', 'precios', 'sobre-mi', 'contacto'] as const;
export type FeedTab = (typeof FEED_TABS)[number];

/** Opening tab when no ?tab= is present in the URL. */
export const DEFAULT_TAB: FeedTab = 'para-ti';

/* -------------------------------------------------------------- call to action */

export type CtaKind =
  | 'whatsapp' // number comes from site config; `prefill` seeds the message
  | 'tel'
  | 'email'
  | 'external' // `target` is an absolute URL
  | 'card'; // `target` is another card's slug — scrolls the feed

export interface Cta {
  kind: CtaKind;
  /** Required for 'external' (absolute URL) and 'card' (slug). Ignored otherwise. */
  target?: string;
  label: L10n;
  /** Use when the visible label is short and the destination is not obvious. */
  ariaLabel?: L10n;
  /** WhatsApp only: pre-typed message body. */
  prefill?: L10n;
}

/* ---------------------------------------------------------------- card base */

interface CardBase {
  /**
   * URL fragment — this is a shareable link (/#el-break). Once a card has been
   * shared, changing its slug breaks that link. Treat as permanent.
   */
  slug: string;
  /** Which tabs include this card. 'para-ti' is the curated set, not "all". */
  tabs: FeedTab[];
  /** Ascending. Leave gaps (10, 20, 30…) so you can insert without renumbering. */
  order: number;
  /** The card's <h2>, and the <title> when someone deep-links to it. */
  heading: L10n;
  /** Per-card share preview. Falls back to the site default when omitted. */
  share?: { image: string; description: L10n };
  /** Set false to keep a card in the repo but out of the build. */
  published?: boolean;
}

/* --------------------------------------------------------------- card types */

/**
 * First card. Loads eagerly — its poster is the LCP element, so it is the one
 * image on the site that is NOT lazy-loaded.
 */
export interface IntroCard extends CardBase {
  type: 'intro';
  /** A proper noun. Not translated. */
  name: string;
  /** One line on what you do. */
  role: L10n;
  clip: Clip;
  cta: Cta;
}

export interface Client {
  /** Business name — proper noun, never translated. */
  name: string;
  /** "Restaurante", "Panadería" — translated. */
  kind: L10n;
  /** Municipio. This is what the `local` tab filters on. */
  city: string;
  owner?: {
    name: string;
    photo: Img;
    /**
     * You must have asked before publishing someone's face. Required literal
     * `true` so this is an explicit act, not a default.
     */
    photoConsent: true;
  };
}

/**
 * The most important element on the site. Both shots must be taken at the same
 * viewport width so the comparison is honest and the two images line up.
 */
export interface BeforeAfter {
  before: Img;
  after: Img;
  /** One plain line of framing: "El sitio viejo no se veía bien en teléfono." */
  note?: L10n;
}

/**
 * The device-width demo. Sites that send X-Frame-Options or a restrictive
 * CSP frame-ancestors cannot be embedded, and the failure is silent — the
 * iframe just stays blank. So the mode is declared here rather than detected,
 * and `framingCheckedOn` records when you last confirmed it.
 */
export type Demo =
  | {
      mode: 'live';
      url: string;
      /** Required: becomes the iframe's title attribute. */
      title: L10n;
      /** ISO date (YYYY-MM-DD) you last verified the site allows framing. */
      framingCheckedOn: string;
    }
  | {
      mode: 'recorded';
      /** Kept on the record so the choice is auditable later. */
      reason: 'x-frame-options' | 'frame-ancestors' | 'too-heavy' | 'other';
      clip: Clip;
    };

/** Widths the demo buttons switch between. Labels live in src/i18n/. */
export const DEVICE_PRESETS = [
  { id: 'phone', width: 390, height: 844 },
  { id: 'tablet', width: 820, height: 1180 },
  { id: 'desktop', width: 1280, height: 800 },
] as const;
export type DeviceId = (typeof DEVICE_PRESETS)[number]['id'];

export interface ProjectCard extends CardBase {
  type: 'project';
  client: Client;
  beforeAfter: BeforeAfter;
  demo: Demo;
  /**
   * What changed for the business, in their words. "Ahora toma órdenes por
   * internet" — never "construido con Astro".
   */
  outcomes: L10n[];
  /** Exactly one. Not a "mobile version" link and a "desktop version" link. */
  liveUrl: string;
  quote?: { text: L10n; attribution: string };
}

export interface Tier {
  id: string;
  name: L10n;
  /** Whole USD. Rendered as "desde $X" — this is a floor, not a quote. */
  priceFrom: number;
  billing: 'once' | 'monthly' | 'yearly';
  includes: L10n[];
  /** Visually emphasised. At most one tier across the card. */
  featured?: boolean;
}

export interface PricingCard extends CardBase {
  type: 'pricing';
  tiers: Tier[];
  /** The honest caveat under the table — what moves the price. */
  note: L10n;
  cta: Cta;
}

export type IconId = 'globe' | 'server' | 'refresh' | 'shield' | 'phone' | 'search';

/** "What you get" — answers what they are actually buying. */
export interface InclusionsCard extends CardBase {
  type: 'inclusions';
  items: {
    icon: IconId;
    title: L10n;
    /** Answer the unspoken question, especially "who fixes it when it breaks". */
    body: L10n;
  }[];
}

export interface AboutCard extends CardBase {
  type: 'about';
  portrait: Img;
  /** Short and human. Two or three paragraphs, not a resume. */
  body: L10nText;
}

export interface FormField {
  name: string;
  type: 'text' | 'tel' | 'email' | 'textarea';
  label: L10n;
  required?: boolean;
  autocomplete?: string;
}

export interface ContactCard extends CardBase {
  type: 'contact';
  /** Rendered in order. WhatsApp goes first — it is the channel here. */
  primary: Cta[];
  /**
   * Secondary email form. The site is static with no backend, so this posts to
   * a third-party endpoint; omit `endpoint` to render a mailto: link instead.
   */
  form?: {
    endpoint?: string;
    fields: FormField[];
    submitLabel: L10n;
  };
  hours?: L10n;
}

/** Last card. The feed is finite and says so — it never loops back silently. */
export interface EndCard extends CardBase {
  type: 'end';
  body: L10nText;
  cta: Cta;
}

export type Card =
  | IntroCard
  | ProjectCard
  | PricingCard
  | InclusionsCard
  | AboutCard
  | ContactCard
  | EndCard;

export type CardType = Card['type'];

/* -------------------------------------------------------------- site config */

export interface SiteConfig {
  /** Canonical origin, no trailing slash. Used for og:url, sitemap, hreflang. */
  url: string;
  person: {
    name: string;
    role: L10n;
    portrait: Img;
  };
  /** Your municipio. Drives "Local" copy and the JSON-LD address. */
  city: string;
  /** Municipios you serve. Emitted as LocalBusiness areaServed. */
  serviceArea: string[];
  geo: { lat: number; lng: number };
  contact: {
    /** E.164 digits only, no + or spaces: "17875551234". Used to build wa.me. */
    whatsapp: string;
    /** Display form: "(787) 555-1234". */
    phone: string;
    email: string;
  };
  /** Fallback Open Graph image for cards that define no `share`. */
  defaultShareImage: string;
}
