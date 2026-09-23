import { site } from '../data/site';
import { DEFAULT_LOCALE, LOCALES, type L10n, type Locale } from '../data/types';
import { en } from './en';
import { es } from './es';
import type { UIStrings } from './types';

export type { UIStrings };
export { format } from './format';

const dictionaries: Record<Locale, UIStrings> = { es, en };

/** UI chrome for a locale. */
export function t(locale: Locale): UIStrings {
  return dictionaries[locale];
}

/** Read one locale out of a piece of content. */
export function pick<T>(value: L10n<T>, locale: Locale): T {
  return value[locale];
}

/**
 * Spanish is served from the root and English from /en/, so the default
 * language costs no redirect and no extra path segment.
 *
 * Page paths always end in a slash, matching `trailingSlash: 'always'` and the
 * folders the build writes (/en/index.html). A link to "/en" would cost a
 * redirect on most hosts, and the sitemap, hreflang and canonical tags would
 * name two different URLs for one page.
 *
 *   localePath('es')              → "/"
 *   localePath('en')              → "/en/"
 *   localePath('en', 'el-break')  → "/en/el-break/"
 */
export function localePath(locale: Locale, path = '/'): string {
  const segments = path.split('/').filter(Boolean);
  if (locale !== DEFAULT_LOCALE) segments.unshift(locale);
  return segments.length === 0 ? '/' : `/${segments.join('/')}/`;
}

/** Full URL for a site path — for canonical, og:url and hreflang, which must be absolute. */
export function absoluteUrl(path: string): string {
  return `${site.url}${path}`;
}

/** The other locale — the language toggle only ever has one destination. */
export function otherLocale(locale: Locale): Locale {
  const other = LOCALES.find((l) => l !== locale);
  if (!other) throw new Error('otherLocale needs at least two locales');
  return other;
}

/**
 * The <link rel="alternate" hreflang> set for one page, as absolute URLs, plus
 * x-default pointing at Spanish for visitors whose language matches neither.
 * `path` is locale-free: alternates('/el-break/').
 */
export function alternates(path = '/'): { hreflang: string; href: string }[] {
  return [
    ...LOCALES.map((locale) => ({
      hreflang: dictionaries[locale].htmlLang,
      href: absoluteUrl(localePath(locale, path)),
    })),
    { hreflang: 'x-default', href: absoluteUrl(localePath(DEFAULT_LOCALE, path)) },
  ];
}

/** "$450". Whole dollars — prices on the site are floors, never cents. */
export function formatPrice(amount: number, locale: Locale): string {
  return new Intl.NumberFormat(dictionaries[locale].htmlLang, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}
