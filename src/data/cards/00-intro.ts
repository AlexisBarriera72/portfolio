import { site } from '../site';
import type { IntroCard } from '../types';

/**
 * First card of "Para ti" and the home page. Its picture is the LCP element
 * there, so it is the only media on that page that loads eagerly.
 * It is not in the other tabs: someone who taps "Contacto" wants the contact
 * card, not the intro video first.
 */
const card: IntroCard = {
  type: 'intro',
  slug: 'inicio',
  tabs: ['para-ti'],
  order: 0,

  heading: {
    es: 'Páginas web para negocios de aquí',
    en: 'Websites for businesses from here',
  },

  name: 'Alexis',
  role: {
    es: 'Le hago la página a tu negocio. Rápida, en tu teléfono, y sin palabras raras.',
    en: 'I build your business a website. Fast, works on your phone, no jargon.',
  },

  // Your portrait fills the card. To greet visitors with a video instead, add
  // a `clip` here (see IntroCard in ../types.ts): WebM + MP4 under 2 MB each in
  // public/media/intro/, a poster image, and captions in both languages.
  picture: site.person.portrait,

  cta: {
    kind: 'card',
    target: 'precios',
    label: { es: 'Ver precios', en: 'See pricing' },
  },
};

export default card;
