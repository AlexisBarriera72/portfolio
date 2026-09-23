import { describe, expect, it } from 'vitest';
import type {
  AboutCard,
  Card,
  ContactCard,
  EndCard,
  InclusionsCard,
  IntroCard,
  PricingCard,
  ProjectCard,
  SiteConfig,
} from './types';
import { type CardEntry, MAX_CLIP_BYTES, validate } from './validate';

const l = (text: string) => ({ es: text, en: text });
const img = (src: string, width = 780, height = 1688) => ({ src, alt: l('alt'), width, height });

/** A small feed that passes every rule. Each test breaks exactly one thing. */
function fixture() {
  const site: SiteConfig = {
    url: 'https://alexis.dev',
    person: { name: 'Alexis', role: l('role'), portrait: img('/media/me.webp', 800, 1000) },
    city: 'Ponce',
    serviceArea: ['Ponce', 'Yauco'],
    geo: { lat: 18, lng: -66 },
    contact: {
      whatsapp: '17870000000',
      phone: { e164: '+17870000000', display: '(787) 000-0000' },
      email: 'hola@alexis.dev',
    },
    defaultShareImage: '/media/share.jpg',
  };
  const intro: IntroCard = {
    type: 'intro',
    slug: 'inicio',
    tabs: ['para-ti', 'local', 'precios', 'sobre-mi', 'contacto'],
    order: 0,
    heading: l('Hola'),
    name: 'Alexis',
    role: l('role'),
    clip: {
      webm: '/media/intro.webm',
      mp4: '/media/intro.mp4',
      poster: '/media/intro.jpg',
      posterAlt: l('poster'),
      width: 1080,
      height: 1920,
      durationSec: 9,
    },
    cta: { kind: 'card', target: 'precios', label: l('Precios') },
  };
  const project: ProjectCard = {
    type: 'project',
    slug: 'el-break',
    tabs: ['para-ti', 'local'],
    order: 10,
    heading: l('El Break'),
    client: { name: 'El Break', kind: l('Food truck'), city: 'Yauco' },
    beforeAfter: { before: img('/media/antes.webp'), after: img('/media/despues.webp') },
    demo: { mode: 'live', title: l('demo'), framingCheckedOn: '2026-09-01' },
    outcomes: [l('Toma órdenes')],
    liveUrl: 'https://elbreak.pr',
  };
  const pricing: PricingCard = {
    type: 'pricing',
    slug: 'precios',
    tabs: ['para-ti', 'precios'],
    order: 30,
    heading: l('Precios'),
    tiers: [
      { id: 'a', name: l('A'), priceFrom: 450, billing: 'once', includes: [l('x')] },
      { id: 'b', name: l('B'), priceFrom: 900, billing: 'once', includes: [l('y')], featured: true },
    ],
    note: l('note'),
    cta: { kind: 'whatsapp', label: l('WhatsApp') },
  };
  const inclusions: InclusionsCard = {
    type: 'inclusions',
    slug: 'que-incluye',
    tabs: ['para-ti', 'precios'],
    order: 40,
    heading: l('Incluye'),
    items: [{ icon: 'globe', title: l('t'), body: l('b') }],
  };
  const about: AboutCard = {
    type: 'about',
    slug: 'sobre-mi',
    tabs: ['para-ti', 'sobre-mi'],
    order: 50,
    heading: l('Yo'),
    portrait: img('/media/me.webp', 800, 1000),
    body: { es: ['p'], en: ['p'] },
  };
  const contact: ContactCard = {
    type: 'contact',
    slug: 'contacto',
    tabs: ['para-ti', 'contacto'],
    order: 60,
    heading: l('Escríbeme'),
    primary: [{ kind: 'whatsapp', label: l('WhatsApp') }, { kind: 'tel', label: l('Llamar') }],
    form: { mode: 'mailto' },
  };
  const end: EndCard = {
    type: 'end',
    slug: 'fin',
    tabs: ['para-ti', 'local', 'precios', 'sobre-mi', 'contacto'],
    order: 90,
    heading: l('Fin'),
    body: { es: ['p'], en: ['p'] },
    cta: { kind: 'whatsapp', label: l('WhatsApp') },
  };
  return { site, intro, project, pricing, inclusions, about, contact, end };
}

type Fixture = ReturnType<typeof fixture>;

function entriesOf(f: Fixture): CardEntry[] {
  const cards: Card[] = [f.intro, f.project, f.pricing, f.inclusions, f.about, f.contact, f.end];
  return cards.map((card) => ({ path: `./cards/${card.order}-${card.slug}.ts`, card }));
}

const TODAY = '2026-09-22';

/** Runs the validator on a fixture after `change` breaks one thing in it. */
function problemsAfter(change: (f: Fixture) => void, strict = false, fileSize?: (p: string) => number | undefined) {
  const f = fixture();
  change(f);
  return validate(entriesOf(f), f.site, { strict, today: TODAY, fileSize });
}

