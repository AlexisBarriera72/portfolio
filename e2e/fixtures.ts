import { type APIRequestContext, test as base, expect } from '@playwright/test';

/**
 * Every test gets `guard`, automatically: it fails the test on any failed
 * request, 4xx/5xx response, console error (CSP violations included) or
 * uncaught exception — except what the build itself declares missing.
 *
 * A draft build publishes /draft-missing.json: the exact public files not
 * added yet and the placeholder demo origins. Those, and only those, are
 * allowed. A production build publishes no such file, so nothing is allowed.
 * A test that expects a failure (e.g. visiting a 404 page) says so with
 * guard.allow(path).
 */

type Guard = { allow: (pathOrUrl: string) => void };

let declared: Promise<Set<string>> | undefined;

async function loadDeclaredGaps(request: APIRequestContext, baseURL: string): Promise<Set<string>> {
  const res = await request.get(new URL('/draft-missing.json', baseURL).href);
  if (!res.ok()) return new Set();
  const gaps = (await res.json()) as { missing: string[]; placeholderDemos: string[] };
  return new Set([...gaps.missing, ...gaps.placeholderDemos]);
}

export const test = base.extend<{ guard: Guard }>({
  guard: [
    async ({ page, request, baseURL }, use) => {
      const allowed = await (declared ??= loadDeclaredGaps(request, baseURL!));
      const extra = new Set<string>();
      const problems: string[] = [];
      const isAllowed = (raw: string) => {
        const url = new URL(raw);
        return [raw, url.pathname, url.origin].some((key) => allowed.has(key) || extra.has(key));
      };

      page.on('response', (res) => {
        if (res.status() >= 400 && !isAllowed(res.url())) problems.push(`${res.status()} ${res.url()}`);
      });
      page.on('requestfailed', (req) => {
        const reason = req.failure()?.errorText ?? '';
        // Cancelled by the page itself (a paused or unloaded video, an iframe set
        // to about:blank): Chromium says net::ERR_ABORTED, WebKit this.
        if (reason.includes('ERR_ABORTED') || reason === 'Load request cancelled') return;
        if (!isAllowed(req.url())) problems.push(`failed ${req.url()} (${reason})`);
      });
      page.on('console', (msg) => {
        // Resource failures are checked above by exact URL; everything else counts.
        if (msg.type() === 'error' && !msg.text().startsWith('Failed to load resource')) {
          problems.push(`console: ${msg.text()}`);
        }
      });
      page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`));

      await use({ allow: (target) => extra.add(target) });
      expect(problems, 'unexpected failed requests or errors').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
