import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/infrastructure/persistence/prisma.service';

describe('Users E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

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
    // Limpiar BD antes de cada test
    await prisma.user.deleteMany();

    // Registrar usuario y obtener token para cada test
    const registerResponse = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        username: 'testuser',
        email: 'test@test.com',
        password: 'Pass123!',
        name: 'Test User',
      });

    accessToken = registerResponse.body.accessToken;
    userId = registerResponse.body.user.id;
  });

  describe('PUT /api/users/profile', () => {
    it('debería actualizar el perfil del usuario autenticado', () => {
      return request(app.getHttpServer())
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Updated Name',
          email: 'updated@test.com',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(userId);
          expect(res.body.username).toBe('testuser');
          expect(res.body.name).toBe('Updated Name');
          expect(res.body.email).toBe('updated@test.com');
        });
    });

    it('debería actualizar solo el nombre', () => {
      return request(app.getHttpServer())
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Only Name Updated',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.name).toBe('Only Name Updated');
          expect(res.body.email).toBe('test@test.com');
        });
    });

    it('debería actualizar solo el email', () => {
      return request(app.getHttpServer())
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: 'newemail@test.com',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.email).toBe('newemail@test.com');
          expect(res.body.name).toBe('Test User');
        });
    });

    it('debería rechazar si email es inválido', () => {
      return request(app.getHttpServer())
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: 'invalid_email',
        })
        .expect(400);
    });

    it('debería rechazar si email ya está registrado', async () => {
      // Registrar otro usuario
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          username: 'anotheruser',
          email: 'another@test.com',
          password: 'Pass123!',
        });

      // Intentar actualizar con el email del otro usuario
      return request(app.getHttpServer())
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: 'another@test.com',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Email already registered');
        });
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
    it('debería cambiar la contraseña correctamente', async () => {
      await request(app.getHttpServer())
        .put('/api/users/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'Pass123!',
          newPassword: 'NewPass456!',
        })
        .expect(204);

      // Verificar que puede loguearse con la nueva contraseña
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'NewPass456!',
        })
        .expect(200);
    });

    it('debería rechazar si la contraseña actual es incorrecta', () => {
      return request(app.getHttpServer())
        .put('/api/users/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'WrongPassword!',
          newPassword: 'NewPass456!',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Current password is incorrect');
        });
    });

    it('debería rechazar si la nueva contraseña es débil', () => {
      return request(app.getHttpServer())
        .put('/api/users/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'Pass123!',
          newPassword: 'weak',
        })
        .expect(400);
    });

    it('debería rechazar si la nueva contraseña es igual a la actual', () => {
      return request(app.getHttpServer())
        .put('/api/users/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'Pass123!',
          newPassword: 'Pass123!',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('New password must be different from current password');
        });
    });

    it('debería rechazar sin token de autenticación', () => {
      return request(app.getHttpServer())
        .put('/api/users/password')
        .send({
          currentPassword: 'Pass123!',
          newPassword: 'NewPass456!',
        })
        .expect(401);
    });
  });

  describe('PUT /api/users/theme', () => {
    it('debería cambiar el tema a dark', () => {
      return request(app.getHttpServer())
        .put('/api/users/theme')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          theme: 'dark',
        })
        .expect(204);
    });

    it('debería cambiar el tema a light', () => {
      return request(app.getHttpServer())
        .put('/api/users/theme')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          theme: 'light',
        })
        .expect(204);
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
    it('debería cambiar el idioma a inglés', () => {
      return request(app.getHttpServer())
        .put('/api/users/language')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          language: 'en',
        })
        .expect(204);
    });

    it('debería cambiar el idioma a español', () => {
      return request(app.getHttpServer())
        .put('/api/users/language')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          language: 'es',
        })
        .expect(204);
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
});
