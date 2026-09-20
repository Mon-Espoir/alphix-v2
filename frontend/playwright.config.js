// @ts-check
/* global process */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,
  timeout: 90000,
  expect: { timeout: 10000 },
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 12000,
    navigationTimeout: 20000,
  },
  projects: [
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'mobile-firefox', use: { ...devices['Pixel 5'] } },
  ],
});
