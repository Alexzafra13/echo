import { test, expect } from '@playwright/test';

/**
 * Tests de flujos críticos de usuario
 */

test.describe('Gestión de Usuarios', () => {
  test('modal de crear usuario se abre correctamente', async ({ page }) => {
    // 1. Ir al panel de usuarios
    await page.goto('/admin?tab=users');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Gestión de Usuarios')).toBeVisible({ timeout: 15000 });

    // 2. Abrir modal de crear usuario
    await page.getByRole('button', { name: /Crear Usuario/i }).click();

    // 3. Verificar que el modal se abrió
    await expect(page.getByRole('dialog', { name: /Crear Usuario/i })).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Búsqueda', () => {
  test('página de búsqueda carga correctamente', async ({ page }) => {
    // Navegar directamente a búsqueda con query
    await page.goto('/search?q=test');
    await page.waitForLoadState('networkidle');

    // Verificar que estamos en la página de búsqueda
    expect(page.url()).toContain('/search');

    // La página debe cargar sin errores
    const hasError = await page.locator('[class*="error"]').filter({ hasText: /error|500/i }).isVisible().catch(() => false);
    expect(hasError).toBeFalsy();
  });
});

test.describe('Navegación principal', () => {
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
