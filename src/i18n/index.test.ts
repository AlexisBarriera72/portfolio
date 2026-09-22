import { describe, expect, it } from 'vitest';
import { site } from '../content/site';
import { alternates, format, formatPrice, localePath, otherLocale, t } from './index';

describe('localePath', () => {
  it('serves Spanish from the root and English from /en/, always with a trailing slash', () => {
    expect(localePath('es')).toBe('/');
    expect(localePath('en')).toBe('/en/');
    expect(localePath('es', 'el-break')).toBe('/el-break/');
    expect(localePath('en', '/el-break/')).toBe('/en/el-break/');
  });
});

describe('alternates', () => {
  it('lists every locale plus x-default, as absolute URLs', () => {
    expect(alternates('/el-break/')).toEqual([
      { hreflang: 'es-PR', href: `${site.url}/el-break/` },
      { hreflang: 'en', href: `${site.url}/en/el-break/` },
      { hreflang: 'x-default', href: `${site.url}/el-break/` },
    ]);
  });
});

describe('otherLocale', () => {
  it('swaps the two languages', () => {
    expect(otherLocale('es')).toBe('en');
    expect(otherLocale('en')).toBe('es');
  });
});

describe('format', () => {
  it('fills the card-position template in both languages', () => {
    expect(format(t('es').nav.position, { index: 3, total: 9 })).toBe('Tarjeta 3 de 9');
    expect(format(t('en').nav.position, { index: 3, total: 9 })).toBe('Card 3 of 9');
  });

  it('leaves unknown placeholders visible', () => {
    expect(format('{a} {b}', { a: 1 })).toBe('1 {b}');
  });
});

describe('formatPrice', () => {
  it('writes whole dollars the way Puerto Rico reads them', () => {
    expect(formatPrice(450, 'es')).toBe('$450');
    expect(formatPrice(1450, 'en')).toBe('$1,450');
  });
});
