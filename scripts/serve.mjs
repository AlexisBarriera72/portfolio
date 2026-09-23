/**
 * A tiny static server for the end-to-end tests that behaves like Cloudflare's
 * static hosting for the parts the site relies on:
 *   - /en → 307 → /en/, and /en/ serves en/index.html;
 *   - unknown paths get 404.html with status 404;
 *   - the rules in dist/_headers are applied (so the tests see the real CSP,
 *     less the one directive that can't work over plain http: servedHeader).
 *
 *   node scripts/serve.mjs [dir=dist] [port=4322]
 *
 * Test-only, but it still refuses to serve anything outside `dir`.
 */
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

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
  '.vtt': 'text/vtt; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
};

/**
 * Maps a request URL to a file under `root`, or says why it can't:
 *   { status: 400 } — the path is not valid percent-encoding;
 *   { status: 403 } — it resolves outside `root` (e.g. /..%2fdist-private/x);
 *   { path, file }  — the decoded URL path and the absolute file path.
 * Containment is checked on resolved absolute paths with path.relative, so a
 * sibling directory that merely shares the prefix ("dist-private") is outside.
 */
export function resolveRequest(root, rawUrl) {
  const base = resolve(root);
  let path;
  try {
    path = decodeURIComponent(new URL(rawUrl ?? '/', 'http://localhost').pathname);
  } catch {
    return { status: 400 };
  }
  if (path.includes('\0')) return { status: 400 };
  const file = resolve(base, `.${sep}${path}`);
  const rel = relative(base, file);
  if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) return { status: 403 };
  return { path, file };
}

/** Parse Cloudflare's _headers format: a path pattern, then indented "Name: value" lines. */
function loadHeaderRules(root) {
  const file = join(root, '_headers');
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

/**
 * The header as this server sends it. One change, to the CSP only: this
 * server is plain http on 127.0.0.1, and `upgrade-insecure-requests` would
 * make WebKit (which, unlike Chromium, doesn't exempt loopback) rewrite every
 * request to https and load nothing. Every other directive is served as
 * built, and the checks against a real deployment confirm the directive is
 * there in production.
 */
export function servedHeader(name, value) {
  if (name.toLowerCase() !== 'content-security-policy') return value;
  return value
    .split(';')
    .map((directive) => directive.trim())
    .filter((directive) => directive && directive !== 'upgrade-insecure-requests')
    .join('; ');
}

export function createStaticServer(root) {
  const base = resolve(root);
  return createServer((req, res) => {
    const resolved = resolveRequest(base, req.url);
    if (!('file' in resolved)) {
      res.writeHead(resolved.status, { 'Content-Type': 'text/plain; charset=utf-8' }).end(`${resolved.status}\n`);
      return;
    }
    const { path } = resolved;
    let { file } = resolved;
    const search = new URL(req.url ?? '/', 'http://localhost').search;

    if (existsSync(file) && statSync(file).isDirectory()) {
      if (!path.endsWith('/')) {
        res.writeHead(307, { Location: `${path}/${search}` }).end();
        return;
      }
      file = join(file, 'index.html');
    } else if (!extname(path) && existsSync(join(file, 'index.html'))) {
      res.writeHead(307, { Location: `${path}/${search}` }).end();
      return;
    }

    let status = 200;
    if (!existsSync(file) || statSync(file).isDirectory()) {
      status = 404;
      file = join(base, '404.html');
    }

    const headers = { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' };
    for (const rule of loadHeaderRules(base)) {
      if (matches(rule.pattern, path)) for (const [name, value] of rule.headers) headers[name] = servedHeader(name, value);
    }

    const stream = createReadStream(file);
    stream.on('open', () => {
      res.writeHead(status, headers);
      stream.pipe(res);
    });
    stream.on('error', () => {
      if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end();
    });
  });
}

// Start only when run directly, so tests can import resolveRequest.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = process.argv[2] ?? 'dist';
  const port = Number(process.argv[3] ?? 4322);
  createStaticServer(root).listen(port, '127.0.0.1', () => console.log(`serving ${root} on http://127.0.0.1:${port}`));
}
