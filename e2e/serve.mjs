/**
 * A tiny static server for the end-to-end tests that behaves like Cloudflare's
 * static hosting for the parts the site relies on:
 *   - /en → 307 → /en/, and /en/ serves en/index.html;
 *   - unknown paths get 404.html with status 404;
 *   - the rules in dist/_headers are applied (so the tests see the real CSP).
 *
 *   node e2e/serve.mjs [dir=dist] [port=4322]
 */
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const dir = process.argv[2] ?? 'dist';
const port = Number(process.argv[3] ?? 4322);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
  '.vtt': 'text/vtt',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
};

/** Parse Cloudflare's _headers format: a path pattern, then indented "Name: value" lines. */
function loadHeaderRules() {
  const file = join(dir, '_headers');
  if (!existsSync(file)) return [];
  const rules = [];
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      rules.push({ pattern: line.trim(), headers: [] });
    } else {
      const i = line.indexOf(':');
      rules.at(-1)?.headers.push([line.slice(0, i).trim(), line.slice(i + 1).trim()]);
    }
  }
  return rules;
}

function matches(pattern, path) {
  const re = new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`);
  return re.test(path);
}

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const path = decodeURIComponent(url.pathname);
  let file = normalize(join(dir, path));
  if (!file.startsWith(normalize(dir))) {
    res.writeHead(403).end();
    return;
  }

  if (existsSync(file) && statSync(file).isDirectory()) {
    if (!path.endsWith('/')) {
      res.writeHead(307, { Location: `${path}/${url.search}` }).end();
      return;
    }
    file = join(file, 'index.html');
  } else if (!extname(path) && existsSync(`${file}/index.html`)) {
    res.writeHead(307, { Location: `${path}/${url.search}` }).end();
    return;
  }

  let status = 200;
  if (!existsSync(file) || statSync(file).isDirectory()) {
    status = 404;
    file = join(dir, '404.html');
  }

  const headers = { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' };
  for (const rule of loadHeaderRules()) {
    if (matches(rule.pattern, path)) for (const [name, value] of rule.headers) headers[name] = value;
  }
  res.writeHead(status, headers);
  createReadStream(file).pipe(res);
}).listen(port, '127.0.0.1', () => console.log(`serving ${dir} on http://127.0.0.1:${port}`));
