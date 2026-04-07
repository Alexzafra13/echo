import { test, Page } from '@playwright/test';

/**
 * Visual Audit - Takes screenshots of all main pages for visual review
 * Injects fake auth state so we can see internal pages without a running backend
 */

const SCREENSHOT_DIR = 'e2e/screenshots';

const FAKE_AUTH = JSON.stringify({
  state: {
    user: {
      id: 'audit-user-1',
      username: 'auditor',
      name: 'Visual Auditor',
      isAdmin: true,
      hasAvatar: false,
      mustChangePassword: false,
      createdAt: new Date().toISOString(),
    },
    accessToken: 'fake-token-for-visual-audit',
    refreshToken: 'fake-refresh-token',
    isAuthenticated: true,
  },
  version: 1,
});

async function injectAuth(p: Page) {
  // Navigate to base URL first to set localStorage on the correct origin
  await p.goto('/', { waitUntil: 'commit' });
  await p.evaluate((authData) => {
    localStorage.setItem('echo-auth-storage', authData);
  }, FAKE_AUTH);
}

async function takeScreenshot(p: Page, name: string, path: string) {
  await p.goto(path, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(2500); // Let animations and lazy loading settle
  await p.screenshot({
    path: `${SCREENSHOT_DIR}/${name}.png`,
    fullPage: true,
  });
}

// Public pages - no auth needed
test.describe('Visual Audit - Public Pages', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  const publicPages = [
    { name: '01-login', path: '/login' },
    { name: '02-setup', path: '/setup' },
  ];

  for (const page of publicPages) {
    test(`screenshot: ${page.name}`, async ({ page: p }) => {
      await takeScreenshot(p, page.name, page.path);
    });
  }
});

// App pages - inject fake auth to bypass login redirect
test.describe('Visual Audit - App Pages (authenticated)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  const appPages = [
    { name: '03-home', path: '/home' },
    { name: '04-albums', path: '/albums' },
    { name: '05-artists', path: '/artists' },
    { name: '06-playlists', path: '/playlists' },
    { name: '07-radio', path: '/radio' },
    { name: '08-wave-mix', path: '/wave-mix' },
    { name: '09-social', path: '/social' },
    { name: '10-settings', path: '/settings' },
    { name: '11-admin', path: '/admin' },
    { name: '12-trending', path: '/trending' },
    { name: '13-profile', path: '/profile' },
    { name: '17-search', path: '/search' },
    { name: '18-artist-playlists', path: '/artist-playlists' },
    { name: '19-genre-playlists', path: '/genre-playlists' },
  ];

  for (const page of appPages) {
    test(`screenshot: ${page.name}`, async ({ page: p }) => {
      await injectAuth(p);
      await takeScreenshot(p, page.name, page.path);
    });
  }
});

// Mobile viewport screenshots
test.describe('Visual Audit - Mobile', () => {
  test.use({
    storageState: { cookies: [], origins: [] },
    viewport: { width: 375, height: 812 },
  });

  const mobilePages = [
    { name: '20-mobile-login', path: '/login' },
    { name: '21-mobile-home', path: '/home' },
    { name: '22-mobile-albums', path: '/albums' },
    { name: '23-mobile-artists', path: '/artists' },
    { name: '24-mobile-settings', path: '/settings' },
  ];

  for (const page of mobilePages) {
    test(`screenshot: ${page.name}`, async ({ page: p }) => {
      if (page.path !== '/login') {
        await injectAuth(p);
      }
      await takeScreenshot(p, page.name, page.path);
    });
  }
});
