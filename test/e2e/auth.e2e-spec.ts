import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/infrastructure/persistence/prisma.service'; 


describe('Auth E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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

  afterEach(async () => {
    // Limpiar BD después de cada test
    await prisma.user.deleteMany();
  });

  describe('POST /api/auth/register', () => {
    it('debería registrar un usuario válido', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          username: 'juan',
          email: 'juan@test.com',
          password: 'Pass123!',
          name: 'Juan García',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.user).toBeDefined();
          expect(res.body.user.username).toBe('juan');
          expect(res.body.user.email).toBe('juan@test.com');
          expect(res.body.user.name).toBe('Juan García');
          expect(res.body.accessToken).toBeDefined();
          expect(res.body.refreshToken).toBeDefined();
        });
    });

    it('debería registrar usuario sin email', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          username: 'maria',
          password: 'Pass123!',
          name: 'María',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.user.username).toBe('maria');
          expect(res.body.user.email).toBeUndefined();
        });
    });

    it('debería rechazar si username ya existe', async () => {
      // Registrar primer usuario
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          username: 'juan',
          email: 'juan@test.com',
          password: 'Pass123!',
        });

      // Intentar registrar con el mismo username
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          username: 'juan',
          email: 'otro@test.com',
          password: 'Pass123!',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Username already exists');
        });
    });

    it('debería rechazar si email ya está registrado', async () => {
      // Registrar primer usuario
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          username: 'juan',
          email: 'juan@test.com',
          password: 'Pass123!',
        });

      // Intentar registrar con el mismo email
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          username: 'maria',
          email: 'juan@test.com',
          password: 'Pass123!',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Email already registered');
        });
    });

    it('debería rechazar si email es inválido', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          username: 'juan',
          email: 'email_invalido',
          password: 'Pass123!',
        })
        .expect(400);
    });

    it('debería rechazar si username es muy corto', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          username: 'ab',
          email: 'juan@test.com',
          password: 'Pass123!',
        })
        .expect(400);
    });

    it('debería rechazar si password es débil', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          username: 'juan',
          email: 'juan@test.com',
          password: 'weak',
        })
        .expect(400);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Registrar usuario antes de cada test
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          username: 'juan',
          email: 'juan@test.com',
          password: 'Pass123!',
          name: 'Juan',
        });
    });

    it('debería loguear un usuario válido', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          username: 'juan',
          password: 'Pass123!',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.user).toBeDefined();
          expect(res.body.user.username).toBe('juan');
          expect(res.body.user.email).toBe('juan@test.com');
          expect(res.body.accessToken).toBeDefined();
          expect(res.body.refreshToken).toBeDefined();
        });
    });

    it('debería rechazar si username no existe', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          username: 'noexiste',
          password: 'Pass123!',
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
          username: 'juan',
          password: 'WrongPassword!',
        })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toContain('Invalid credentials');
        });
    });

    it('debería rechazar si username está vacío', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          username: '',
          password: 'Pass123!',
        })
        .expect(400);
    });

    it('debería rechazar si password está vacío', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          username: 'juan',
          password: '',
        })
        .expect(400);
    });
  });

  describe('POST /api/auth/refresh', () => {
    let refreshToken: string;

    beforeEach(async () => {
      // Registrar y obtener refresh token
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          username: 'juan',
          email: 'juan@test.com',
          password: 'Pass123!',
        });

      refreshToken = response.body.refreshToken;
    });

    it('debería generar nuevos tokens con refresh token válido', () => {
      return request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({
          refreshToken,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.accessToken).toBeDefined();
          expect(res.body.refreshToken).toBeDefined();
          expect(res.body.accessToken).not.toBe(refreshToken);
        });
    });

    it('debería rechazar si refresh token es inválido', () => {
      return request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'invalid_token_123',
        })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toContain('Invalid refresh token');
        });
    });

    it('debería rechazar si refresh token está vacío', () => {
      return request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({
          refreshToken: '',
        })
        .expect(400);
    });
  });

  describe('GET /api/auth/me', () => {
    let accessToken: string;

    beforeEach(async () => {
      // Registrar y obtener access token
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          username: 'juan',
          email: 'juan@test.com',
          password: 'Pass123!',
          name: 'Juan',
        });

      accessToken = response.body.accessToken;
    });

    it('debería retornar datos del usuario actual con token válido', () => {
      return request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.user).toBeDefined();
          expect(res.body.user.username).toBe('juan');
          expect(res.body.user.email).toBe('juan@test.com');
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
});