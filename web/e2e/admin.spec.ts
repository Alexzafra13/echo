import { test, expect } from '@playwright/test';

test.describe('Admin Panel', () => {
  // Login before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="username"], input[type="text"]', 'admin');
    await page.fill('input[name="password"], input[type="password"]', 'admin');
    await page.click('button[type="submit"]');
    await page.waitForURL(/^(?!.*login)/); // Wait for redirect away from login
  });

  test.describe('Settings', () => {
    test('should show success notification when saving settings', async ({ page }) => {
      await page.goto('/admin/settings');

      // Wait for page to load
      await page.waitForSelector('button:has-text("Guardar")');

      // Click save button
      await page.click('button:has-text("Guardar")');

      // Should show success notification
      await expect(
        page.locator('[data-testid="notification"], [class*="notification"]').filter({ hasText: /guardad|success/i })
      ).toBeVisible({ timeout: 5000 });
    });

    test('should show error notification on API failure', async ({ page }) => {
      // Intercept API to simulate error
      await page.route('**/api/admin/settings**', route =>
        route.fulfill({ status: 500, body: JSON.stringify({ message: 'Server Error' }) })
      );

      await page.goto('/admin/settings');
      await page.waitForSelector('button:has-text("Guardar")');
      await page.click('button:has-text("Guardar")');

      // Should show error notification
      await expect(
        page.locator('[data-testid="notification"], [class*="notification"]').filter({ hasText: /error/i })
      ).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Users Panel', () => {
    test('should display users list', async ({ page }) => {
      await page.goto('/admin/users');

      // Should show users table or list
      await expect(page.locator('table, [class*="users"]')).toBeVisible();
    });

    test('should open create user modal', async ({ page }) => {
      await page.goto('/admin/users');

      // Click create user button
      await page.click('button:has-text("Crear Usuario")');

      // Modal should be visible
      await expect(page.locator('[role="dialog"], [class*="modal"]')).toBeVisible();
    });
  });

  test.describe('Federation Panel', () => {
    test('should display federation settings', async ({ page }) => {
      await page.goto('/admin/federation');

      // Should show federation content
      await expect(page.locator('text=/federaci|servidor/i')).toBeVisible();
    });
  });
});
