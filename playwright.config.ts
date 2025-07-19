import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: '50%',
  reporter: 'line',
  
  use: {
    baseURL: 'http://localhost:3010',
    trace: 'on-first-retry',
    viewport: { width: 1280, height: 720 },
    headless: true,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    port: 3010,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});