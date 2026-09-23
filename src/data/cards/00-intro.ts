import type { IntroCard } from '../types';

/**
 * First card in every tab. Its poster image is the LCP element on the site,
 * so it is the only media that loads eagerly.
 */
const card: IntroCard = {
  type: 'intro',
  slug: 'inicio',
  tabs: ['para-ti', 'local', 'precios', 'sobre-mi', 'contacto'],
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

  clip: {
    webm: '/media/intro/saludo.webm',
    mp4: '/media/intro/saludo.mp4',
    poster: 'intro/saludo-poster.jpg',
    posterAlt: {
      es: 'Alexis mirando a la cámara, listo para hablar.',
      en: 'Alexis looking at the camera, about to speak.',
    },
    sound: true,
    transcript: {
      es: [
        'Hola, soy Alexis. Hago páginas web para negocios pequeños en Puerto Rico.',
        'Desliza para arriba y te enseño trabajos que he hecho y cuánto cuesta.',
      ],
      en: [
        'Hi, I am Alexis. I build websites for small businesses in Puerto Rico.',
        'Swipe up and I will show you work I have done and what it costs.',
      ],
    },
  },

  cta: {
    kind: 'card',
    target: 'precios',
    label: { es: 'Ver precios', en: 'See pricing' },
  },
};

export default card;
