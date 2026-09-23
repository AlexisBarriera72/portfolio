import { defineConfig } from '@playwright/test';

/**
 * Checks against a real deployment (e2e/deployed.spec.ts), run by CI after
 * every deploy. No local server: DEPLOY_URL is the site being checked.
 *
 *   DEPLOY_KIND=preview DEPLOY_URL=https://portfolio-preview.<account>.workers.dev npm run test:deployed
 */
export default defineConfig({
  testDir: 'e2e',
  testMatch: 'deployed.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // A real network: one retry for a dropped connection, never more.
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 90_000,
  use: {
    baseURL: process.env.DEPLOY_URL,
    browserName: 'chromium',
    launchOptions: { executablePath: process.env.PW_CHROMIUM || undefined },
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
});
