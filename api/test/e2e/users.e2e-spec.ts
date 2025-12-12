import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DrizzleService } from '../../src/infrastructure/database/drizzle.service';
import { BullmqService } from '../../src/infrastructure/queue/bullmq.service';
import {
  createTestApp,
  createTestUser,
  createUserAndLogin,
  cleanUserTables,
  cleanQueues,
  loginUser,
  getUserByUsername,
} from './helpers/test-setup';

/**
 * Users E2E Tests
 *
 * Prueba los endpoints de perfil de usuario:
 * - PUT /api/users/profile - Actualizar perfil
 * - PUT /api/users/password - Cambiar contraseña
 * - PUT /api/users/theme - Cambiar tema
 * - PUT /api/users/language - Cambiar idioma
 *
 * NOTA: Este proyecto NO tiene campo email en usuarios.
 */
describe('Users E2E', () => {
  let app: INestApplication;
  let drizzle: DrizzleService;
  let bullmq: BullmqService;

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    drizzle = testApp.drizzle;
    bullmq = testApp.bullmq;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await cleanQueues(bullmq);
    await cleanUserTables(drizzle);
  });

  describe('PUT /api/users/profile', () => {
    let accessToken: string;

    beforeEach(async () => {
      const { accessToken: token } = await createUserAndLogin(drizzle, app, {
        username: 'testuser',
        password: 'Test123!',
        name: 'Test User',
      });
      accessToken = token;
    });

    it('debería actualizar el nombre del usuario', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Updated Name',
        })
        .expect(200);

      expect(response.body.name).toBe('Updated Name');
    });

    it('debería rechazar campos no permitidos en el perfil', () => {
      // El DTO de update-profile solo acepta 'name', no 'bio'
      return request(app.getHttpServer())
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          bio: 'Music lover and audiophile',
        })
        .expect(400);
    });

    it('debería rechazar sin token de autenticación', () => {
      return request(app.getHttpServer())
        .put('/api/users/profile')
        .send({
          name: 'Updated Name',
        })
        .expect(401);
    });
  });

  describe('PUT /api/users/password', () => {
    let accessToken: string;

    beforeEach(async () => {
      const { accessToken: token } = await createUserAndLogin(drizzle, app, {
        username: 'testuser',
        password: 'Test123!',
      });
      accessToken = token;
    });

    it('debería cambiar la contraseña correctamente', async () => {
      await request(app.getHttpServer())
        .put('/api/users/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'Test123!',
          newPassword: 'NewPass456!',
        })
        .expect(204);

      // Verificar que puede loguearse con la nueva contraseña
      const tokens = await loginUser(app, 'testuser', 'NewPass456!');
      expect(tokens.accessToken).toBeDefined();
    });

    it('debería rechazar si la contraseña actual es incorrecta', () => {
      // La API devuelve 401 Unauthorized para contraseña incorrecta
      return request(app.getHttpServer())
        .put('/api/users/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'WrongPassword!',
          newPassword: 'NewPass456!',
        })
        .expect(401);
    });

    it('debería rechazar si la nueva contraseña es igual a la actual', () => {
      return request(app.getHttpServer())
        .put('/api/users/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'Test123!',
          newPassword: 'Test123!',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('different');
        });
    });

    it('debería rechazar sin token de autenticación', () => {
      return request(app.getHttpServer())
        .put('/api/users/password')
        .send({
          currentPassword: 'Test123!',
          newPassword: 'NewPass456!',
        })
        .expect(401);
    });
  });

  describe('PUT /api/users/theme', () => {
    let accessToken: string;

    beforeEach(async () => {
      const { accessToken: token } = await createUserAndLogin(drizzle, app, {
        username: 'testuser',
        password: 'Test123!',
      });
      accessToken = token;
    });

    it('debería cambiar el tema a dark', async () => {
      await request(app.getHttpServer())
        .put('/api/users/theme')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          theme: 'dark',
        })
        .expect(204);

      const user = await getUserByUsername(drizzle, 'testuser');
      expect(user.theme).toBe('dark');
    });

    it('debería cambiar el tema a light', async () => {
      await request(app.getHttpServer())
        .put('/api/users/theme')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          theme: 'light',
        })
        .expect(204);

      const user = await getUserByUsername(drizzle, 'testuser');
      expect(user.theme).toBe('light');
    });

    it('debería rechazar tema inválido', () => {
      return request(app.getHttpServer())
        .put('/api/users/theme')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          theme: 'invalid_theme',
        })
        .expect(400);
    });

    it('debería rechazar sin token de autenticación', () => {
      return request(app.getHttpServer())
        .put('/api/users/theme')
        .send({
          theme: 'dark',
        })
        .expect(401);
    });
  });

  describe('PUT /api/users/language', () => {
    let accessToken: string;

    beforeEach(async () => {
      const { accessToken: token } = await createUserAndLogin(drizzle, app, {
        username: 'testuser',
        password: 'Test123!',
      });
      accessToken = token;
    });

    it('debería cambiar el idioma a inglés', async () => {
      await request(app.getHttpServer())
        .put('/api/users/language')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          language: 'en',
        })
        .expect(204);

      const user = await getUserByUsername(drizzle, 'testuser');
      expect(user.language).toBe('en');
    });

    it('debería cambiar el idioma a español', async () => {
      await request(app.getHttpServer())
        .put('/api/users/language')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          language: 'es',
        })
        .expect(204);

      const user = await getUserByUsername(drizzle, 'testuser');
      expect(user.language).toBe('es');
    });

    it('debería rechazar idioma inválido', () => {
      return request(app.getHttpServer())
        .put('/api/users/language')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          language: 'invalid_lang',
        })
        .expect(400);
    });

    it('debería rechazar sin token de autenticación', () => {
      return request(app.getHttpServer())
        .put('/api/users/language')
        .send({
          language: 'en',
        })
        .expect(401);
    });
  });

  describe('Flujo de primer login (must change password)', () => {
    it('debería forzar cambio de contraseña después del primer login', async () => {
      // Crear usuario con mustChangePassword=true (como lo haría un admin)
      await createTestUser(drizzle, {
        username: 'newuser',
        password: 'TempPass123!',
        mustChangePassword: true,
      });

      // Login retorna mustChangePassword=true
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ username: 'newuser', password: 'TempPass123!' })
        .expect(200);

      expect(loginResponse.body.mustChangePassword).toBe(true);
      const { accessToken } = loginResponse.body;

      // El usuario debe cambiar su contraseña primero
      await request(app.getHttpServer())
        .put('/api/users/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'TempPass123!',
          newPassword: 'MyNewPassword456!',
        })
        .expect(204);

      // Verificar que mustChangePassword ahora es false
      const user = await getUserByUsername(drizzle, 'newuser');
      expect(user.mustChangePassword).toBe(false);

      // Ahora puede hacer login normalmente
      const newLoginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ username: 'newuser', password: 'MyNewPassword456!' })
        .expect(200);

      expect(newLoginResponse.body.mustChangePassword).toBe(false);
    });
  });
});
