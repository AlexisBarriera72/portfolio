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
      src: 'el-break/antes.webp',
      alt: {
        es: 'El menú viejo de El Break: una sola imagen con toda la carta —bowls, especialidades y precios— en letra pequeña; en el teléfono no se lee sin acercar.',
        en: 'El Break’s old menu: one image with the whole menu — bowls, specialties and prices — in small print; on a phone it can’t be read without zooming in.',
      },
    },
    after: {
      src: 'el-break/despues.webp',
      alt: {
        es: 'La carta nueva en el teléfono: «Del truck a tu mano» y la Burger Caramelizado con su foto, el precio de $10 y el botón «Añadir».',
        en: 'The new menu on a phone: “Del truck a tu mano” (From the truck to your hand) and the Burger Caramelizado with its photo, its $10 price and an “Añadir” (Add) button.',
      },
    },
    note: {
      es: 'Antes la carta era una sola imagen: había que acercar para leer los precios.',
      en: 'The menu used to be a single image: you had to zoom in to read the prices.',
    },
  },

  // The site sends X-Frame-Options: SAMEORIGIN (its vercel.json and
  // public/_headers), so it can't be shown live: screenshots at each size.
  // Taken from AlexisBarriera72/elbreak at 0c0d800, as it looks during opening
  // hours (it shows "Abierto ahora" then). Re-capture after a redesign with:
  //   npm run capture -- https://elbreak.vercel.app el-break --time 2026-09-23T12:00:00-04:00
  // (despues.webp is its "La carta" section at phone size; antes.webp is the
  // old menu image on a canvas of the same size.)
  demo: {
    mode: 'screenshots',
    reason: 'x-frame-options',
    shots: {
      phone: {
        src: 'el-break/phone.webp',
        alt: {
          es: 'En un teléfono: «Abierto ahora» arriba, el título «Tu break perfecto», hasta qué hora sirven hoy y el botón para llamar.',
          en: 'On a phone: “Abierto ahora” (Open now) at the top, the heading “Tu break perfecto”, how late they serve today and a call button.',
        },
      },
      tablet: {
        src: 'el-break/tablet.webp',
        alt: {
          es: 'En una tableta: el mismo inicio, la foto de una hamburguesa debajo y los botones de llamar y de ver la orden al pie.',
          en: 'On a tablet: the same opening, a photo of a burger below it and the call and order buttons at the bottom.',
        },
      },
      desktop: {
        src: 'el-break/desktop.webp',
        alt: {
          es: 'En una computadora: el menú arriba (Carta, Bowls, Crea tu bowl, Visítanos), el título a la izquierda y la foto de la hamburguesa a la derecha.',
          en: 'On a computer: the menu at the top (Carta, Bowls, Crea tu bowl, Visítanos), the heading on the left and the burger photo on the right.',
        },
      },
    },
  },

  // From the site itself (its README and src/data/site.json): the live
  // «Abierto ahora» status, the menu with prices, and orders — bowls built
  // in the page — sent to WhatsApp already written out.
  outcomes: [
    {
      es: 'La gente ve si el truck está abierto ahora mismo, sin llamar.',
      en: 'People can see whether the truck is open right now, without calling.',
    },
    {
      es: 'La carta y los precios se leen de un vistazo en el teléfono.',
      en: 'The menu and prices are readable at a glance on a phone.',
    },
    {
      es: 'Arman la orden —bowls incluidos— y llega por WhatsApp ya escrita.',
      en: 'Customers build their order — bowls included — and it arrives on WhatsApp written out.',
    },
  ],

  liveUrl: 'https://elbreak.vercel.app',

  // quote: {
  //   text: { es: '…', en: '…' },
  //   attribution: 'Nombre, dueño de El Break',
  // },
};

export default card;
