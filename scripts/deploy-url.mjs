#!/usr/bin/env node
/**
 * Prints the address a `wrangler deploy` just published to, for the checks
 * that run against the real deployment (.github/workflows/ci.yml).
 *
 *   node scripts/deploy-url.mjs <wrangler output file> [<deploy log>]
 *
 * The output file is the ND-JSON Wrangler writes to WRANGLER_OUTPUT_FILE_PATH;
 * its "deploy" entry lists the URLs the Worker now answers on. If that file
 * is missing or has no URL, the first workers.dev address in the log is used.
 * Exits non-zero when neither has one.
 */
import { existsSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/** @returns {string | undefined} */
export function deployedUrl(outputFile = '', log = '') {
  for (const line of outputFile.split('\n')) {
    if (!line.trim()) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    if (entry?.type !== 'deploy' || !Array.isArray(entry.targets)) continue;
    const url = entry.targets.find((t) => typeof t === 'string' && t.startsWith('https://'));
    if (url) return url.replace(/\/+$/, '');
  }
  return log.match(/https:\/\/[a-z0-9.-]+\.workers\.dev\b/i)?.[0];
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [outputPath, logPath] = process.argv.slice(2);
  const read = (path) => (path && existsSync(path) ? readFileSync(path, 'utf8') : '');
  const url = deployedUrl(read(outputPath), read(logPath));
  if (!url) {
    console.error('No deployment URL in the Wrangler output or log.');
    process.exit(1);
  }
  console.log(url);
}
