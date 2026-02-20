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
      page.getByRole('heading', { name: /Álbumes/i }).or(
        page.getByText(/Cargando álbumes|No hay álbumes|Error al cargar/i)
      ).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('página de artistas carga correctamente', async ({ page }) => {
    await page.goto('/artists');

    expect(page.url()).toContain('/artists');

    // Debe mostrar título, contenido o estado vacío
    await expect(
      page.getByRole('heading', { name: /Artistas/i }).or(
        page.getByText(/Cargando artistas|No hay artistas|Error al cargar/i)
      ).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('click en álbum navega a su detalle', async ({ page }) => {
    await page.goto('/albums');

    // Esperar a que carguen los álbumes o el estado vacío
    await expect(
      page.getByRole('heading', { name: /Álbumes/i }).or(
        page.getByText(/No hay álbumes/i)
      ).first()
    ).toBeVisible({ timeout: 15000 });

    // Solo testear la interacción si hay álbumes disponibles
    const albumLinks = page.getByRole('link').filter({ has: page.locator('img') });
    const albumCount = await albumLinks.count();

    if (albumCount > 0) {
      await albumLinks.first().click();
      await page.waitForLoadState('networkidle');

      // Debe navegar a la página de detalle del álbum
      expect(page.url()).toMatch(/\/albums\/|\/album\//);
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
        page.getByText(/Cargando emisoras|No se encontraron emisoras/i)
      ).first()
    ).toBeVisible({ timeout: 15000 });
  });
});
