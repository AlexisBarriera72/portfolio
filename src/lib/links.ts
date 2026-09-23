import { getCard, pathForCard } from '../data';
import { site } from '../data/site';
import type { Cta, Locale } from '../data/types';

export interface CtaLink {
  href: string;
  /** Opens outside the site (new tab), so it gets rel=noopener and a screen-reader note. */
  external: boolean;
  /** For links to another card: its slug, so the feed can scroll there instead of navigating. */
  card?: string;
}

/** Where a call to action goes. Every contact detail comes from site config. */
export function ctaLink(cta: Cta, locale: Locale): CtaLink {
  switch (cta.kind) {
    case 'whatsapp':
      return { href: whatsappUrl(cta.prefill?.[locale]), external: true };
    case 'tel':
      return { href: `tel:${site.contact.phone.e164}`, external: false };
    case 'email':
      return { href: `mailto:${site.contact.email}`, external: false };
    case 'external':
      return { href: cta.href, external: true };
    case 'card': {
      const target = getCard(cta.target);
      if (!target) throw new Error(`CTA points at missing card "${cta.target}"`);
      return { href: pathForCard(target, locale), external: false, card: target.slug };
    }
  }
}

/** A wa.me link that opens a chat with the message already typed. */
export function whatsappUrl(message?: string): string {
  const base = `https://wa.me/${site.contact.whatsapp}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
