import { DEFAULT_LOCALE, LOCALES, type L10n, type Locale } from '../content/types';
import { en } from './en';
import { es } from './es';
import type { UIStrings } from './types';

export type { UIStrings };

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
 */
export function localePath(locale: Locale, path = '/'): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return locale === DEFAULT_LOCALE ? clean : `/${locale}${clean === '/' ? '' : clean}`;
}

/** The other locale — the language toggle only ever has one destination. */
export function otherLocale(locale: Locale): Locale {
  return locale === 'es' ? 'en' : 'es';
}

/** Every locale/path pair, for the <link rel="alternate" hreflang> block. */
export function alternates(path = '/'): { locale: Locale; href: string; hreflang: string }[] {
  return LOCALES.map((locale) => ({
    locale,
    href: localePath(locale, path),
    hreflang: dictionaries[locale].htmlLang,
  }));
}
