#!/usr/bin/env node
/**
 * Prints the site's own origin, as the build wrote it into the home page's
 * canonical link (it comes from src/data/site.ts → url). CI checks the
 * production deployment at this address: the real domain.
 *
 *   node scripts/site-url.mjs [dist]
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = process.argv[2] ?? 'dist';
const html = readFileSync(join(dist, 'index.html'), 'utf8');
const href = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
if (!href) {
  console.error(`No canonical link in ${join(dist, 'index.html')}.`);
  process.exit(1);
}
console.log(new URL(href).origin);
