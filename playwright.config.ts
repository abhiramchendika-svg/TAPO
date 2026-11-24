import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests against the production build (dist/), served the way Vercel serves it.
 * Run: npm run build:web && npm run test:e2e
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    // Locally, use the installed Microsoft Edge (Chromium) so no browser download is needed.
    // In CI, Playwright's own Chromium is used (run `npx playwright install chromium` first).
    channel: process.env.CI ? undefined : 'msedge',
  },
  webServer: {
    command: 'node scripts/serve-dist.mjs 4173',
    url: 'http://localhost:4173/',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
});
