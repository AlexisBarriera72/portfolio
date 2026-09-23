import type { ProjectCard } from '../types';

/**
 * COPY THIS FILE to add a client.
 *
 *   1. cp _template.project.ts 20-nombre-del-cliente.ts
 *      The number in the file name must equal `order` below.
 *   2. Fill every TODO. `npm run build` type-checks first (a missing field
 *      fails), then refuses duplicate slugs, dead links, http:// URLs, and —
 *      for the real production build — any leftover TODO or missing image.
 *   3. Drop the images in src/assets/media/<slug>/ (screenshots, owner photo)
 *      and any video in public/media/<slug>/. Nothing else to register — the
 *      build reads each image's size and makes the small versions itself.
 *
 * Files starting with _ are excluded from the feed, so this one never renders.
 */
const card: ProjectCard = {
  type: 'project',

  /** Permanent — this becomes /slug/ and people share it. Kebab-case. */
  slug: 'TODO-slug',

  /**
   * 'para-ti' is the curated reel, not "everything". 'local' is required
   * exactly when client.city is in site.serviceArea — the build checks it.
   */
  tabs: ['para-ti', 'local'],

  /** Gaps of 10 so you can slot a card between two others later. Must match the file name. */
  order: 20,

  heading: {
    es: 'TODO Nombre del negocio',
    en: 'TODO Business name',
  },

  client: {
    name: 'TODO Nombre del negocio',
    kind: { es: 'TODO Panadería', en: 'TODO Bakery' },
    /** Municipio. Drives the Local tab and the "Cliente en X" line. */
    city: 'TODO Ponce',
    // Only include `owner` once you have the photo AND their permission.
    // owner: {
    //   name: 'TODO',
    //   photo: { src: 'TODO-slug/dueno.webp', alt: { es: 'TODO', en: 'TODO' } },
    //   photoConsent: true,
    // },
  },

  /**
   * Shoot both at the SAME viewport width and size (e.g. two 390-wide phone
   * screenshots). If the "before" is a phone screenshot and the "after" is a
   * desktop one, the comparison is dishonest and a sharp owner will notice.
   * The production build refuses two files of different dimensions.
   *
   * No old site? Leave `before` out and say what they had in `note`
   * ("Antes solo tenía Instagram"). `npm run capture -- <url> <slug>` takes
   * the "after" (despues.webp) and the three device screenshots for you.
   */
  beforeAfter: {
    before: {
      src: 'TODO-slug/antes.webp',
      alt: {
        es: 'TODO: describe qué se ve mal en la página vieja.',
        en: 'TODO: describe what looks wrong on the old page.',
      },
    },
    after: {
      src: 'TODO-slug/despues.webp',
      alt: {
        es: 'TODO: describe qué se ve en la página nueva.',
        en: 'TODO: describe what the new page shows.',
      },
    },
    note: {
      es: 'TODO: una línea sobre cuál era el problema.',
      en: 'TODO: one line about what the problem was.',
    },
  },

  /**
   * Check whether the site can be framed BEFORE choosing 'live':
   *   curl -sI https://elsitio.com | grep -iE '^x-frame-options|frame-ancestors'
   * Any output means you need mode 'recorded' — a blocked iframe renders blank
   * with no error you can catch in JS. (Other CSP rules don't matter; only
   * frame-ancestors controls framing.) A live demo frames `liveUrl` below.
   *
   * If it can't be framed, show screenshots at each size instead:
   *   demo: {
   *     mode: 'screenshots',
   *     reason: 'frame-ancestors',
   *     shots: {
   *       phone: { src: 'TODO-slug/phone.webp', alt: { es: '…', en: '…' } },
   *       tablet: { src: 'TODO-slug/tablet.webp', alt: { es: '…', en: '…' } },
   *       desktop: { src: 'TODO-slug/desktop.webp', alt: { es: '…', en: '…' } },
   *     },
   *   },
   */
  demo: {
    mode: 'live',
    title: {
      es: 'Sitio de TODO, en vivo',
      en: 'TODO’s live website',
    },
    framingCheckedOn: 'TODO-YYYY-MM-DD',
    // Shown behind the demo's "Capturas" switch, for when the frame stays
    // blank. Take all three with: npm run capture -- https://TODO.com TODO-slug
    shots: {
      phone: { src: 'TODO-slug/phone.webp', alt: { es: 'TODO', en: 'TODO' } },
      tablet: { src: 'TODO-slug/tablet.webp', alt: { es: 'TODO', en: 'TODO' } },
      desktop: { src: 'TODO-slug/desktop.webp', alt: { es: 'TODO', en: 'TODO' } },
    },
  },

  /**
   * What changed FOR THE BUSINESS. Test: could the owner say this sentence to
   * a friend? "Ahora toma órdenes por internet" passes. "Migré a Astro" fails.
   */
  outcomes: [
    { es: 'TODO', en: 'TODO' },
    { es: 'TODO', en: 'TODO' },
    { es: 'TODO', en: 'TODO' },
  ],

  /** ONE link, https. Not a mobile one and a desktop one. The live demo frames it too. */
  liveUrl: 'https://TODO.com',

  // quote: {
  //   text: { es: 'TODO', en: 'TODO' },
  //   attribution: 'TODO Nombre, dueño de TODO',
  // },
};

export default card;
