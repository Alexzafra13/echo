import { test, expect } from '@playwright/test';

test.describe('Autenticación', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('muestra el formulario de login con logo', async ({ page }) => {
    // Logo de Echo
    await expect(page.locator('img[alt="Echo"]')).toBeVisible();

    // Campos del formulario
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();

    // Botón de submit
    await expect(page.getByRole('button', { name: /Iniciar Sesión/i })).toBeVisible();
  });

  test('muestra validación al enviar formulario vacío', async ({ page }) => {
    // Click submit sin rellenar
    await page.getByRole('button', { name: /Iniciar Sesión/i }).click();

    // Debe mostrar mensajes de validación de zod
    await expect(page.getByText('El nombre de usuario es requerido')).toBeVisible();
    await expect(page.getByText('La contraseña es requerida')).toBeVisible();
  });

  test('muestra error con credenciales incorrectas', async ({ page }) => {
    await page.locator('input[name="username"]').fill('usuario_invalido');
    await page.locator('input[name="password"]').fill('password_invalida');
    await page.getByRole('button', { name: /Iniciar Sesión/i }).click();

    // Debe mostrar alerta de error
    await expect(page.getByText(/Error al iniciar sesión|credenciales/i)).toBeVisible({
      timeout: 10000,
    });
  });

  test('login exitoso redirige a /home', async ({ page }) => {
    await page.locator('input[name="username"]').fill('admin');
    await page.locator('input[name="password"]').fill('adminpassword123');
    await page.getByRole('button', { name: /Iniciar Sesión/i }).click();

    // Debe redirigir fuera de /login
    await expect(page).not.toHaveURL(/login/, { timeout: 10000 });
  });

  test('el botón muestra loading durante el login', async ({ page }) => {
    await page.locator('input[name="username"]').fill('admin');
    await page.locator('input[name="password"]').fill('adminpassword123');

    const submitButton = page.getByRole('button', { name: /Iniciar Sesión/i });
    await submitButton.click();

    // El botón debe estar deshabilitado mientras carga
    await expect(submitButton).toBeDisabled();
  });
});
