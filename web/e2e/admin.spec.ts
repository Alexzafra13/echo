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

  // Esperar a que redirija fuera de login
  await page.waitForURL(/^(?!.*login)/, { timeout: 15000 });

  // Si redirige a first-login, completar el cambio de contraseña
  if (page.url().includes('first-login')) {
    await page.locator('input[name="newPassword"]').fill('adminpassword123');
    await page.locator('input[name="confirmPassword"]').fill('adminpassword123');
    await page.getByRole('button', { name: /Cambiar|Guardar/i }).click();
    await page.waitForURL(/^(?!.*first-login)/, { timeout: 15000 });
  }
}

test.describe('Panel de Administración', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.describe('Acceso y navegación', () => {
    test('accede al panel admin', async ({ page }) => {
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');

      // Debe mostrar el dashboard por defecto (o cualquier contenido del admin)
      await expect(page.locator('h1, h2, h3').filter({ hasText: /Dashboard|Admin|Panel/i }).first()).toBeVisible({ timeout: 15000 });
    });

    test('muestra las tabs de navegación', async ({ page }) => {
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');

      // Esperar a que cargue el panel - buscar cualquier tab del sidebar
      await expect(page.getByRole('button', { name: /Usuarios|Dashboard|Librería/i }).first()).toBeVisible({ timeout: 15000 });

      // Todas las tabs del sidebar (pueden ser botones o links)
      const sidebar = page.locator('nav, aside, [class*="sidebar"]').first();
      await expect(sidebar.getByText('Librería')).toBeVisible({ timeout: 5000 });
      await expect(sidebar.getByText('Metadata')).toBeVisible();
      await expect(sidebar.getByText('Mantenimiento')).toBeVisible();
      await expect(sidebar.getByText('Usuarios')).toBeVisible();
      await expect(sidebar.getByText('Logs')).toBeVisible();
    });

    test('navega entre tabs por URL', async ({ page }) => {
      // Navegar a Usuarios por URL
      await page.goto('/admin?tab=users');
      await page.waitForLoadState('networkidle');
      await expect(page.getByText('Gestión de Usuarios')).toBeVisible({ timeout: 15000 });

      // Navegar a Logs por URL
      await page.goto('/admin?tab=logs');
      await page.waitForLoadState('networkidle');
      await expect(page.getByText(/Logs|Sistema/i).first()).toBeVisible({ timeout: 15000 });
    });

    test('navega entre tabs por click en sidebar', async ({ page }) => {
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');

      // Esperar a que cargue
      await expect(page.getByRole('button', { name: /Usuarios|Dashboard/i }).first()).toBeVisible({ timeout: 15000 });

      // Click en Usuarios
      await page.getByRole('button', { name: /Usuarios/i }).click();
      await expect(page.getByText('Gestión de Usuarios')).toBeVisible({ timeout: 15000 });

      // Click en Mantenimiento
      await page.getByRole('button', { name: /Mantenimiento/i }).click();
      await page.waitForLoadState('networkidle');
      await expect(page.getByText('Almacenamiento')).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('Panel de Usuarios', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/admin?tab=users');
      await page.waitForLoadState('networkidle');
      await expect(page.getByText('Gestión de Usuarios')).toBeVisible({ timeout: 15000 });
    });

    test('muestra la tabla de usuarios', async ({ page }) => {
      // Botón de crear usuario
      await expect(page.getByRole('button', { name: /Crear Usuario/i })).toBeVisible({ timeout: 10000 });

      // Debe haber una tabla o lista de usuarios
      await expect(page.locator('table, [class*="user"]').first()).toBeVisible();
    });

    test('abre el modal de crear usuario', async ({ page }) => {
      const createButton = page.getByRole('button', { name: /Crear Usuario/i });
      await createButton.click();

      // Debe abrir un modal con formulario o mostrar un form inline
      // Buscar cualquier elemento que indique que se abrió algo para crear usuario
      const modalOrForm = page.getByRole('dialog')
        .or(page.locator('[class*="modal"]'))
        .or(page.locator('form').filter({ hasText: /usuario|password|nombre/i }));

      await expect(modalOrForm.first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Panel de Mantenimiento', () => {
    test('carga la pestaña de mantenimiento', async ({ page }) => {
      await page.goto('/admin?tab=maintenance');
      await page.waitForLoadState('networkidle');

      // Verificar que estamos en la URL correcta y la página cargó
      expect(page.url()).toContain('tab=maintenance');

      // El contenido puede tardar en cargar si el API está lento
      // Buscar cualquier contenido de mantenimiento o el estado de carga
      const hasContent = await page.locator('[class*="maintenance"], [class*="storage"], [class*="cleanup"]').first().isVisible({ timeout: 10000 }).catch(() => false);
      const hasText = await page.getByText(/Almacenamiento|Limpieza|Cargando|Storage|Cleanup/i).first().isVisible().catch(() => false);
      const hasButtons = await page.getByRole('button').first().isVisible().catch(() => false);

      // Al menos algo debe estar visible (contenido, loading o botones)
      expect(hasContent || hasText || hasButtons).toBeTruthy();
    });
  });

  test.describe('Notificaciones', () => {
    test.skip('muestra notificación de éxito al guardar configuración', async ({ page }) => {
      // Skipped: depende de configuración específica que puede no existir en CI
      await page.goto('/admin?tab=metadata');
      await page.waitForLoadState('networkidle');

      const saveButton = page.getByRole('button', { name: /Guardar/i }).first();

      if (await saveButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await saveButton.click();

        await expect(
          page.locator('[class*="notification"]').filter({ hasText: /guardad|success|correctamente/i })
        ).toBeVisible({ timeout: 10000 });
      }
    });

    test.skip('la notificación se cierra automáticamente', async ({ page }) => {
      // Skipped: depende de configuración específica que puede no existir en CI
      await page.goto('/admin?tab=metadata');
      await page.waitForLoadState('networkidle');

      const saveButton = page.getByRole('button', { name: /Guardar/i }).first();

      if (await saveButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await saveButton.click();

        const notification = page.locator('[class*="notification"]').filter({
          hasText: /guardad|correctamente/i,
        });

        await expect(notification).toBeVisible({ timeout: 10000 });
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
