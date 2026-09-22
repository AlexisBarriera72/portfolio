import type { EndCard } from '../types';

/**
 * The feed ends here and says so. It does not loop back to the top on its own —
 * a silent loop makes a visitor feel lost, and they leave instead of writing.
 */
const card: EndCard = {
  type: 'end',
  slug: 'fin',
  tabs: ['para-ti', 'local', 'precios', 'sobre-mi', 'contacto'],
  order: 90,

  heading: {
    es: 'Eso es todo',
    en: 'That’s everything',
  },

  body: {
    es: [
      'Ya viste el trabajo, los precios y quién soy.',
      'Si te sirve, escríbeme. Te contesto yo, hoy mismo.',
    ],
    en: [
      'You have seen the work, the prices and who I am.',
      'If it is a fit, message me. I answer personally, today.',
    ],
  },

  cta: {
    kind: 'whatsapp',
    label: { es: 'Hablemos por WhatsApp', en: 'Let’s talk on WhatsApp' },
    prefill: {
      es: 'Hola Alexis, llegué al final de tu portafolio. Hablemos.',
      en: 'Hi Alexis, I reached the end of your portfolio. Let’s talk.',
    },
  },
};

export default card;
