import { test as setup, expect } from '@playwright/test';

const authFile = 'e2e/.auth/admin.json';

setup('authenticate as admin', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('input[name="username"]')).toBeVisible({ timeout: 15000 });

  await page.locator('input[name="username"]').fill('admin');
  await page.locator('input[name="password"]').fill('adminpassword123');
  await page.getByRole('button', { name: /Iniciar Sesión/i }).click();

  await page.waitForURL(/^(?!.*login)/, { timeout: 15000 });

  // Si redirige a first-login, completar el cambio de contraseña
  if (page.url().includes('first-login')) {
    await page.locator('input[name="newPassword"]').fill('adminpassword123');
    await page.locator('input[name="confirmPassword"]').fill('adminpassword123');
    await page.getByRole('button', { name: /Cambiar|Guardar/i }).click();
    await page.waitForURL(/^(?!.*first-login)/, { timeout: 15000 });
  }

  await page.context().storageState({ path: authFile });
});
