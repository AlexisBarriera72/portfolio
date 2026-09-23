/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

// Astro's Vite config, so tests import images and modules exactly the way the
// build does (image files resolve to their metadata, import.meta.glob works).
export default getViteConfig({
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
});
