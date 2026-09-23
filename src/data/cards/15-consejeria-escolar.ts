import type { ProjectCard } from '../types';

/**
 * The counseling office of a high school in Ponce. The office had no website
 * at all, so there is no "before" picture — the note says what it had.
 * Facts come from the project's own PRODUCT.md.
 *
 * The live site still shows placeholders ("Escuela Superior [Nombre]",
 * Lorem Ipsum) until the school sends its real text. Re-capture then:
 *   npm run capture -- https://consejeria-escolar.vercel.app consejeria-escolar --click "Continuar como invitado"
 */
const card: ProjectCard = {
  type: 'project',
  slug: 'consejeria-escolar',
  tabs: ['para-ti', 'local'],
  order: 15,

  heading: {
    es: 'Consejería Escolar',
    en: 'Consejería Escolar',
  },

  client: {
    name: 'Consejería Escolar',
    kind: { es: 'Oficina de consejería escolar', en: 'School counseling office' },
    city: 'Ponce',
  },

  beforeAfter: {
    after: {
      src: 'consejeria-escolar/phone.webp',
      alt: {
        es: 'La página de la Consejería Escolar en un teléfono: el título «Por dónde empezar» y la primera sección, Preguntas y Guías.',
        en: 'The Consejería Escolar site on a phone: the heading “Por dónde empezar” (Where to start) and the first section, Questions and Guides.',
      },
    },
    note: {
      es: 'Antes la oficina no tenía nada en internet: un tablón de corcho y circulares en la mochila.',
      en: 'Before, the office had nothing online: a corkboard and circulars sent home in backpacks.',
    },
  },

  // Checked 2026-09-23 from the site's code: next.config.ts sends no
  // X-Frame-Options or frame-ancestors, and there is no middleware. Confirm
  // against the live site with:
  //   curl -sI https://consejeria-escolar.vercel.app | grep -iE '^x-frame-options|frame-ancestors'
  demo: {
    mode: 'live',
    title: {
      es: 'Sitio de la Consejería Escolar, en vivo',
      en: 'The Consejería Escolar site, live',
    },
    framingCheckedOn: '2026-09-23',
  },

  outcomes: [
    {
      es: 'Estudiantes y encargados encuentran guías y avisos desde el celular, sin tener que preguntar.',
      en: 'Students and guardians find guides and notices on their phone, without having to ask.',
    },
    {
      es: 'La consejera publica un aviso con un formulario corto, y el aviso se quita solo cuando vence.',
      en: 'The counselor posts a notice with one short form, and it takes itself down when it expires.',
    },
    {
      es: 'Mantenerla en línea no cuesta nada.',
      en: 'Keeping it online costs nothing.',
    },
  ],

  liveUrl: 'https://consejeria-escolar.vercel.app',
};

export default card;
