import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { buildHeaders } from './security-headers';

const hash = (s: string) => `'sha256-${createHash('sha256').update(s).digest('base64')}'`;
const csp = (headers: string) => headers.match(/Content-Security-Policy: (.+)/)![1]!;

describe('buildHeaders', () => {
  const page = `<!doctype html><html><head>
    <script>window.a=1</script>
    <script type="application/ld+json">{"@type":"Thing"}</script>
    <script type="module" src="/_astro/app.js"></script>
    <style>.x{color:red}</style>
  </head><body>
    <iframe data-demo-src="https://cliente.pr/menu?a=1&amp;b=2"></iframe>
    <iframe data-demo-src="http://insecure.example"></iframe>
    <form method="post" action="https://formspree.io/f/abc"></form>
  </body></html>`;

  it('allows exactly the inline code that was built, by hash', () => {
    const policy = csp(buildHeaders([page, page]));
    expect(policy).toContain(`script-src 'self' ${hash('window.a=1')}`);
    expect(policy).toContain(`style-src 'self' ${hash('.x{color:red}')}`);
    expect(policy).not.toContain(hash('{"@type":"Thing"}'));
    expect(policy).not.toContain('unsafe-inline');
  });

  it('frames only the https demo origins and posts only to known forms', () => {
    const policy = csp(buildHeaders([page]));
    expect(policy).toContain('frame-src https://cliente.pr;');
    expect(policy).not.toContain('insecure.example');
    expect(policy).toContain("form-action 'self' https://formspree.io");
    expect(policy).toContain("frame-ancestors 'none'");
  });

  it('forbids all framing when there is no live demo', () => {
    expect(csp(buildHeaders(['<p>hola</p>']))).toContain("frame-src 'none'");
  });

  it('caches hashed assets forever', () => {
    expect(buildHeaders([])).toMatch(/\/_astro\/\*\n {2}Cache-Control: public, max-age=31536000, immutable/);
  });
});
