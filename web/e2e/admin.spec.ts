import { test, expect } from '@playwright/test';

/**
 * Helper: Login como admin antes de cada test
 */
async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.locator('input[name="username"]').fill('admin');
  await page.locator('input[name="password"]').fill('adminpassword123');
  await page.getByRole('button', { name: /Iniciar Sesión/i }).click();
  await page.waitForURL(/^(?!.*login)/, { timeout: 10000 });
}

test.describe('Panel de Administración', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.describe('Acceso y navegación', () => {
    test('accede al panel admin', async ({ page }) => {
      await page.goto('/admin');

      // Debe mostrar el dashboard por defecto
      await expect(page.getByText('Dashboard')).toBeVisible();
    });

    test('muestra las tabs de navegación', async ({ page }) => {
      await page.goto('/admin');

      // Todas las tabs del sidebar
      await expect(page.getByText('Dashboard')).toBeVisible();
      await expect(page.getByText('Librería')).toBeVisible();
      await expect(page.getByText('Metadata')).toBeVisible();
      await expect(page.getByText('Mantenimiento')).toBeVisible();
      await expect(page.getByText('Usuarios')).toBeVisible();
      await expect(page.getByText('Federación')).toBeVisible();
      await expect(page.getByText('Logs')).toBeVisible();
    });

    test('navega entre tabs por URL', async ({ page }) => {
      // Navegar a Usuarios por URL
      await page.goto('/admin?tab=users');
      await expect(page.getByText('Gestión de Usuarios')).toBeVisible();

      // Navegar a Federación por URL
      await page.goto('/admin?tab=federation');
      await expect(page.getByText('Federación')).toBeVisible();

      // Navegar a Logs por URL
      await page.goto('/admin?tab=logs');
      await expect(page.getByText('Logs')).toBeVisible();
    });

    test('navega entre tabs por click en sidebar', async ({ page }) => {
      await page.goto('/admin');

      // Click en Usuarios
      await page.getByRole('button', { name: /Usuarios/i }).click();
      await expect(page.getByText('Gestión de Usuarios')).toBeVisible();

      // Click en Mantenimiento
      await page.getByRole('button', { name: /Mantenimiento/i }).click();
      await expect(page.getByText('Almacenamiento')).toBeVisible();
    });
  });

  test.describe('Panel de Usuarios', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/admin?tab=users');
    });

    test('muestra la tabla de usuarios', async ({ page }) => {
      await expect(page.getByText('Gestión de Usuarios')).toBeVisible();
      await expect(page.getByText('Crear Usuario')).toBeVisible();

      // Cabeceras de la tabla
      await expect(page.getByText('Usuario')).toBeVisible();
      await expect(page.getByText('Rol')).toBeVisible();
      await expect(page.getByText('Estado')).toBeVisible();
    });

    test('abre el modal de crear usuario', async ({ page }) => {
      await page.getByRole('button', { name: /Crear Usuario/i }).click();

      // Debe abrir un modal
      await expect(page.getByText(/Crear.*Usuario/i)).toBeVisible();
    });
  });

  test.describe('Panel de Mantenimiento', () => {
    test('muestra opciones de mantenimiento', async ({ page }) => {
      await page.goto('/admin?tab=maintenance');

      await expect(page.getByText('Almacenamiento')).toBeVisible();
      await expect(page.getByText('Limpieza')).toBeVisible();
      await expect(page.getByText(/Limpiar Archivos Huérfanos/i)).toBeVisible();
      await expect(page.getByText(/Limpiar Caché/i)).toBeVisible();
    });
  });

  test.describe('Notificaciones', () => {
    test('muestra notificación de éxito al guardar configuración', async ({ page }) => {
      await page.goto('/admin?tab=metadata');

      // Buscar un botón de guardar
      const saveButton = page.getByRole('button', { name: /Guardar/i });

      if (await saveButton.isVisible()) {
        await saveButton.click();

        // Debe mostrar notificación
        await expect(
          page.locator('[class*="notification"]').filter({ hasText: /guardad|success|correctamente/i })
        ).toBeVisible({ timeout: 5000 });
      }
    });

    test('la notificación se cierra automáticamente', async ({ page }) => {
      await page.goto('/admin?tab=metadata');

      const saveButton = page.getByRole('button', { name: /Guardar/i });

      if (await saveButton.isVisible()) {
        await saveButton.click();

        const notification = page.locator('[class*="notification"]').filter({
          hasText: /guardad|correctamente/i,
        });

        // Aparece
        await expect(notification).toBeVisible({ timeout: 5000 });

        // Desaparece después del autoHideMs (3000ms)
        await expect(notification).not.toBeVisible({ timeout: 6000 });
      }
    });
  });
});

test.describe('Acceso no autorizado al admin', () => {
  test('redirige a login si no está autenticado', async ({ page }) => {
    await page.goto('/admin');

    await expect(page).toHaveURL(/login/);
  });
});
