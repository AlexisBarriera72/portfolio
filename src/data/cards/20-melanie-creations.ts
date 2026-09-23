import type { ProjectCard } from '../types';

/**
 * Melanie's treats and celebration orders, in League City, Texas — outside
 * the service area, so it is in "Para ti" but not "Local" (the build checks).
 * Featured with her permission. Facts come from the project's README.
 *
 * Her site sends frame-ancestors 'none' and X-Frame-Options: DENY, so it
 * cannot be shown live in the demo window: the demo is screenshots at each
 * device size instead. Re-capture after a redesign with:
 *   npm run capture -- https://melaniecreations.net melanie-creations --wait 4000
 */
const card: ProjectCard = {
  type: 'project',
  slug: 'melanie-creations',
  tabs: ['para-ti'],
  order: 20,

  heading: {
    es: 'Melanie Creations',
    en: 'Melanie Creations',
  },

  client: {
    name: 'Melanie Creations',
    kind: { es: 'Galletas y dulces para celebraciones', en: 'Cookies and treats for celebrations' },
    city: 'League City, Texas',
  },

  beforeAfter: {
    after: {
      src: 'melanie-creations/phone.webp',
      alt: {
        es: 'La página de Melanie Creations en un teléfono: una caja con seis galletas decoradas y, debajo, las secciones de la página.',
        en: 'The Melanie Creations site on a phone: a box of six decorated cookies with the site’s sections below it.',
      },
    },
    note: {
      es: 'Antes sus trabajos estaban solo en Instagram y Facebook.',
      en: 'Before, her work was only on Instagram and Facebook.',
    },
  },

  demo: {
    mode: 'screenshots',
    reason: 'frame-ancestors',
    shots: {
      phone: {
        src: 'melanie-creations/phone.webp',
        alt: {
          es: 'En un teléfono: la caja de galletas arriba y las secciones debajo.',
          en: 'On a phone: the cookie box on top and the sections below it.',
        },
      },
      tablet: {
        src: 'melanie-creations/tablet.webp',
        alt: {
          es: 'En una tableta: las secciones a la izquierda, la caja de galletas a la derecha y los enlaces a Instagram y Facebook abajo.',
          en: 'On a tablet: the sections on the left, the cookie box on the right, and Instagram and Facebook links at the bottom.',
        },
      },
      desktop: {
        src: 'melanie-creations/desktop.webp',
        alt: {
          es: 'En una computadora: el menú arriba, las secciones en letras grandes a la izquierda y la caja de galletas a la derecha.',
          en: 'On a computer: the menu on top, the sections in large type on the left, and the cookie box on the right.',
        },
      },
    },
  },

  outcomes: [
    {
      es: 'Sus 113 fotos, ordenadas por tipo, en vez de perdidas en el feed.',
      en: 'Her 113 photos, sorted by kind instead of lost in a feed.',
    },
    {
      es: 'Los precios que ella misma publicó, en un solo lugar.',
      en: 'The prices she posted herself, all in one place.',
    },
    {
      es: 'El cliente escribe su pedido en la página y se lo manda por Instagram.',
      en: 'Customers write their request on the site and send it through Instagram.',
    },
  ],

  liveUrl: 'https://melaniecreations.net',
};

export default card;
