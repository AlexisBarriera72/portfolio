import { cards } from '../data';
import { site } from '../data/site';
import type { Card, Locale } from '../data/types';
import { absoluteUrl, formatPrice, localePath, t } from '../i18n';

/** "El Break Food Truck · Alexis · Páginas web en Ponce, PR"; the home page is just the site name. */
export function pageTitle(card: Card, locale: Locale): string {
  const { siteName } = t(locale);
  return card.type === 'intro' ? siteName : `${card.heading[locale]} · ${siteName}`;
}

export function pageDescription(card: Card, locale: Locale): string {
  return card.share?.description[locale] ?? t(locale).metaDescription;
}

/** The link-preview image for a card, as a data path (resolved by the page). */
export function shareImagePath(card: Card): string {
  if (card.share) return card.share.image;
  if (card.type === 'project') return card.beforeAfter.after.src;
  return site.defaultShareImage;
}

/**
 * schema.org data for the business. ProfessionalService is the LocalBusiness
 * subtype for service providers; areaServed lists the real municipios.
 */
export function businessJsonLd(locale: Locale, image?: string): Record<string, unknown> {
  const ui = t(locale);
  const prices = cards.flatMap((c) =>
    c.type === 'pricing' ? c.tiers.filter((tier) => tier.billing === 'once').map((tier) => tier.priceFrom) : [],
  );
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': `${site.url}/#business`,
    name: ui.siteName,
    description: ui.metaDescription,
    url: absoluteUrl(localePath(locale)),
    telephone: site.contact.phone.e164,
    ...(image ? { image } : {}),
    ...(prices.length > 0 ? { priceRange: `${formatPrice(Math.min(...prices), locale)}+` } : {}),
    address: {
      '@type': 'PostalAddress',
      addressLocality: site.city,
      addressRegion: 'PR',
      addressCountry: 'PR',
    },
    geo: { '@type': 'GeoCoordinates', latitude: site.geo.lat, longitude: site.geo.lng },
    areaServed: site.serviceArea.map((name) => ({ '@type': 'City', name })),
    availableLanguage: ['es', 'en'],
    founder: { '@type': 'Person', name: site.person.name },
  };
}

/**
 * JSON for a <script type="application/ld+json"> block. "<" is escaped so no
 * string in the data can close the script tag early.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
