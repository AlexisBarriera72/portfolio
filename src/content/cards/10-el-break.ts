import type { ProjectCard } from '../types';

/**
 * Flagship project. This is the card the whole schema was shaped around —
 * if a new project does not fit this shape, the schema is wrong, not the project.
 */
const card: ProjectCard = {
  type: 'project',
  slug: 'el-break',
  tabs: ['para-ti', 'local'],
  order: 10,

  heading: {
    es: 'El Break Food Truck',
    en: 'El Break Food Truck',
  },

  client: {
    name: 'El Break Food Truck',
    kind: { es: 'Food truck', en: 'Food truck' },
    city: 'Yauco',
    // TODO(alexis): add the owner once you have a photo and their permission.
    // owner: { name: '…', photo: { … }, photoConsent: true },
  },

  beforeAfter: {
    before: {
      src: '/media/el-break/antes.webp',
      alt: {
        es: 'La página vieja de El Break: una foto borrosa del menú escrita a mano, difícil de leer en el teléfono.',
        en: 'El Break’s old page: a blurry photo of a handwritten menu, hard to read on a phone.',
      },
      width: 780,
      height: 1688,
    },
    after: {
      src: '/media/el-break/despues.webp',
      alt: {
        es: 'La página nueva de El Break: la carta con precios claros y el horario de hoy arriba.',
        en: 'El Break’s new page: the menu with clear prices and today’s hours at the top.',
      },
      width: 780,
      height: 1688,
    },
    note: {
      es: 'Antes el menú era una foto. Había que estirar la pantalla para leer los precios.',
      en: 'The menu used to be a photo. You had to pinch and zoom to read the prices.',
    },
  },

  demo: {
    mode: 'live',
    title: {
      es: 'Sitio de El Break Food Truck, en vivo',
      en: 'El Break Food Truck’s live website',
    },
    framingCheckedOn: '2026-09-19',
  },

  outcomes: [
    {
      es: 'La gente ve si el truck está abierto ahora mismo, sin llamar.',
      en: 'People can see whether the truck is open right now, without calling.',
    },
    {
      es: 'La carta y los precios se leen del tirón en el teléfono.',
      en: 'The menu and prices are readable at a glance on a phone.',
    },
    {
      es: 'El cliente arma su bowl antes de llegar, así la fila camina más rápido.',
      en: 'Customers build their bowl before arriving, so the line moves faster.',
    },
  ],

  liveUrl: 'https://elbreak.example', // TODO(alexis): the real public URL — the live demo frames it too

  // quote: {
  //   text: { es: '…', en: '…' },
  //   attribution: 'Nombre, dueño de El Break',
  // },
};

export default card;
