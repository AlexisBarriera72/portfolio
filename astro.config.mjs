// @ts-check
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import { site } from './src/data/site.ts';
import { localePath, t } from './src/i18n/index.ts';
import { DEFAULT_LOCALE, LOCALES } from './src/data/types.ts';

// The origin lives in src/data/site.ts, so the sitemap, canonical URLs and
// the JSON-LD cannot disagree about the domain.
//
// Locale routing is done by src/i18n (localePath), not by Astro's i18n option,
// so there is one routing helper rather than two.
export default defineConfig({
  site: site.url,
  output: 'static',
  // Every page is a folder (/en/, /el-break/). Linking to "/en" would cost a
  // redirect on most hosts; this makes Astro and the sitemap agree on "/en/".
  trailingSlash: 'always',
  integrations: [
    sitemap({
      // Only the language homes: every card page carries the same feed and
      // names its home as canonical (see src/layouts/Base.astro).
      filter: (page) => LOCALES.some((locale) => new URL(page).pathname === localePath(locale)),
      i18n: {
        defaultLocale: DEFAULT_LOCALE,
        locales: Object.fromEntries(LOCALES.map((locale) => [locale, t(locale).htmlLang])),
      },
    }),
  ],
  vite: { plugins: [tailwindcss()] },
});
