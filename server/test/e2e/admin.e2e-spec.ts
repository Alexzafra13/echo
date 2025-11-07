import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/infrastructure/persistence/prisma.service';

describe('Admin User Management E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let regularUserToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Aplicar los mismos pipes que en main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    app.setGlobalPrefix('api');

    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Limpiar BD
    await prisma.user.deleteMany();

    // Crear admin
    const adminResponse = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        username: 'admin',
        email: 'admin@test.com',
        password: 'Admin123!',
        name: 'Admin User',
      });

    adminToken = adminResponse.body.accessToken;

    // Hacer al usuario admin directamente en la BD
    await prisma.user.update({
      where: { username: 'admin' },
      data: { isAdmin: true },
    });

    // Crear usuario regular
    const userResponse = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        username: 'user',
        email: 'user@test.com',
        password: 'User123!',
        name: 'Regular User',
      });

    regularUserToken = userResponse.body.accessToken;
  });

  describe('POST /api/admin/users - Create User', () => {
    it('debería permitir a un admin crear un usuario', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'newuser',
          email: 'newuser@test.com',
          name: 'New User',
          isAdmin: false,
        })
        .expect(201);

      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe('newuser');
      expect(response.body.user.email).toBe('newuser@test.com');
      expect(response.body.user.name).toBe('New User');
      expect(response.body.user.isAdmin).toBe(false);
      expect(response.body.temporaryPassword).toBeDefined();
      expect(response.body.temporaryPassword).toMatch(/^[A-Za-z0-9]{8}$/);

      // Verificar en BD que el usuario tiene mustChangePassword = true
      const createdUser = await prisma.user.findUnique({
        where: { username: 'newuser' },
      });

      expect(createdUser).toBeDefined();
      expect(createdUser?.mustChangePassword).toBe(true);
      expect(createdUser?.isActive).toBe(true);
    });

    it('debería permitir crear un usuario admin', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'newadmin',
          email: 'newadmin@test.com',
          name: 'New Admin',
          isAdmin: true,
        })
        .expect(201);

      expect(response.body.user.isAdmin).toBe(true);

      // Verificar en BD
      const createdUser = await prisma.user.findUnique({
        where: { username: 'newadmin' },
      });

      expect(createdUser?.isAdmin).toBe(true);
    });

    it('debería permitir crear usuario sin email', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'noemail',
          name: 'No Email User',
        })
        .expect(201);

      expect(response.body.user.email).toBeUndefined();
    });

    it('debería rechazar si username ya existe', async () => {
      // Crear primer usuario
      await request(app.getHttpServer())
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'duplicate',
          email: 'test1@test.com',
        });

      // Intentar crear con username duplicado
      return request(app.getHttpServer())
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'duplicate',
          email: 'test2@test.com',
        })
        .expect(400);
    });

    it('debería rechazar si un usuario regular intenta crear usuarios', () => {
      return request(app.getHttpServer())
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({
          username: 'hacker',
          email: 'hacker@test.com',
        })
        .expect(403);
    });

    it('debería rechazar si no hay token de autenticación', () => {
      return request(app.getHttpServer())
        .post('/api/admin/users')
        .send({
          username: 'noauth',
          email: 'noauth@test.com',
        })
        .expect(401);
    });
  });

  describe('GET /api/admin/users - List Users', () => {
    it('debería listar todos los usuarios para un admin', async () => {
      // Crear algunos usuarios adicionales
      await request(app.getHttpServer())
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ username: 'user1', name: 'User One' });

      await request(app.getHttpServer())
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ username: 'user2', name: 'User Two' });

      const response = await request(app.getHttpServer())
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.users).toBeDefined();
      expect(response.body.users.length).toBeGreaterThanOrEqual(4); // admin, user, user1, user2
      expect(response.body.total).toBeGreaterThanOrEqual(4);
    });

    it('debería soportar paginación', async () => {
      // Crear varios usuarios
      for (let i = 1; i <= 5; i++) {
        await request(app.getHttpServer())
          .post('/api/admin/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ username: `testuser${i}`, name: `Test User ${i}` });
      }

      const response = await request(app.getHttpServer())
        .get('/api/admin/users?skip=2&take=3')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.users).toBeDefined();
      expect(response.body.users.length).toBe(3);
    });

    it('debería rechazar si un usuario regular intenta listar usuarios', () => {
      return request(app.getHttpServer())
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .expect(403);
    });
  });

  describe('PUT /api/admin/users/:id - Update User', () => {
    it('debería permitir actualizar el nombre de un usuario', async () => {
      // Obtener ID del usuario regular
      const users = await prisma.user.findMany({
        where: { username: 'user' },
      });
      const userId = users[0].id;

      const response = await request(app.getHttpServer())
        .put(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Name',
        })
        .expect(200);

      expect(response.body.name).toBe('Updated Name');

      // Verificar en BD
      const updatedUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      expect(updatedUser?.name).toBe('Updated Name');
    });

    it('debería permitir promover un usuario a admin', async () => {
      const users = await prisma.user.findMany({
        where: { username: 'user' },
      });
      const userId = users[0].id;

      const response = await request(app.getHttpServer())
        .put(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          isAdmin: true,
        })
        .expect(200);

      expect(response.body.isAdmin).toBe(true);

      // Verificar en BD
      const updatedUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      expect(updatedUser?.isAdmin).toBe(true);
    });

    it('debería permitir desactivar un usuario', async () => {
      const users = await prisma.user.findMany({
        where: { username: 'user' },
      });
      const userId = users[0].id;

      const response = await request(app.getHttpServer())
        .put(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          isActive: false,
        })
        .expect(200);

      expect(response.body.isActive).toBe(false);
    });

    it('debería rechazar email duplicado', async () => {
      const users = await prisma.user.findMany({
        where: { username: 'user' },
      });
      const userId = users[0].id;

      return request(app.getHttpServer())
        .put(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'admin@test.com', // Email del admin
        })
        .expect(400);
    });

    it('debería rechazar si un usuario regular intenta actualizar', async () => {
      const users = await prisma.user.findMany({
        where: { username: 'user' },
      });
      const userId = users[0].id;

      return request(app.getHttpServer())
        .put(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({
          name: 'Hacked',
        })
        .expect(403);
    });
  });

  describe('DELETE /api/admin/users/:id - Delete User', () => {
    it('debería permitir desactivar un usuario regular', async () => {
      const users = await prisma.user.findMany({
        where: { username: 'user' },
      });
      const userId = users[0].id;

      await request(app.getHttpServer())
        .delete(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verificar que es soft delete (isActive = false)
      const deletedUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      expect(deletedUser).toBeDefined(); // El usuario todavía existe
      expect(deletedUser?.isActive).toBe(false);
    });

    it('debería permitir desactivar un admin si hay más admins', async () => {
      // Crear un segundo admin
      const createResponse = await request(app.getHttpServer())
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'admin2',
          email: 'admin2@test.com',
          isAdmin: true,
        });

      const users = await prisma.user.findMany({
        where: { username: 'admin2' },
      });
      const admin2Id = users[0].id;

      // Desactivar admin2
      await request(app.getHttpServer())
        .delete(`/api/admin/users/${admin2Id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verificar
      const deletedAdmin = await prisma.user.findUnique({
        where: { id: admin2Id },
      });

      expect(deletedAdmin?.isActive).toBe(false);
    });

    it('debería rechazar si intenta desactivar el último admin', async () => {
      // Obtener ID del admin
      const admins = await prisma.user.findMany({
        where: { username: 'admin' },
      });
      const adminId = admins[0].id;

      return request(app.getHttpServer())
        .delete(`/api/admin/users/${adminId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Cannot delete the last admin user');
        });
    });

    it('debería rechazar si un usuario regular intenta desactivar', async () => {
      const users = await prisma.user.findMany({
        where: { username: 'user' },
      });
      const userId = users[0].id;

      return request(app.getHttpServer())
        .delete(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${regularUserToken}`)
        .expect(403);
    });
  });

  describe('POST /api/admin/users/:id/reset-password - Reset Password', () => {
    it('debería generar una nueva contraseña temporal', async () => {
      const users = await prisma.user.findMany({
        where: { username: 'user' },
      });
      const userId = users[0].id;

      const response = await request(app.getHttpServer())
        .post(`/api/admin/users/${userId}/reset-password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      expect(response.body.temporaryPassword).toBeDefined();
      expect(response.body.temporaryPassword).toMatch(/^[A-Za-z0-9]{8}$/);
      expect(response.body.temporaryPassword.length).toBe(8);

      // Verificar que mustChangePassword se activó
      const updatedUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      expect(updatedUser?.mustChangePassword).toBe(true);
    });

    it('debería funcionar para usuarios admin', async () => {
      const admins = await prisma.user.findMany({
        where: { username: 'admin' },
      });
      const adminId = admins[0].id;

      const response = await request(app.getHttpServer())
        .post(`/api/admin/users/${adminId}/reset-password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      expect(response.body.temporaryPassword).toBeDefined();
      expect(response.body.temporaryPassword).toMatch(/^[A-Za-z0-9]{8}$/);
    });

    it('debería rechazar si un usuario regular intenta resetear contraseñas', async () => {
      const users = await prisma.user.findMany({
        where: { username: 'user' },
      });
      const userId = users[0].id;

      return request(app.getHttpServer())
        .post(`/api/admin/users/${userId}/reset-password`)
        .set('Authorization', `Bearer ${regularUserToken}`)
        .expect(403);
    });
  });

  describe('Full User Management Workflow', () => {
    it('debería completar el flujo completo de gestión de usuario', async () => {
      // 1. Admin crea un usuario
      const createResponse = await request(app.getHttpServer())
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'workflow',
          email: 'workflow@test.com',
          name: 'Workflow User',
          isAdmin: false,
        })
        .expect(201);

      const { user, temporaryPassword } = createResponse.body;
      const userId = user.id;

      expect(temporaryPassword).toBeDefined();
      expect(user.mustChangePassword).toBeUndefined(); // No se retorna en DTO

      // 2. Verificar que el usuario existe y tiene mustChangePassword
      let dbUser = await prisma.user.findUnique({ where: { id: userId } });
      expect(dbUser?.mustChangePassword).toBe(true);
      expect(dbUser?.isActive).toBe(true);

      // 3. Admin actualiza el nombre del usuario
      await request(app.getHttpServer())
        .put(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Workflow User Updated',
        })
        .expect(200);

      // 4. Admin promociona a admin
      await request(app.getHttpServer())
        .put(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          isAdmin: true,
        })
        .expect(200);

      dbUser = await prisma.user.findUnique({ where: { id: userId } });
      expect(dbUser?.isAdmin).toBe(true);

      // 5. Admin resetea la contraseña
      const resetResponse = await request(app.getHttpServer())
        .post(`/api/admin/users/${userId}/reset-password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      expect(resetResponse.body.temporaryPassword).toBeDefined();
      expect(resetResponse.body.temporaryPassword).not.toBe(temporaryPassword);

      // 6. Admin desactiva el usuario
      await request(app.getHttpServer())
        .delete(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // 7. Verificar que es soft delete
      dbUser = await prisma.user.findUnique({ where: { id: userId } });
      expect(dbUser).toBeDefined();
      expect(dbUser?.isActive).toBe(false);
    });
  });
});
