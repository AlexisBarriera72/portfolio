import type { SiteConfig } from './types';

/**
 * Everything about you that appears in more than one place.
 *
 * Values marked TODO are the ones I could not know — they need to be real
 * before the first deploy, because they end up in the JSON-LD and in the
 * WhatsApp link, and a wrong number here is a lost customer.
 */
export const site: SiteConfig = {
  url: 'https://example.com', // TODO(alexis): your domain, no trailing slash — astro.config reads this

  person: {
    name: 'Alexis', // TODO(alexis): full name as you want clients to read it
    role: {
      es: 'Hago páginas web para negocios pequeños en Puerto Rico.',
      en: 'I build websites for small businesses in Puerto Rico.',
    },
    portrait: {
      src: 'alexis/retrato.webp',
      alt: {
        es: 'Alexis, sonriendo, sentado frente a una laptop en un café.',
        en: 'Alexis, smiling, sitting in front of a laptop at a café.',
      },
    },
  },

  city: 'Ponce',
  /**
   * Municipios you actually travel to. This becomes LocalBusiness.areaServed,
   * so keep it honest — listing the whole island reads as a lie to Google and
   * to a customer in Yauco who wants somebody nearby.
   */
  serviceArea: [
    'Ponce',
    'Juana Díaz',
    'Villalba',
    'Coamo',
    'Santa Isabel',
    'Peñuelas',
    'Guayanilla',
    'Yauco',
    'Adjuntas',
  ],
  geo: { lat: 18.0111, lng: -66.6141 }, // Ponce

  contact: {
    whatsapp: '17875551234', // TODO(alexis): E.164 digits only — no +, no spaces
    phone: {
      e164: '+17875551234', // TODO(alexis): + and digits — goes in the tel: link
      display: '(787) 555-1234', // TODO(alexis): how people read it
    },
    email: 'elnenealexis72@gmail.com',
  },

  defaultShareImage: 'share-default.jpg',
};
