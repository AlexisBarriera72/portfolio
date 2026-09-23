import type { InclusionsCard } from '../types';

/**
 * They do not know what they are buying. Each item answers a question the
 * owner is too embarrassed to ask out loud. Three per card, so each card fits
 * one phone screen; the rest are in 45-que-mas-incluye.ts.
 */
const card: InclusionsCard = {
  type: 'inclusions',
  slug: 'que-incluye',
  tabs: ['para-ti', 'precios'],
  order: 40,

  heading: {
    es: 'Qué incluye, en cristiano',
    en: 'What you get, in plain words',
  },

  items: [
    {
      icon: 'globe',
      title: { es: 'El nombre en internet', en: 'Your name on the internet' },
      body: {
        es: 'Tu dirección propia, como tunegocio.com. Yo la compro y la pongo a tu nombre. Es tuya, no mía.',
        en: 'Your own address, like yourbusiness.com. I buy it and register it in your name. It belongs to you, not me.',
      },
    },
    {
      icon: 'server',
      title: { es: 'Dónde vive la página', en: 'Where the site lives' },
      body: {
        es: 'La página necesita estar guardada en algún sitio para que la gente la vea. Eso va incluido el primer año.',
        en: 'A website has to be stored somewhere for people to see it. That is included for the first year.',
      },
    },
    {
      icon: 'refresh',
      title: { es: 'Cambiar cosas después', en: 'Changing things later' },
      body: {
        es: 'Subiste el precio del pastelillo, cambiaste el horario. Me escribes por WhatsApp y lo cambio el mismo día.',
        en: 'You raised a price or changed your hours. Message me on WhatsApp and I change it the same day.',
      },
    },
  ],
};

export default card;
