import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should show login page for unauthenticated users', async ({ page }) => {
    await page.goto('/');

    // Should redirect to login or show login form
    await expect(page).toHaveURL(/login|setup/);
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill login form
    await page.fill('input[name="username"], input[type="text"]', 'admin');
    await page.fill('input[name="password"], input[type="password"]', 'admin');

    // Submit
    await page.click('button[type="submit"]');

    // Should redirect to home after successful login
    await expect(page).not.toHaveURL(/login/);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="username"], input[type="text"]', 'wronguser');
    await page.fill('input[name="password"], input[type="password"]', 'wrongpass');
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('text=/error|invalid|incorrect/i')).toBeVisible();
  });
});
