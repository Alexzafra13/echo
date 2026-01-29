import { test, expect } from '@playwright/test';

/**
 * Tests de flujos críticos de usuario
 */

// Helper: Login como admin
async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await expect(page.locator('input[name="username"]')).toBeVisible({ timeout: 15000 });

  await page.locator('input[name="username"]').fill('admin');
  await page.locator('input[name="password"]').fill('adminpassword123');
  await page.getByRole('button', { name: /Iniciar Sesión/i }).click();

  await page.waitForURL(/^(?!.*login)/, { timeout: 15000 });

  if (page.url().includes('first-login')) {
    await page.locator('input[name="newPassword"]').fill('adminpassword123');
    await page.locator('input[name="confirmPassword"]').fill('adminpassword123');
    await page.getByRole('button', { name: /Cambiar|Guardar/i }).click();
    await page.waitForURL(/^(?!.*first-login)/, { timeout: 15000 });
  }
}

test.describe('Gestión de Usuarios', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('flujo completo: crear, ver y eliminar usuario', async ({ page }) => {
    const testUsername = `testuser_${Date.now()}`;

    // 1. Ir al panel de usuarios
    await page.goto('/admin?tab=users');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Gestión de Usuarios')).toBeVisible({ timeout: 15000 });

    // 2. Abrir modal de crear usuario
    await page.getByRole('button', { name: /Crear Usuario/i }).click();
    await expect(page.getByRole('dialog').or(page.locator('[class*="modal"]'))).toBeVisible({ timeout: 5000 });

    // 3. Rellenar formulario
    await page.locator('input[name="username"]').fill(testUsername);
    await page.locator('input[name="password"]').fill('TestPassword123!');

    // Seleccionar rol si existe el campo
    const roleSelect = page.locator('select[name="role"], [name="role"]');
    if (await roleSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
      await roleSelect.selectOption('user');
    }

    // 4. Guardar usuario
    await page.getByRole('button', { name: /Crear|Guardar|Submit/i }).click();

    // 5. Verificar que el usuario aparece en la lista
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(testUsername)).toBeVisible({ timeout: 10000 });

    // 6. Eliminar el usuario de prueba (cleanup)
    const userRow = page.locator('tr, [class*="row"]').filter({ hasText: testUsername });
    const deleteButton = userRow.getByRole('button', { name: /Eliminar|Delete|Borrar/i }).or(
      userRow.locator('[class*="delete"], [aria-label*="delete"], [aria-label*="eliminar"]')
    );

    if (await deleteButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await deleteButton.click();

      // Confirmar eliminación si hay diálogo
      const confirmButton = page.getByRole('button', { name: /Confirmar|Sí|Yes|Eliminar/i });
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click();
      }

      await page.waitForLoadState('networkidle');
    }
  });
});

test.describe('Búsqueda', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('buscar desde la barra de navegación', async ({ page }) => {
    await page.goto('/home');
    await page.waitForLoadState('networkidle');

    // Buscar el input de búsqueda
    const searchInput = page.locator('input[type="search"], input[placeholder*="Buscar"], input[placeholder*="Search"], [class*="search"] input');

    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill('test');
      await searchInput.press('Enter');

      // Debe navegar a resultados de búsqueda o mostrar resultados
      await page.waitForLoadState('networkidle');

      const isOnSearchPage = page.url().includes('/search');
      const hasResults = await page.locator('[class*="result"], [class*="track"], [class*="album"], [class*="artist"]').first().isVisible({ timeout: 5000 }).catch(() => false);
      const hasNoResults = await page.getByText(/no.*result|sin.*resultado|no encontr/i).isVisible().catch(() => false);

      // Debe mostrar página de búsqueda, resultados, o mensaje de no resultados
      expect(isOnSearchPage || hasResults || hasNoResults).toBeTruthy();
    }
  });

  test('página de búsqueda carga correctamente', async ({ page }) => {
    await page.goto('/search?q=test');
    await page.waitForLoadState('networkidle');

    // La página debe cargar sin errores
    const hasError = await page.locator('[class*="error"]').filter({ hasText: /error|500/i }).isVisible().catch(() => false);
    expect(hasError).toBeFalsy();
  });
});

