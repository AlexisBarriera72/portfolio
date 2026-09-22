import type { AboutCard } from '../types';

/** Short, personal, human. TODO(alexis): rewrite this in your own voice. */
const card: AboutCard = {
  type: 'about',
  slug: 'sobre-mi',
  tabs: ['para-ti', 'sobre-mi'],
  order: 50,

  heading: {
    es: 'Quién te está hablando',
    en: 'Who you are talking to',
  },

  portrait: {
    src: '/media/alexis/retrato.webp',
    alt: {
      es: 'Alexis, sonriendo, sentado frente a una laptop en un café.',
      en: 'Alexis, smiling, sitting in front of a laptop at a café.',
    },
    width: 800,
    height: 1000,
  },

  body: {
    es: [
      'Soy Alexis. Vivo en Ponce y trabajo con negocios del área sur.',
      'No soy una agencia ni un call center. Cuando me escribes, te contesto yo. Si algo se rompe un sábado, lo arreglo yo.',
      'Me gusta cuando el dueño entiende su propia página. Si te tengo que explicar algo con palabras raras, es que lo hice mal.',
    ],
    en: [
      'I am Alexis. I live in Ponce and I work with businesses around the south.',
      'I am not an agency or a call center. When you message me, I am the one who answers. If something breaks on a Saturday, I am the one who fixes it.',
      'I like it when an owner understands their own website. If I have to explain something to you in jargon, I built it wrong.',
    ],
  },
};

export default card;
