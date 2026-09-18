import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  use: {
    baseURL: 'http://localhost:4173/pwa-pocket/',
    trace: 'retain-on-failure',
    // Pin the locale so the app's system-language auto-detection resolves to French,
    // matching the French text asserted throughout this suite.
    locale: 'fr-FR',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run build -- --base-href=/pwa-pocket/ && node scripts/serve.mjs',
    url: 'http://localhost:4173/pwa-pocket/',
    reuseExistingServer: !process.env['CI'],
    timeout: 120000,
  },
});