describe('validate — structure', () => {
  it('accepts a valid feed', () => {
    expect(problemsAfter(() => {})).toEqual([]);
  });

  it('rejects two cards with the same order', () => {
    const problems = problemsAfter((f) => {
      f.inclusions.order = 30;
    });
    expect(problems.join('\n')).toMatch(/share order 30/);
  });

  it('rejects a file name that disagrees with order', () => {
    const f = fixture();
    const entries = entriesOf(f).map((e) =>
      e.card.slug === 'precios' ? { ...e, path: './cards/35-precios.ts' } : e,
    );
    expect(validate(entries, f.site, { today: TODAY }).join('\n')).toMatch(/35 in its name but order 30/);
  });

  it('rejects a reserved slug', () => {
    const problems = problemsAfter((f) => {
      f.about.slug = 'en';
    });
    expect(problems.join('\n')).toMatch(/slug "en" is reserved/);
  });

  it('rejects a link to a card that does not exist', () => {
    const problems = problemsAfter((f) => {
      f.intro.cta = { kind: 'card', target: 'precio', label: l('x') };
    });
    expect(problems.join('\n')).toMatch(/links to card "precio"/);
  });

  it('rejects http:// and malformed URLs', () => {
    expect(problemsAfter((f) => void (f.project.liveUrl = 'http://elbreak.pr')).join('\n')).toMatch(/must use https/);
    expect(problemsAfter((f) => void (f.project.liveUrl = 'elbreak.pr')).join('\n')).toMatch(/not a full URL/);
    expect(
      problemsAfter((f) => {
        f.end.cta = { kind: 'external', href: 'httpfoo', label: l('x') };
      }).join('\n'),
    ).toMatch(/not a full URL/);
  });

  it('rejects a tab that only the intro and end cards would fill', () => {
    const problems = problemsAfter((f) => {
      f.about.tabs = ['para-ti'];
    });
    expect(problems.join('\n')).toMatch(/tab "sobre-mi" has no cards of its own/);
  });

  it('rejects more than one featured tier', () => {
    const problems = problemsAfter((f) => {
      for (const tier of f.pricing.tiers) tier.featured = true;
    });
    expect(problems.join('\n')).toMatch(/more than one tier/);
  });

  it('rejects before/after shots of different sizes', () => {
    const problems = problemsAfter((f) => {
      f.project.beforeAfter.after = img('/media/despues.webp', 1280, 800);
    });
    expect(problems.join('\n')).toMatch(/same size/);
  });

  it('keeps the local tab in sync with site.serviceArea, both ways', () => {
    expect(problemsAfter((f) => void (f.project.client.city = 'Mayagüez')).join('\n')).toMatch(
      /not in site.serviceArea/,
    );
    expect(problemsAfter((f) => void (f.project.tabs = ['para-ti'])).join('\n')).toMatch(
      /add it to the "local" tab/,
    );
  });

  it('rejects a framing check date that is malformed or in the future', () => {
    const set = (date: string) => (f: Fixture) => {
      if (f.project.demo.mode === 'live') f.project.demo.framingCheckedOn = date;
    };
    expect(problemsAfter(set('2026-02-30')).join('\n')).toMatch(/real date/);
    expect(problemsAfter(set('2027-01-01')).join('\n')).toMatch(/in the future/);
  });

  it('rejects a half-translated string', () => {
    const problems = problemsAfter((f) => {
      f.pricing.note = { es: 'nota', en: ' ' };
    });
    expect(problems.join('\n')).toMatch(/empty text at precios\.note\.en/);
  });

  it('rejects a WhatsApp number with a + or spaces', () => {
    const problems = problemsAfter((f) => {
      f.site.contact.whatsapp = '+1 787 000 0000';
    });
    expect(problems.join('\n')).toMatch(/digits only/);
  });
});

describe('validate — launch checks (strict)', () => {
  const everyFileExists = () => 1000;

  it('passes when nothing is a placeholder and every file exists', () => {
    expect(problemsAfter(() => {}, true, everyFileExists)).toEqual([]);
  });

  it('is off unless strict', () => {
    expect(problemsAfter((f) => void (f.site.url = 'https://example.com'))).toEqual([]);
  });

  it('catches placeholders anywhere', () => {
    const problems = problemsAfter(
      (f) => {
        f.site.url = 'https://example.com';
        f.site.contact.phone.display = '(787) 555-1234';
        f.project.liveUrl = 'https://elbreak.example';
        f.about.heading = { es: 'TODO', en: 'TODO' };
      },
      true,
      everyFileExists,
    );
    const text = problems.join('\n');
    expect(text).toMatch(/site\.url/);
    expect(text).toMatch(/site\.contact\.phone\.display/);
    expect(text).toMatch(/el-break\.liveUrl/);
    expect(text).toMatch(/sobre-mi\.heading\.es/);
  });

  it('does not mistake the Spanish word "todo" for a TODO', () => {
    const problems = problemsAfter(
      (f) => {
        f.end.heading = { es: 'Eso es todo', en: 'That is all' };
        f.pricing.note = { es: 'Todo incluido', en: 'All included' };
      },
      true,
      everyFileExists,
    );
    expect(problems).toEqual([]);
  });

  it('reports missing media', () => {
    const problems = problemsAfter(() => {}, true, (p) => (p === '/media/antes.webp' ? undefined : 1000));
    expect(problems).toEqual(['missing file public/media/antes.webp']);
  });

  it('reports a clip over 2 MB', () => {
    const problems = problemsAfter(() => {}, true, (p) => (p === '/media/intro.mp4' ? MAX_CLIP_BYTES + 1 : 1000));
    expect(problems.join('\n')).toMatch(/intro\.mp4 is 2\.0 MB/);
  });
});

describe('real content', () => {
  it('passes the structural checks', async () => {
    const { contentProblems } = await import('./index');
    expect(contentProblems(false)).toEqual([]);
  });

  // `npm run check:launch` — the list of what still has to be real before the
  // site can go live. Fails until then, on purpose.
  it.runIf(import.meta.env.MODE === 'launch')('is ready to launch', async () => {
    const { contentProblems } = await import('./index');
    expect(contentProblems(true)).toEqual([]);
  });
});
