/**
 * Content schema for the feed.
 *
 * Rules this file enforces at build time:
 *  - Nothing ships half-translated: every author-written string is an { es, en } pair.
 *  - A card cannot be rendered without the data its layout needs (discriminated union).
 *  - Images go through astro:assets, which reads their real size, so the feed
 *    never shifts while loading and nobody types a width by hand.
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

/**
 * An image file in src/assets/media/, written relative to that folder:
 * "el-break/antes.webp" → src/assets/media/el-break/antes.webp. The build
 * resizes and converts it (AVIF/WebP) and reads its real width and height.
 */
export type ImagePath = string;

/**
 * A file served as-is from public/, written as its URL: "/media/intro/saludo.mp4"
 * → public/media/intro/saludo.mp4. Used for video and captions, which the
 * image pipeline does not process.
 */
export type PublicPath = string;

export interface Img {
  src: ImagePath;
  /** Required. Describes what is IN the image, for screen readers and for SEO. */
  alt: L10n;
}

/**
 * A short clip. Always muted + looping + playsinline; the components add those.
 * Each file must stay under 2MB. The production build measures the real files
 * (see validate.ts), so there is no size to type in here and keep in sync.
 */
export interface Clip {
  webm: PublicPath;
  mp4: PublicPath;
  /** Shown until the clip plays, and whenever it is not the active card. */
  poster: ImagePath;
  posterAlt: L10n;
  /** The clip has speech or sound worth hearing — shows an unmute button. */
  sound?: boolean;
  /**
   * WebVTT caption file per locale. The clips autoplay muted, so a talking
   * clip without captions is a person moving their mouth in silence.
   */
  captions?: L10n<PublicPath>;
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

interface CtaBase {
  label: L10n;
  /** Use when the visible label is short and the destination is not obvious. */
  ariaLabel?: L10n;
}

/**
 * Each kind carries exactly the fields it uses, so a 'card' link without a
 * target or a phone link with a WhatsApp message cannot be written.
 */
export type Cta =
  /** Number comes from site config; `prefill` seeds the message. */
  | (CtaBase & { kind: 'whatsapp'; prefill?: L10n })
  /** Number comes from site config. */
  | (CtaBase & { kind: 'tel' })
  /** Address comes from site config. */
  | (CtaBase & { kind: 'email' })
  /** Absolute https:// URL. */
  | (CtaBase & { kind: 'external'; href: string })
  /** Another card's slug — scrolls the feed. */
  | (CtaBase & { kind: 'card'; target: string });

export type CtaKind = Cta['kind'];

/* ---------------------------------------------------------------- card base */

interface CardBase {
  /**
   * The card's own page: /el-break/ and /en/el-break/ (the intro lives at /).
   * Each card is pre-rendered at its path so a link shared on WhatsApp shows
   * that card's title and image — link previews never see a #fragment.
   * Once shared, changing a slug breaks the link. Treat as permanent.
   */
  slug: string;
  /** Which tabs include this card. 'para-ti' is the curated set, not "all". */
  tabs: FeedTab[];
  /** Ascending. Leave gaps (10, 20, 30…) so you can insert without renumbering. */
  order: number;
  /** The card's <h2>, and the <title> when someone deep-links to it. */
  heading: L10n;
  /** Per-card link preview (og:image / og:description on the card's page). Falls back to the site default. */
  share?: { image: ImagePath; description: L10n };
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
  /**
   * Municipio. The build checks that a project is in the `local` tab exactly
   * when this city is in site.serviceArea, so the two can never disagree.
   */
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
 * viewport width so the comparison is honest and the two images line up — the
 * production build checks that the two files have the same dimensions.
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
 *
 * A live demo frames the project's `liveUrl`; there is no second URL to keep
 * in sync.
 */
export type Demo =
  | {
      mode: 'live';
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
  /**
   * Exactly one. Not a "mobile version" link and a "desktop version" link.
   * Also what a live demo frames. Must be https — an http site inside an
   * https page is blocked as mixed content and the demo renders blank.
   */
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

/**
 * The secondary email channel. The site is static with no backend, so a real
 * form needs a third-party endpoint (Formspree, Basin…). Until there is one,
 * 'mailto' renders a plain "email me" link — and has no fields, because a form
 * that cannot be submitted should not exist in the data.
 */
export type ContactForm =
  | { mode: 'mailto' }
  | {
      mode: 'post';
      /** Absolute https:// URL of the form service. */
      endpoint: string;
      fields: FormField[];
      submitLabel: L10n;
    };

export interface ContactCard extends CardBase {
  type: 'contact';
  /** Rendered in order. WhatsApp goes first — it is the channel here. */
  primary: Cta[];
  form?: ContactForm;
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
  /**
   * Canonical origin, https, no trailing slash. The single source: astro.config
   * reads it for `site`, and og:url, the sitemap and hreflang derive from it.
   */
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
    phone: {
      /** Goes in the tel: link. With the +: "+17875551234". */
      e164: string;
      /** What people read: "(787) 555-1234". */
      display: string;
    };
    email: string;
  };
  /** Fallback link-preview image for cards that define no `share`. */
  defaultShareImage: ImagePath;
}
