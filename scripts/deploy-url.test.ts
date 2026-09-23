import { describe, expect, it } from 'vitest';
import { deployedUrl } from './deploy-url.mjs';

const deployEntry = (targets: string[]) =>
  JSON.stringify({ type: 'deploy', version: 1, worker_name: 'portfolio-preview', targets });

describe('deployedUrl', () => {
  it('reads the https target of the deploy entry', () => {
    const file = [
      JSON.stringify({ type: 'wrangler-session', version: 1 }),
      deployEntry(['https://portfolio-preview.alexis.workers.dev/']),
      '',
    ].join('\n');
    expect(deployedUrl(file, '')).toBe('https://portfolio-preview.alexis.workers.dev');
  });

  it('falls back to the workers.dev address in the log', () => {
    const log = 'Uploaded portfolio-preview (2.1 sec)\nDeployed portfolio-preview triggers (0.4 sec)\n  https://portfolio-preview.alexis.workers.dev\n';
    expect(deployedUrl('not json\n', log)).toBe('https://portfolio-preview.alexis.workers.dev');
  });

  it('finds nothing when neither has an address', () => {
    expect(deployedUrl(deployEntry([]), 'Deployed.')).toBeUndefined();
  });
});
