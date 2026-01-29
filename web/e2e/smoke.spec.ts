import { test, expect } from '@playwright/test';

/**
 * Smoke tests - Verificación básica de que la app funciona
 * Estos tests asumen que el setup ya está completo (ver CI setup step)
 */
test.describe('Smoke Tests', () => {
  test('la app carga sin errores 500', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBeLessThan(500);
  });

  test('la página de login es accesible', async ({ page }) => {
    await page.goto('/login');

    // Esperar a que cargue la página (puede ser login o setup)
    await page.waitForLoadState('networkidle');

    // Debe mostrar el formulario de login (setup debe estar completo)
    await expect(page.locator('input[name="username"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /Iniciar Sesión/i })).toBeVisible();
  });

  test('rutas protegidas redirigen correctamente', async ({ page }) => {
    await page.goto('/home');

    // Debe redirigir a /login (si setup completo) o /setup (si no)
    // En CI, setup debería estar completo
    await expect(page).toHaveURL(/login|setup/, { timeout: 10000 });
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

    // Filtrar errores aceptables (favicon, imágenes de fondo, recursos no críticos)
    const criticalErrors = errors.filter(
      e => !e.includes('favicon') && !e.includes('404') && !e.includes('backgrounds')
    );

    expect(criticalErrors).toHaveLength(0);
  });
});
