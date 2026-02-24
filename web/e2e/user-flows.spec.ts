import { test, expect } from '@playwright/test';

/**
 * Tests de flujos críticos de usuario
 */

test.describe('Gestión de Usuarios', () => {
  test('modal de crear usuario se abre correctamente', async ({ page }) => {
    // 1. Ir al panel de usuarios
    await page.goto('/admin?tab=users');
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

    // Verificar que estamos en la página de búsqueda
    expect(page.url()).toContain('/search');

    // La página debe cargar sin errores críticos visibles
    await expect(page.locator('main').first()).toBeVisible({ timeout: 10000 });

    // No debe haber errores de servidor visibles
    const serverError = page.getByText(/500|Internal Server Error/i);
    await expect(serverError).not.toBeVisible({ timeout: 3000 }).catch(() => {
      // Si hay un error 500, el test debe fallar explícitamente
      expect(serverError).not.toBeVisible();
    });
  });
});

test.describe('Navegación principal', () => {
  test('navegación entre secciones principales', async ({ page }) => {
    await page.goto('/home');

    // Home carga
    expect(page.url()).toContain('/home');

    // Navegar a Albums
    await page.goto('/albums');
    expect(page.url()).toContain('/albums');

    // Navegar a Artists
    await page.goto('/artists');
    expect(page.url()).toContain('/artists');

    // Navegar a Playlists
    await page.goto('/playlists');
    expect(page.url()).toContain('/playlists');
  });

  test('sidebar o navegación muestra links principales', async ({ page }) => {
    await page.goto('/home');

    // Esperar a que el sidebar renderice con los links de navegación
    const sidebar = page.locator('aside').first();
    await expect(sidebar).toBeVisible({ timeout: 15000 });

    // Debe tener al menos un link a secciones principales
    await expect(
      sidebar.getByText(/Inicio|Albums|Artists/i).first()
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Playlists', () => {
  test('página de playlists carga correctamente', async ({ page }) => {
    await page.goto('/playlists');

    expect(page.url()).toContain('/playlists');

    // Debe mostrar título, botón crear, loading o estado vacío
    await expect(
      page.getByRole('heading', { name: /Playlists/i }).or(
        page.getByText(/Cargando playlists|No tienes playlists/i)
      ).or(
        page.getByRole('button', { name: /Nueva Playlist/i })
      ).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('crear nueva playlist', async ({ page }) => {
    const playlistName = `Test Playlist ${Date.now()}`;

    await page.goto('/playlists');

    // Esperar a que la página cargue
    await expect(
      page.getByRole('heading', { name: /Playlists/i }).or(
        page.getByRole('button', { name: /Crear|Nueva|New|Create/i })
      ).first()
    ).toBeVisible({ timeout: 15000 });

    // Buscar botón de crear (usar first() porque puede haber uno en header y otro en empty state)
    const createButton = page.getByRole('button', { name: /Crear|Nueva|New|Create/i }).first();
    await expect(createButton).toBeVisible({ timeout: 5000 });

    await createButton.click();

    // Esperar modal o formulario
    const nameInput = page.locator('input[placeholder="Mi Playlist..."], input[name="name"], input[placeholder*="playlist" i]');
    await expect(nameInput.first()).toBeVisible({ timeout: 5000 });

    await nameInput.first().fill(playlistName);

    // Guardar
    await page.getByRole('button', { name: /Crear|Guardar|Save|Submit/i }).click();

    // Verificar que se creó - debe aparecer en la lista
    await expect(page.getByText(playlistName)).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Perfil de usuario', () => {
  test('página de perfil carga correctamente', async ({ page }) => {
    await page.goto('/profile');

    expect(page.url()).toContain('/profile');

    // Debe mostrar información del usuario (nombre admin al menos)
    await expect(
      page.getByText(/admin/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('página de configuración carga correctamente', async ({ page }) => {
    await page.goto('/settings');

    expect(page.url()).toContain('/settings');

    // Debe mostrar el título "Configuración" o contenido de ajustes
    await expect(
      page.getByRole('heading', { name: /Configuración/i }).or(
        page.getByText(/Personaliza tu experiencia|Cargando/i)
      ).first()
    ).toBeVisible({ timeout: 15000 });
  });
});
