import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 180_000,
  // Dev mode compiles each route on first visit, which can take several seconds.
  expect: { timeout: 30_000 },
  fullyParallel: false,
  use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // A separate server (own port and build folder) so it can run next to `npm run dev`.
    // EMAIL_DELIVERY=console: magic links go to .dev-mail/last-link.txt, never to a real inbox.
    command: `npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    env: { EMAIL_DELIVERY: 'console', AUTH_URL: `http://localhost:${PORT}`, NEXT_DIST_DIR: '.next-e2e' },
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
