import type { PricingCard } from '../types';

/**
 * Prices are here because business owners leave rather than ask for a quote.
 * These are starting numbers, not quotes — TODO(alexis): replace with yours.
 */
const card: PricingCard = {
  type: 'pricing',
  slug: 'precios',
  tabs: ['para-ti', 'precios'],
  order: 30,

  heading: {
    es: 'Cuánto cuesta',
    en: 'What it costs',
  },

  tiers: [
    {
      id: 'sencilla',
      name: { es: 'Página sencilla', en: 'Simple page' },
      priceFrom: 450,
      billing: 'once',
      includes: [
        { es: 'Una página con todo lo importante', en: 'One page with everything that matters' },
        { es: 'Se ve bien en teléfono', en: 'Looks right on a phone' },
        { es: 'Botón de WhatsApp y de llamar', en: 'WhatsApp and call buttons' },
        { es: 'Tu negocio en Google', en: 'Your business on Google' },
      ],
    },
    {
      id: 'completa',
      name: { es: 'Página completa', en: 'Full website' },
      priceFrom: 900,
      billing: 'once',
      featured: true,
      includes: [
        { es: 'Varias páginas: carta, fotos, contacto', en: 'Several pages: menu, photos, contact' },
        { es: 'Carta o catálogo que tú mismo cambias', en: 'A menu or catalog you can change yourself' },
        { es: 'Formulario de órdenes o reservaciones', en: 'An order or booking form' },
        { es: 'Todo lo de la página sencilla', en: 'Everything in the simple page' },
      ],
    },
    {
      id: 'mantenimiento',
      name: { es: 'Mantenimiento', en: 'Maintenance' },
      priceFrom: 30,
      billing: 'monthly',
      includes: [
        { es: 'Yo arreglo si algo se rompe', en: 'I fix it when something breaks' },
        { es: 'Cambios pequeños cuando los necesites', en: 'Small changes whenever you need them' },
        { es: 'Copia de seguridad todas las semanas', en: 'A backup every week' },
      ],
    },
  ],

  note: {
    es: 'Estos son precios de partida. El precio final depende de cuántas páginas lleve y si hay que tomar fotos. Te digo el número exacto antes de empezar, y no cambia después.',
    en: 'These are starting prices. The final price depends on how many pages it needs and whether photos have to be taken. I give you the exact number before we start, and it does not change after.',
  },

  // TODO(alexis): put the real yearly number here. The production build will
  // not ship until this line has no TODO in it.
  afterFirstYear: {
    es: 'TODO: Del segundo año en adelante, el dominio y el hosting cuestan $__ al año.',
    en: 'TODO: From the second year on, the domain and hosting cost $__ per year.',
  },

  cta: {
    kind: 'whatsapp',
    label: { es: 'Pregúntame por WhatsApp', en: 'Ask me on WhatsApp' },
    prefill: {
      es: 'Hola Alexis, vi tu portafolio y quiero saber el precio para mi negocio.',
      en: 'Hi Alexis, I saw your portfolio and I would like a price for my business.',
    },
  },
};

export default card;
