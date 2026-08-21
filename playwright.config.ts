import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    // Override .env.local's dev-auto-login for e2e runs — these tests need
    // the real login gate to actually show up, regardless of local dev settings.
    env: { VITE_DEV_LOGIN_PIN: '' },
  },
})
