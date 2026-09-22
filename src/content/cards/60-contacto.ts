import type { ContactCard } from '../types';

/** WhatsApp is the channel. The form exists for the minority who prefer email. */
const card: ContactCard = {
  type: 'contact',
  slug: 'contacto',
  tabs: ['para-ti', 'contacto'],
  order: 60,

  heading: {
    es: 'Escríbeme',
    en: 'Get in touch',
  },

  primary: [
    {
      kind: 'whatsapp',
      label: { es: 'WhatsApp', en: 'WhatsApp' },
      ariaLabel: { es: 'Escribirle a Alexis por WhatsApp', en: 'Message Alexis on WhatsApp' },
      prefill: {
        es: 'Hola Alexis, tengo un negocio y quiero una página.',
        en: 'Hi Alexis, I have a business and I would like a website.',
      },
    },
    {
      kind: 'tel',
      label: { es: 'Llamar', en: 'Call' },
      ariaLabel: { es: 'Llamar a Alexis por teléfono', en: 'Call Alexis on the phone' },
    },
  ],

  // The site is static, so a working form needs a third-party endpoint. Until
  // there is one, this renders a plain "email me" link.
  form: { mode: 'mailto' },
  // TODO(alexis): to get a real form, sign up for Formspree/Basin and replace
  // the line above with this:
  //
  // form: {
  //   mode: 'post',
  //   endpoint: 'https://formspree.io/f/…',
  //   submitLabel: { es: 'Enviar', en: 'Send' },
  //   fields: [
  //     { name: 'nombre', type: 'text', label: { es: 'Tu nombre', en: 'Your name' }, required: true, autocomplete: 'name' },
  //     { name: 'negocio', type: 'text', label: { es: 'Nombre del negocio', en: 'Business name' }, autocomplete: 'organization' },
  //     { name: 'telefono', type: 'tel', label: { es: 'Teléfono', en: 'Phone' }, required: true, autocomplete: 'tel' },
  //     { name: 'mensaje', type: 'textarea', label: { es: '¿Qué necesitas?', en: 'What do you need?' }, required: true },
  //   ],
  // },

  hours: {
    es: 'Contesto de lunes a sábado, de 9:00 a. m. a 7:00 p. m.',
    en: 'I answer Monday through Saturday, 9:00 a.m. to 7:00 p.m.',
  },
};

export default card;
