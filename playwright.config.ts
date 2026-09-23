import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests against the built site (run `npm run build:draft` first).
 * PW_CHROMIUM lets a machine with a preinstalled Chromium use it instead of
 * downloading one; CI installs its own with `npx playwright install chromium`.
 */
const executablePath = process.env.PW_CHROMIUM || undefined;

/**
 * E2E_BASE_URL points the suite at an already-running site instead — a
 * `wrangler dev` of the build, or a real Cloudflare preview deployment.
 */
const external = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: 'e2e',
  // Checks against a real deployment have their own config: playwright.deployed.config.ts.
  testIgnore: 'deployed.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: external ?? 'http://127.0.0.1:4322',
    browserName: 'chromium',
    launchOptions: { executablePath },
  },
  webServer: external
    ? undefined
    : {
        command: 'node scripts/serve.mjs dist 4322',
        url: 'http://127.0.0.1:4322/',
        reuseExistingServer: !process.env.CI,
      },
  projects: [
    {
      name: 'phone',
      use: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
    },
    {
      name: 'desktop',
      use: { viewport: { width: 1440, height: 900 } },
    },
    // WebKit (Safari's engine), when installed: CI sets PW_WEBKIT=1 after
    // `npx playwright install webkit`. browserName is set explicitly so these
    // projects can never quietly run Chromium. Emulation only — not a real
    // iPhone's touch or toolbars (see "Test on a real phone" in the README).
    ...(process.env.PW_WEBKIT
      ? [
          {
            name: 'webkit-phone',
            use: { ...devices['iPhone 13'], browserName: 'webkit' as const, launchOptions: {} },
          },
          {
            name: 'webkit-desktop',
            use: { viewport: { width: 1280, height: 800 }, browserName: 'webkit' as const, launchOptions: {} },
          },
        ]
      : []),
  ],
});
