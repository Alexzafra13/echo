import { test, expect } from '@playwright/test';

/**
 * Smoke tests - Quick sanity checks that the app is working
 */
test.describe('Smoke Tests', () => {
  test('app loads without crashing', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBeLessThan(500);
  });

  test('login page is accessible', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('no console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForTimeout(2000); // Wait for async operations

    // Filter out known acceptable errors
    const criticalErrors = errors.filter(
      e => !e.includes('favicon') && !e.includes('404')
    );

    expect(criticalErrors).toHaveLength(0);
  });
});
