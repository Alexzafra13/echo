import { test, expect } from '@playwright/test';

/**
 * Helper: Login como admin antes de cada test
 */
async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login');
  // Esperar a que el formulario de login esté visible
  await expect(page.locator('input[name="username"]')).toBeVisible({ timeout: 15000 });

  await page.locator('input[name="username"]').fill('admin');
  await page.locator('input[name="password"]').fill('adminpassword123');
  await page.getByRole('button', { name: /Iniciar Sesión/i }).click();
  await page.waitForURL(/^(?!.*login)/, { timeout: 15000 });
}

test.describe('Panel de Administración', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.describe('Acceso y navegación', () => {
    test('accede al panel admin', async ({ page }) => {
      await page.goto('/admin');

      // Debe mostrar el dashboard por defecto
      await expect(page.getByText('Dashboard')).toBeVisible({ timeout: 10000 });
    });

    test('muestra las tabs de navegación', async ({ page }) => {
      await page.goto('/admin');

      // Esperar a que cargue el panel
      await expect(page.getByText('Dashboard')).toBeVisible({ timeout: 10000 });

      // Todas las tabs del sidebar
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
      await expect(page.getByText('Gestión de Usuarios')).toBeVisible({ timeout: 10000 });

      // Navegar a Federación por URL
      await page.goto('/admin?tab=federation');
      await expect(page.getByText('Federación')).toBeVisible({ timeout: 10000 });

      // Navegar a Logs por URL
      await page.goto('/admin?tab=logs');
      await expect(page.getByText('Logs')).toBeVisible({ timeout: 10000 });
    });

    test('navega entre tabs por click en sidebar', async ({ page }) => {
      await page.goto('/admin');
      await expect(page.getByText('Dashboard')).toBeVisible({ timeout: 10000 });

      // Click en Usuarios
      await page.getByRole('button', { name: /Usuarios/i }).click();
      await expect(page.getByText('Gestión de Usuarios')).toBeVisible({ timeout: 10000 });

      // Click en Mantenimiento
      await page.getByRole('button', { name: /Mantenimiento/i }).click();
      await expect(page.getByText('Almacenamiento')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Panel de Usuarios', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/admin?tab=users');
      await expect(page.getByText('Gestión de Usuarios')).toBeVisible({ timeout: 10000 });
    });

    test('muestra la tabla de usuarios', async ({ page }) => {
      await expect(page.getByText('Crear Usuario')).toBeVisible();

      // Cabeceras de la tabla
      await expect(page.getByText('Usuario')).toBeVisible();
      await expect(page.getByText('Rol')).toBeVisible();
      await expect(page.getByText('Estado')).toBeVisible();
    });

    test('abre el modal de crear usuario', async ({ page }) => {
      await page.getByRole('button', { name: /Crear Usuario/i }).click();

      // Debe abrir un modal
      await expect(page.getByText(/Crear.*Usuario|Nuevo.*Usuario/i)).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Panel de Mantenimiento', () => {
    test('muestra opciones de mantenimiento', async ({ page }) => {
      await page.goto('/admin?tab=maintenance');

      await expect(page.getByText('Almacenamiento')).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('Limpieza')).toBeVisible();
      await expect(page.getByText(/Limpiar Archivos Huérfanos/i)).toBeVisible();
      await expect(page.getByText(/Limpiar Caché/i)).toBeVisible();
    });
  });

  test.describe('Notificaciones', () => {
    test('muestra notificación de éxito al guardar configuración', async ({ page }) => {
      await page.goto('/admin?tab=metadata');
      await page.waitForLoadState('networkidle');

      // Buscar un botón de guardar
      const saveButton = page.getByRole('button', { name: /Guardar/i }).first();

      if (await saveButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await saveButton.click();

        // Debe mostrar notificación
        await expect(
          page.locator('[class*="notification"]').filter({ hasText: /guardad|success|correctamente/i })
        ).toBeVisible({ timeout: 10000 });
      }
    });

    test('la notificación se cierra automáticamente', async ({ page }) => {
      await page.goto('/admin?tab=metadata');
      await page.waitForLoadState('networkidle');

      const saveButton = page.getByRole('button', { name: /Guardar/i }).first();

      if (await saveButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await saveButton.click();

        const notification = page.locator('[class*="notification"]').filter({
          hasText: /guardad|correctamente/i,
        });

        // Aparece
        await expect(notification).toBeVisible({ timeout: 10000 });

        // Desaparece después del autoHideMs (3000ms + margen)
        await expect(notification).not.toBeVisible({ timeout: 8000 });
      }
    });
  });
});

test.describe('Acceso no autorizado al admin', () => {
  test('redirige a login o setup si no está autenticado', async ({ page }) => {
    await page.goto('/admin');

    // Debe redirigir a /login (si setup completo) o /setup (si no)
    await expect(page).toHaveURL(/login|setup/, { timeout: 10000 });
  });
});
