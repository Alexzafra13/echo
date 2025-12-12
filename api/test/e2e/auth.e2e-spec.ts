import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DrizzleService } from '../../src/infrastructure/database/drizzle.service';
import { BullmqService } from '../../src/infrastructure/queue/bullmq.service';
import {
  createTestApp,
  createTestUser,
  loginUser,
  cleanUserTables,
  cleanQueues,
  getUserByUsername,
} from './helpers/test-setup';

/**
 * Auth E2E Tests
 *
 * Prueba los endpoints de autenticación:
 * - POST /api/auth/login - Login con credenciales
 * - POST /api/auth/refresh - Refrescar tokens
 * - GET /api/auth/me - Obtener usuario autenticado
 *
 * NOTA: Este proyecto NO tiene endpoint de registro público.
 * Los usuarios se crean via admin panel (/api/admin/users).
 */
describe('Auth E2E', () => {
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
    // Limpiar colas y usuarios antes de cada test
    await cleanQueues(bullmq);
    await cleanUserTables(drizzle);
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Crear usuario de prueba para tests de login
      await createTestUser(drizzle, {
        username: 'testuser',
        password: 'Test123!',
        name: 'Test User',
        isAdmin: false,
        mustChangePassword: false,
      });
    });

    it('debería loguear un usuario válido', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'Test123!',
        })
        .expect(200);

      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe('testuser');
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      expect(response.body.mustChangePassword).toBe(false);
    });

    it('debería retornar mustChangePassword=true para usuarios nuevos', async () => {
      // Crear usuario que debe cambiar contraseña
      await createTestUser(drizzle, {
        username: 'newuser',
        password: 'Temp123!',
        name: 'New User',
        mustChangePassword: true,
      });

      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          username: 'newuser',
          password: 'Temp123!',
        })
        .expect(200);

      expect(response.body.mustChangePassword).toBe(true);
    });

    it('debería loguear un usuario admin', async () => {
      await createTestUser(drizzle, {
        username: 'admin',
        password: 'Admin123!',
        name: 'Admin User',
        isAdmin: true,
      });

      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'Admin123!',
        })
        .expect(200);

      expect(response.body.user.username).toBe('admin');
      expect(response.body.user.isAdmin).toBe(true);
    });

    it('debería rechazar si username no existe', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          username: 'noexiste',
          password: 'Test123!',
        })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toContain('Invalid credentials');
        });
    });

    it('debería rechazar si password es incorrecto', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'WrongPassword!',
        })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toContain('Invalid credentials');
        });
    });

    it('debería rechazar si usuario está inactivo', async () => {
      await createTestUser(drizzle, {
        username: 'inactive',
        password: 'Test123!',
        isActive: false,
      });

      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          username: 'inactive',
          password: 'Test123!',
        })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toContain('inactive');
        });
    });

    it('debería rechazar si username está vacío', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          username: '',
          password: 'Test123!',
        })
        .expect(400);
    });

    it('debería rechazar si password está vacío', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: '',
        })
        .expect(400);
    });

    it('debería rechazar si faltan campos', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({})
        .expect(400);
    });
  });

  describe('POST /api/auth/refresh', () => {
    let refreshToken: string;
    let accessToken: string;

    beforeEach(async () => {
      await createTestUser(drizzle, {
        username: 'testuser',
        password: 'Test123!',
        name: 'Test User',
      });

      const tokens = await loginUser(app, 'testuser', 'Test123!');
      refreshToken = tokens.refreshToken;
      accessToken = tokens.accessToken;
    });

    it('debería generar nuevos tokens con refresh token válido', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(200);

      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      // Nota: Los tokens podrían ser iguales si se generan en el mismo segundo
      // ya que JWT usa timestamp en segundos para el claim 'iat'
      expect(typeof response.body.accessToken).toBe('string');
      expect(response.body.accessToken.length).toBeGreaterThan(0);
    });

    it('debería rechazar si refresh token es inválido', () => {
      return request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken: 'invalid_token_123' })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toContain('Invalid refresh token');
        });
    });

    it('debería rechazar si refresh token está vacío', () => {
      return request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken: '' })
        .expect(400);
    });

    it('debería rechazar sin Authorization header', () => {
      return request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });
  });

  describe('GET /api/auth/me', () => {
    let accessToken: string;

    beforeEach(async () => {
      await createTestUser(drizzle, {
        username: 'testuser',
        password: 'Test123!',
        name: 'Test User',
      });

      const tokens = await loginUser(app, 'testuser', 'Test123!');
      accessToken = tokens.accessToken;
    });

    it('debería retornar datos del usuario actual con token válido', () => {
      return request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.user).toBeDefined();
          expect(res.body.user.username).toBe('testuser');
          expect(res.body.user.name).toBe('Test User');
          expect(res.body.user.isAdmin).toBe(false);
          expect(res.body.user.hasAvatar).toBe(false);
        });
    });

    it('debería retornar hasAvatar=true si usuario tiene avatar', async () => {
      // Actualizar usuario con avatar
      const user = await getUserByUsername(drizzle, 'testuser');
      await drizzle.db
        .update(require('../../src/infrastructure/database/schema').users)
        .set({ avatarPath: '/avatars/testuser.jpg' })
        .where(require('drizzle-orm').eq(
          require('../../src/infrastructure/database/schema').users.id,
          user.id,
        ));

      return request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.user.hasAvatar).toBe(true);
        });
    });

    it('debería rechazar sin token', () => {
      return request(app.getHttpServer())
        .get('/api/auth/me')
        .expect(401);
    });

    it('debería rechazar con token inválido', () => {
      return request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid_token_123')
        .expect(401);
    });

    it('debería rechazar sin header Authorization', () => {
      return request(app.getHttpServer())
        .get('/api/auth/me')
        .expect(401);
    });
  });

  describe('Flujo completo de autenticación', () => {
    it('debería completar el flujo login → me → refresh → me', async () => {
      // Crear usuario
      await createTestUser(drizzle, {
        username: 'flowuser',
        password: 'Flow123!',
        name: 'Flow User',
      });

      // 1. Login
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ username: 'flowuser', password: 'Flow123!' })
        .expect(200);

      const { accessToken, refreshToken } = loginResponse.body;
      expect(accessToken).toBeDefined();
      expect(refreshToken).toBeDefined();

      // 2. Get /me con access token
      const meResponse1 = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(meResponse1.body.user.username).toBe('flowuser');

      // 3. Refresh tokens
      const refreshResponse = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(200);

      const newAccessToken = refreshResponse.body.accessToken;
      expect(newAccessToken).toBeDefined();
      // Nota: El token podría ser igual si se genera en el mismo segundo (JWT 'iat')

      // 4. Get /me con nuevo access token
      const meResponse2 = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(200);

      expect(meResponse2.body.user.username).toBe('flowuser');
    });
  });
});
