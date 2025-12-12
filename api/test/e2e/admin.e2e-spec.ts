import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DrizzleService } from '../../src/infrastructure/database/drizzle.service';
import { BullmqService } from '../../src/infrastructure/queue/bullmq.service';
import {
  createTestApp,
  createTestUser,
  createAdminAndLogin,
  createUserAndLogin,
  cleanUserTables,
  cleanQueues,
  getUserById,
} from './helpers/test-setup';

/**
 * Admin E2E Tests
 *
 * Prueba los endpoints de administración de usuarios:
 * - POST /api/admin/users - Crear usuario
 * - GET /api/admin/users - Listar usuarios
 * - PUT /api/admin/users/:id - Actualizar usuario
 * - DELETE /api/admin/users/:id - Desactivar usuario (soft delete)
 * - DELETE /api/admin/users/:id/permanently - Eliminar permanentemente
 * - POST /api/admin/users/:id/reset-password - Resetear contraseña
 */
describe('Admin E2E', () => {
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

  describe('POST /api/admin/users (Crear usuario)', () => {
    let adminToken: string;

    beforeEach(async () => {
      const { accessToken } = await createAdminAndLogin(drizzle, app);
      adminToken = accessToken;
    });

    it('debería crear un nuevo usuario', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'newuser',
          name: 'New User',
          isAdmin: false,
        })
        .expect(201);

      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe('newuser');
      expect(response.body.user.name).toBe('New User');
      expect(response.body.user.isAdmin).toBe(false);
      expect(response.body.temporaryPassword).toBeDefined();
      expect(response.body.temporaryPassword.length).toBeGreaterThanOrEqual(8);
    });

    it('debería crear un usuario admin', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'newadmin',
          name: 'New Admin',
          isAdmin: true,
        })
        .expect(201);

      expect(response.body.user.isAdmin).toBe(true);
    });

    it('debería rechazar si username ya existe', async () => {
      // Crear usuario primero
      await createTestUser(drizzle, {
        username: 'existing',
        password: 'Test123!',
      });

      return request(app.getHttpServer())
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'existing',
          name: 'Existing User',
        })
        .expect(409)
        .expect((res) => {
          expect(res.body.message).toContain('already exists');
        });
    });

    it('debería rechazar si username está vacío', () => {
      return request(app.getHttpServer())
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: '',
          name: 'Test',
        })
        .expect(400);
    });

    it('debería rechazar sin autenticación', () => {
      return request(app.getHttpServer())
        .post('/api/admin/users')
        .send({
          username: 'newuser',
          name: 'New User',
        })
        .expect(401);
    });

    it('debería rechazar si no es admin', async () => {
      const { accessToken: userToken } = await createUserAndLogin(drizzle, app, {
        username: 'regularuser',
        password: 'User123!',
      });

      return request(app.getHttpServer())
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          username: 'newuser',
          name: 'New User',
        })
        .expect(403);
    });
  });

  describe('GET /api/admin/users (Listar usuarios)', () => {
    let adminToken: string;

    beforeEach(async () => {
      const { accessToken } = await createAdminAndLogin(drizzle, app);
      adminToken = accessToken;

      // Crear usuarios adicionales
      await createTestUser(drizzle, { username: 'user1', password: 'Test123!', name: 'User 1' });
      await createTestUser(drizzle, { username: 'user2', password: 'Test123!', name: 'User 2' });
      await createTestUser(drizzle, { username: 'user3', password: 'Test123!', name: 'User 3' });
    });

    it('debería listar todos los usuarios', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.users).toBeInstanceOf(Array);
      expect(response.body.users.length).toBe(4); // admin + 3 users
      expect(response.body.total).toBe(4);
    });

    it('debería aplicar paginación', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/admin/users?skip=0&take=2')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.users.length).toBe(2);
      expect(response.body.total).toBe(4);
    });

    it('debería incluir información de usuarios', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const user = response.body.users[0];
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('username');
      expect(user).toHaveProperty('name');
      expect(user).toHaveProperty('isAdmin');
      expect(user).toHaveProperty('isActive');
      expect(user).toHaveProperty('createdAt');
    });

    it('debería rechazar sin autenticación', () => {
      return request(app.getHttpServer())
        .get('/api/admin/users')
        .expect(401);
    });

    it('debería rechazar si no es admin', async () => {
      const { accessToken: userToken } = await createUserAndLogin(drizzle, app, {
        username: 'regularuser',
        password: 'User123!',
      });

      return request(app.getHttpServer())
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('PUT /api/admin/users/:id (Actualizar usuario)', () => {
    let adminToken: string;
    let targetUserId: string;

    beforeEach(async () => {
      const { accessToken } = await createAdminAndLogin(drizzle, app);
      adminToken = accessToken;

      const user = await createTestUser(drizzle, {
        username: 'targetuser',
        password: 'Test123!',
        name: 'Target User',
      });
      targetUserId = user.id;
    });

    it('debería actualizar nombre de usuario', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/admin/users/${targetUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(response.body.name).toBe('Updated Name');
    });

    it('debería promover usuario a admin', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/admin/users/${targetUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isAdmin: true })
        .expect(200);

      expect(response.body.isAdmin).toBe(true);
    });

    it('debería desactivar usuario', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/admin/users/${targetUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false })
        .expect(200);

      expect(response.body.isActive).toBe(false);
    });

    it('debería retornar 404 si usuario no existe', () => {
      return request(app.getHttpServer())
        .put('/api/admin/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated' })
        .expect(404);
    });

    it('debería rechazar sin autenticación', () => {
      return request(app.getHttpServer())
        .put(`/api/admin/users/${targetUserId}`)
        .send({ name: 'Updated' })
        .expect(401);
    });
  });

  describe('DELETE /api/admin/users/:id (Desactivar usuario)', () => {
    let adminToken: string;
    let targetUserId: string;

    beforeEach(async () => {
      const { accessToken } = await createAdminAndLogin(drizzle, app);
      adminToken = accessToken;

      const user = await createTestUser(drizzle, {
        username: 'targetuser',
        password: 'Test123!',
      });
      targetUserId = user.id;
    });

    it('debería desactivar un usuario (soft delete)', async () => {
      await request(app.getHttpServer())
        .delete(`/api/admin/users/${targetUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // Verificar que el usuario está desactivado
      const user = await getUserById(drizzle, targetUserId);
      expect(user.isActive).toBe(false);
    });

    it('debería retornar 404 si usuario no existe', () => {
      return request(app.getHttpServer())
        .delete('/api/admin/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('debería rechazar sin autenticación', () => {
      return request(app.getHttpServer())
        .delete(`/api/admin/users/${targetUserId}`)
        .expect(401);
    });
  });

  describe('POST /api/admin/users/:id/reset-password', () => {
    let adminToken: string;
    let targetUserId: string;

    beforeEach(async () => {
      const { accessToken } = await createAdminAndLogin(drizzle, app);
      adminToken = accessToken;

      const user = await createTestUser(drizzle, {
        username: 'targetuser',
        password: 'Test123!',
      });
      targetUserId = user.id;
    });

    it('debería resetear la contraseña y retornar contraseña temporal', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/admin/users/${targetUserId}/reset-password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.temporaryPassword).toBeDefined();
      expect(response.body.temporaryPassword.length).toBeGreaterThanOrEqual(8);

      // Verificar que el usuario debe cambiar contraseña
      const user = await getUserById(drizzle, targetUserId);
      expect(user.mustChangePassword).toBe(true);
    });

    it('debería retornar 404 si usuario no existe', () => {
      return request(app.getHttpServer())
        .post('/api/admin/users/00000000-0000-0000-0000-000000000000/reset-password')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('debería rechazar sin autenticación', () => {
      return request(app.getHttpServer())
        .post(`/api/admin/users/${targetUserId}/reset-password`)
        .expect(401);
    });
  });

  describe('DELETE /api/admin/users/:id/permanently (Eliminar permanentemente)', () => {
    let adminToken: string;
    let targetUserId: string;

    beforeEach(async () => {
      const { accessToken } = await createAdminAndLogin(drizzle, app);
      adminToken = accessToken;

      const user = await createTestUser(drizzle, {
        username: 'targetuser',
        password: 'Test123!',
      });
      targetUserId = user.id;
    });

    it('debería eliminar permanentemente un usuario', async () => {
      await request(app.getHttpServer())
        .delete(`/api/admin/users/${targetUserId}/permanently`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // Verificar que el usuario ya no existe
      const user = await getUserById(drizzle, targetUserId);
      expect(user).toBeUndefined();
    });

    it('debería retornar 404 si usuario no existe', () => {
      return request(app.getHttpServer())
        .delete('/api/admin/users/00000000-0000-0000-0000-000000000000/permanently')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('debería rechazar sin autenticación', () => {
      return request(app.getHttpServer())
        .delete(`/api/admin/users/${targetUserId}/permanently`)
        .expect(401);
    });
  });

  describe('Flujo completo de gestión de usuarios', () => {
    it('debería completar el flujo crear → actualizar → resetear → desactivar', async () => {
      const { accessToken: adminToken } = await createAdminAndLogin(drizzle, app);

      // 1. Crear usuario
      const createResponse = await request(app.getHttpServer())
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'workflow',
          name: 'Workflow User',
          isAdmin: false,
        })
        .expect(201);

      const { user, temporaryPassword } = createResponse.body;
      const userId = user.id;

      expect(temporaryPassword).toBeDefined();

      // Verificar que tiene mustChangePassword
      let dbUser = await getUserById(drizzle, userId);
      expect(dbUser.mustChangePassword).toBe(true);
      expect(dbUser.isActive).toBe(true);

      // 2. Actualizar nombre
      await request(app.getHttpServer())
        .put(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Workflow User Updated' })
        .expect(200);

      // 3. Promover a admin
      await request(app.getHttpServer())
        .put(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isAdmin: true })
        .expect(200);

      dbUser = await getUserById(drizzle, userId);
      expect(dbUser.isAdmin).toBe(true);

      // 4. Resetear contraseña
      const resetResponse = await request(app.getHttpServer())
        .post(`/api/admin/users/${userId}/reset-password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(resetResponse.body.temporaryPassword).toBeDefined();
      expect(resetResponse.body.temporaryPassword).not.toBe(temporaryPassword);

      // 5. Desactivar usuario
      await request(app.getHttpServer())
        .delete(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // 6. Verificar soft delete
      dbUser = await getUserById(drizzle, userId);
      expect(dbUser).toBeDefined();
      expect(dbUser.isActive).toBe(false);
    });
  });
});