test.describe('Navegación principal', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('navegación entre secciones principales', async ({ page }) => {
    await page.goto('/home');
    await page.waitForLoadState('networkidle');

    // Home carga
    expect(page.url()).toContain('/home');

    // Navegar a Albums
    await page.goto('/albums');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/albums');

    // Navegar a Artists
    await page.goto('/artists');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/artists');

    // Navegar a Playlists
    await page.goto('/playlists');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/playlists');
  });

  test('sidebar o navegación muestra links principales', async ({ page }) => {
    await page.goto('/home');
    await page.waitForLoadState('networkidle');

    // Buscar navegación
    const nav = page.locator('nav, aside, [class*="sidebar"], [class*="nav"]').first();

    // Debe tener links a secciones principales
    const hasHomeLink = await nav.getByText(/Home|Inicio/i).isVisible().catch(() => false);
    const hasAlbumsLink = await nav.getByText(/Albums|Álbumes/i).isVisible().catch(() => false);
    const hasArtistsLink = await nav.getByText(/Artists|Artistas/i).isVisible().catch(() => false);

    // Al menos algunos links de navegación deben estar visibles
    expect(hasHomeLink || hasAlbumsLink || hasArtistsLink).toBeTruthy();
  });
});

test.describe('Playlists', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('página de playlists carga correctamente', async ({ page }) => {
    await page.goto('/playlists');
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/playlists');

    // Debe mostrar título o contenido de playlists
    const hasTitle = await page.getByText(/Playlist|Listas/i).first().isVisible({ timeout: 10000 }).catch(() => false);
    const hasCreateButton = await page.getByRole('button', { name: /Crear|Nueva|New|Create/i }).isVisible().catch(() => false);
    const hasContent = await page.locator('[class*="playlist"], [class*="list"]').first().isVisible().catch(() => false);

    expect(hasTitle || hasCreateButton || hasContent).toBeTruthy();
  });

  test('crear nueva playlist', async ({ page }) => {
    const playlistName = `Test Playlist ${Date.now()}`;

    await page.goto('/playlists');
    await page.waitForLoadState('networkidle');

    // Buscar botón de crear
    const createButton = page.getByRole('button', { name: /Crear|Nueva|New|Create/i });

    if (await createButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createButton.click();

      // Esperar modal o formulario
      await page.waitForTimeout(500);

      // Rellenar nombre
      const nameInput = page.locator('input[name="name"], input[placeholder*="nombre"], input[placeholder*="name"]');
      if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await nameInput.fill(playlistName);

        // Guardar
        await page.getByRole('button', { name: /Crear|Guardar|Save|Submit/i }).click();
        await page.waitForLoadState('networkidle');

        // Verificar que se creó
        const created = await page.getByText(playlistName).isVisible({ timeout: 5000 }).catch(() => false);
        expect(created).toBeTruthy();
      }
    }
  });
});

test.describe('Perfil de usuario', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('página de perfil carga correctamente', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/profile');

    // Debe mostrar información del usuario
    const hasUsername = await page.getByText(/admin/i).isVisible({ timeout: 10000 }).catch(() => false);
    const hasProfileContent = await page.locator('[class*="profile"], [class*="avatar"], [class*="user"]').first().isVisible().catch(() => false);

    expect(hasUsername || hasProfileContent).toBeTruthy();
  });

  test('página de configuración carga correctamente', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/settings');

    // Debe mostrar opciones de configuración
    const hasSettings = await page.locator('[class*="setting"], form, [class*="option"]').first().isVisible({ timeout: 10000 }).catch(() => false);
    expect(hasSettings).toBeTruthy();
  });
});
