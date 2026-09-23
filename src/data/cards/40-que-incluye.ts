import type { InclusionsCard } from '../types';

/**
 * They do not know what they are buying. Each item answers a question the
 * owner is too embarrassed to ask out loud.
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
    {
      icon: 'shield',
      title: { es: 'Si se rompe, lo arreglo yo', en: 'If it breaks, I fix it' },
      body: {
        es: 'No tienes que buscar a nadie más ni aprender nada técnico. Me llamas y yo lo resuelvo.',
        en: 'You do not have to find anyone else or learn anything technical. You call me and I handle it.',
      },
    },
    {
      icon: 'search',
      title: { es: 'Que te encuentren en Google', en: 'Being found on Google' },
      body: {
        es: 'Dejo tu negocio puesto en Google con la dirección, el teléfono y el horario, para que salga cuando alguien busque.',
        en: 'I set your business up on Google with the address, phone and hours, so it shows up when someone searches.',
      },
    },
    {
      icon: 'phone',
      title: { es: 'Hecha para el teléfono', en: 'Built for the phone' },
      body: {
        es: 'Casi todos tus clientes van a entrar desde el celular. La página se hace primero para ahí, no para la computadora.',
        en: 'Almost all your customers will arrive on a phone. The site is built for that first, not for a desktop.',
      },
    },
  ],
};

export default card;
