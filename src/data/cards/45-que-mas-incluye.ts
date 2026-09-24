import type { InclusionsCard } from '../types';

/** The second half of "Qué incluye" (40-que-incluye.ts): three per card so each fits one screen. */
const card: InclusionsCard = {
  type: 'inclusions',
  slug: 'que-mas-incluye',
  tabs: ['para-ti', 'precios'],
  order: 45,

  heading: {
    es: 'Y qué más incluye',
    en: 'What else you get',
  },

  items: [
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
