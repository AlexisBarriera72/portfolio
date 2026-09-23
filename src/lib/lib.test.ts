import { describe, expect, it } from 'vitest';
import { getCard } from '../data';
import { site } from '../data/site';
import { ctaLink, whatsappUrl } from './links';
import { businessJsonLd, pageTitle, serializeJsonLd, shareImagePath } from './seo';

describe('ctaLink', () => {
  it('builds a WhatsApp link with the message encoded', () => {
    expect(whatsappUrl('Hola, ¿precio? & más')).toBe(
      `https://wa.me/${site.contact.whatsapp}?text=Hola%2C%20%C2%BFprecio%3F%20%26%20m%C3%A1s`,
    );
    expect(whatsappUrl()).toBe(`https://wa.me/${site.contact.whatsapp}`);
  });

  it('dials the E.164 number, not the display form', () => {
    expect(ctaLink({ kind: 'tel', label: { es: 'Llamar', en: 'Call' } }, 'es').href).toBe(
      `tel:${site.contact.phone.e164}`,
    );
  });

  it('turns a card link into that card’s page, in the right language', () => {
    const link = ctaLink({ kind: 'card', target: 'precios', label: { es: 'x', en: 'x' } }, 'en');
    expect(link).toEqual({ href: '/en/precios/', external: false, card: 'precios' });
  });
});

describe('seo', () => {
  it('uses the site name alone for the home page', () => {
    const intro = getCard('inicio')!;
    const project = getCard('el-break')!;
    expect(pageTitle(intro, 'es')).toBe('Alexis · Páginas web en Ponce, PR');
    expect(pageTitle(project, 'es')).toBe('El Break Food Truck · Alexis · Páginas web en Ponce, PR');
  });

  it('previews a project with its "after" screenshot', () => {
    expect(shareImagePath(getCard('el-break')!)).toBe('el-break/despues.webp');
    expect(shareImagePath(getCard('precios')!)).toBe(site.defaultShareImage);
  });

  it('lists every municipio served and the lowest one-time price', () => {
    const data = businessJsonLd('es');
    expect(data.areaServed).toHaveLength(site.serviceArea.length);
    expect(data.priceRange).toBe('$450+');
  });

  it('cannot be broken out of its script tag', () => {
    expect(serializeJsonLd({ name: '</script><script>alert(1)</script>' })).not.toContain('</script>');
  });
});
