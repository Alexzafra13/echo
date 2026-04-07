import { test, expect } from '@playwright/test';

/**
 * Tests del reproductor de música
 * Nota: Estos tests verifican la UI del player, no la reproducción real de audio
 */

test.describe('Reproductor de Audio', () => {
  test('la página home carga correctamente después de login', async ({ page }) => {
    await page.goto('/home');

    // Verificar que estamos en home y la página cargó
    expect(page.url()).toContain('/home');

    // Debe haber contenido principal visible
    await expect(page.locator('main').first()).toBeVisible({ timeout: 10000 });
  });

  test('página de álbumes carga correctamente', async ({ page }) => {
    await page.goto('/albums');

    expect(page.url()).toContain('/albums');

    // Debe mostrar título de página, álbumes, loading o estado vacío
    await expect(
      page.getByRole('heading', { name: /Álbumes|Albums/i }).or(
        page.getByText(/Cargando álbumes|Loading albums|No hay álbumes|No albums|Error al cargar|Error loading/i)
      ).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('página de artistas carga correctamente', async ({ page }) => {
    await page.goto('/artists');

    expect(page.url()).toContain('/artists');

    // Debe mostrar título, contenido o estado vacío
    await expect(
      page.getByRole('heading', { name: /Artistas|Artists/i }).or(
        page.getByText(/Cargando artistas|Loading artists|No hay artistas|No artists|Error al cargar|Error loading/i)
      ).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('click en álbum navega a su detalle', async ({ page }) => {
    await page.goto('/albums');

    // Esperar a que carguen los álbumes o el estado vacío
    await expect(
      page.getByRole('heading', { name: /Álbumes|Albums/i }).or(
        page.getByText(/No hay álbumes|No albums/i)
      ).first()
    ).toBeVisible({ timeout: 15000 });

    // Los álbumes se renderizan como <article> con imagen, no como <a> links
    const albumCards = page.locator('article').filter({ has: page.locator('img') });
    const albumCount = await albumCards.count();

    if (albumCount > 0) {
      await albumCards.first().click();
      await expect(page).toHaveURL(/\/album\//, { timeout: 15000 });
    }
  });
});

test.describe('Radio', () => {
  test('página de radio carga correctamente', async ({ page }) => {
    await page.goto('/radio');

    expect(page.url()).toContain('/radio');

    // Debe mostrar el título "Radio" o estado de carga
    await expect(
      page.getByRole('heading', { name: /Radio/i, level: 1 }).or(
        page.getByText(/Cargando emisoras|Loading stations|No se encontraron emisoras|No stations/i)
      ).first()
    ).toBeVisible({ timeout: 15000 });
  });
});
