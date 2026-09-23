import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createStaticServer, resolveRequest } from './serve.mjs';

describe('resolveRequest', () => {
  const root = '/srv/dist';

  it('resolves normal paths inside the root', () => {
    expect(resolveRequest(root, '/el-break/')).toEqual({ path: '/el-break/', file: '/srv/dist/el-break' });
    expect(resolveRequest(root, '/media/a%20b.webm')).toMatchObject({ file: '/srv/dist/media/a b.webm' });
  });

  it('refuses a sibling directory that shares the prefix', () => {
    expect(resolveRequest(root, '/..%2fdist-private%2fexample.txt')).toEqual({ status: 403 });
  });

  it('keeps dot-dot segments inside the root', () => {
    // The URL parser collapses %2e%2e segments at the root, so this stays in dist.
    expect(resolveRequest(root, '/%2e%2e/%2e%2e/etc/passwd')).toMatchObject({ file: '/srv/dist/etc/passwd' });
  });

  it('answers 400 to malformed percent-encoding instead of throwing', () => {
    expect(resolveRequest(root, '/%E0%A4%A')).toEqual({ status: 400 });
  });
});

describe('createStaticServer', () => {
  let base = '';
  let url = '';
  const server = (() => {
    const dir = mkdtempSync(join(tmpdir(), 'serve-test-'));
    mkdirSync(join(dir, 'dist'));
    mkdirSync(join(dir, 'dist-private'));
    writeFileSync(join(dir, 'dist', 'index.html'), '<p>home</p>');
    writeFileSync(join(dir, 'dist', '404.html'), '<p>missing</p>');
    writeFileSync(join(dir, 'dist-private', 'example.txt'), 'secret');
    base = dir;
    return createStaticServer(join(dir, 'dist'));
  })();

  beforeAll(async () => {
    await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(() => new Promise<void>((done) => server.close(() => done())));

  it('never serves the sibling directory', async () => {
    const res = await fetch(`${url}/..%2fdist-private%2fexample.txt`);
    expect(res.status).toBe(403);
    expect(await res.text()).not.toContain('secret');
    expect(base).toBeTruthy();
  });

  it('survives malformed encoding and keeps serving', async () => {
    expect((await fetch(`${url}/%E0%A4%A`)).status).toBe(400);
    expect((await fetch(`${url}/`)).status).toBe(200);
  });

  it('serves the 404 page with a 404 status', async () => {
    const res = await fetch(`${url}/nope/`);
    expect(res.status).toBe(404);
    expect(await res.text()).toContain('missing');
  });
});
