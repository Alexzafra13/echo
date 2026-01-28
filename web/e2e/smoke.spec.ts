import { test, expect } from '@playwright/test';

/**
 * Smoke tests - Verificación básica de que la app funciona
 */
test.describe('Smoke Tests', () => {
  test('la app carga sin errores 500', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBeLessThan(500);
  });

  test('la página de login es accesible', async ({ page }) => {
    await page.goto('/login');

    // Debe mostrar el formulario de login
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /Iniciar Sesión/i })).toBeVisible();
  });

  test('rutas protegidas redirigen a login', async ({ page }) => {
    await page.goto('/home');

    // Debe redirigir a /login porque no hay sesión
    await expect(page).toHaveURL(/login/);
  });

  test('no hay errores críticos en la consola al cargar', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Filtrar errores aceptables (favicon, imágenes de fondo)
    const criticalErrors = errors.filter(
      e => !e.includes('favicon') && !e.includes('404') && !e.includes('backgrounds')
    );

    expect(criticalErrors).toHaveLength(0);
  });
});
