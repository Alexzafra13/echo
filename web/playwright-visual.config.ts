import { defineConfig } from '@playwright/test';

/**
 * Minimal Playwright config for visual audit screenshots
 * Uses locally downloaded Chrome, no auth setup needed
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: 'visual-audit.spec.ts',
  fullyParallel: true,
  retries: 0,
  timeout: 30000,
  reporter: [['list']],

  use: {
    baseURL: 'http://localhost:5173',
    screenshot: 'off',
    trace: 'off',
    launchOptions: {
      executablePath: '/tmp/chrome-linux64/chrome',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    },
  },

  projects: [
    {
      name: 'visual-audit',
      use: {
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
});
