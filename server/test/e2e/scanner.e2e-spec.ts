import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/infrastructure/persistence/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

describe('Scanner E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let userToken: string;
  let testMusicDir: string;

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

    // Crear directorio temporal para archivos de prueba
    testMusicDir = path.join(process.cwd(), 'test-music-temp');
    if (!fs.existsSync(testMusicDir)) {
      fs.mkdirSync(testMusicDir, { recursive: true });
    }

    // Crear usuario admin de prueba
    const adminRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        username: 'admin_scanner',
        email: 'admin_scanner@test.com',
        password: 'Admin123!',
        name: 'Admin Scanner',
      });

    // Hacer admin al usuario
    await prisma.user.update({
      where: { id: adminRes.body.user.id },
      data: { isAdmin: true },
    });

    // Login como admin para obtener token
    const adminLoginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        username: 'admin_scanner',
        password: 'Admin123!',
      });

    adminToken = adminLoginRes.body.accessToken;

    // Crear usuario normal para tests de autorización
    const userRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        username: 'user_scanner',
        email: 'user_scanner@test.com',
        password: 'User123!',
        name: 'User Scanner',
      });

    userToken = userRes.body.accessToken;
  });

  afterAll(async () => {
    // Limpiar directorio temporal
    if (fs.existsSync(testMusicDir)) {
      fs.rmSync(testMusicDir, { recursive: true, force: true });
    }

    // Limpiar BD
    await prisma.scan.deleteMany();
    await prisma.user.deleteMany();

    await app.close();
  });

  afterEach(async () => {
    // Limpiar escaneos después de cada test
    await prisma.scan.deleteMany();
  });

  describe('POST /api/scanner/start', () => {
    it('debería iniciar un escaneo con usuario admin', () => {
      return request(app.getHttpServer())
        .post('/api/scanner/start')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          path: testMusicDir,
          recursive: true,
          pruneDeleted: false,
        })
        .expect(202)
        .expect((res) => {
          expect(res.body.scanId).toBeDefined();
          expect(res.body.status).toBe('pending');
          expect(res.body.message).toContain('Escaneo iniciado');
        });
    });

    it('debería rechazar escaneo sin autenticación', () => {
      return request(app.getHttpServer())
        .post('/api/scanner/start')
        .send({
          path: testMusicDir,
          recursive: true,
          pruneDeleted: false,
        })
        .expect(401);
    });

    it('debería rechazar escaneo con usuario no-admin', () => {
      return request(app.getHttpServer())
        .post('/api/scanner/start')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          path: testMusicDir,
          recursive: true,
          pruneDeleted: false,
        })
        .expect(403);
    });

    it('debería validar path requerido', () => {
      return request(app.getHttpServer())
        .post('/api/scanner/start')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          recursive: true,
          pruneDeleted: false,
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toBeDefined();
        });
    });

    it('debería usar valores por defecto para campos opcionales', () => {
      return request(app.getHttpServer())
        .post('/api/scanner/start')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          path: testMusicDir,
        })
        .expect(202)
        .expect((res) => {
          expect(res.body.scanId).toBeDefined();
          expect(res.body.status).toBe('pending');
        });
    });

    it('debería rechazar si ya hay un escaneo en progreso', async () => {
      // Crear un escaneo en progreso
      await prisma.scan.create({
        data: {
          path: testMusicDir,
          status: 'in_progress',
          filesProcessed: 0,
          filesTotal: 0,
          tracksAdded: 0,
          tracksUpdated: 0,
          tracksDeleted: 0,
        },
      });

      return request(app.getHttpServer())
        .post('/api/scanner/start')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          path: testMusicDir,
          recursive: true,
          pruneDeleted: false,
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('escaneo en progreso');
        });
    });
  });

  describe('GET /api/scanner/:id', () => {
    it('debería obtener el estado de un escaneo existente', async () => {
      // Crear un escaneo
      const scan = await prisma.scan.create({
        data: {
          path: testMusicDir,
          status: 'completed',
          filesProcessed: 10,
          filesTotal: 10,
          tracksAdded: 5,
          tracksUpdated: 3,
          tracksDeleted: 2,
        },
      });

      return request(app.getHttpServer())
        .get(`/api/scanner/${scan.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(scan.id);
          expect(res.body.status).toBe('completed');
          expect(res.body.filesProcessed).toBe(10);
          expect(res.body.filesTotal).toBe(10);
          expect(res.body.tracksAdded).toBe(5);
          expect(res.body.tracksUpdated).toBe(3);
          expect(res.body.tracksDeleted).toBe(2);
        });
    });

    it('debería rechazar sin autenticación', async () => {
      const scan = await prisma.scan.create({
        data: {
          path: testMusicDir,
          status: 'completed',
          filesProcessed: 0,
          filesTotal: 0,
          tracksAdded: 0,
          tracksUpdated: 0,
          tracksDeleted: 0,
        },
      });

      return request(app.getHttpServer())
        .get(`/api/scanner/${scan.id}`)
        .expect(401);
    });

    it('debería rechazar con usuario no-admin', async () => {
      const scan = await prisma.scan.create({
        data: {
          path: testMusicDir,
          status: 'completed',
          filesProcessed: 0,
          filesTotal: 0,
          tracksAdded: 0,
          tracksUpdated: 0,
          tracksDeleted: 0,
        },
      });

      return request(app.getHttpServer())
        .get(`/api/scanner/${scan.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('debería retornar 404 para escaneo inexistente', () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      return request(app.getHttpServer())
        .get(`/api/scanner/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('GET /api/scanner', () => {
    it('debería obtener el historial de escaneos vacío', () => {
      return request(app.getHttpServer())
        .get('/api/scanner')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.scans).toEqual([]);
          expect(res.body.total).toBe(0);
          expect(res.body.page).toBe(1);
          expect(res.body.limit).toBe(10);
        });
    });

    it('debería obtener el historial con múltiples escaneos', async () => {
      // Crear varios escaneos
      await prisma.scan.createMany({
        data: [
          {
            path: testMusicDir,
            status: 'completed',
            filesProcessed: 10,
            filesTotal: 10,
            tracksAdded: 5,
            tracksUpdated: 3,
            tracksDeleted: 2,
          },
          {
            path: testMusicDir,
            status: 'failed',
            filesProcessed: 5,
            filesTotal: 10,
            tracksAdded: 0,
            tracksUpdated: 0,
            tracksDeleted: 0,
            error: 'Test error',
          },
          {
            path: testMusicDir,
            status: 'in_progress',
            filesProcessed: 3,
            filesTotal: 10,
            tracksAdded: 2,
            tracksUpdated: 0,
            tracksDeleted: 0,
          },
        ],
      });

      return request(app.getHttpServer())
        .get('/api/scanner')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.scans).toHaveLength(3);
          expect(res.body.total).toBe(3);
          expect(res.body.page).toBe(1);
          expect(res.body.limit).toBe(10);
        });
    });

    it('debería respetar paginación', async () => {
      // Crear 15 escaneos
      const scansData = Array.from({ length: 15 }, () => ({
        path: testMusicDir,
        status: 'completed',
        filesProcessed: 10,
        filesTotal: 10,
        tracksAdded: 5,
        tracksUpdated: 3,
        tracksDeleted: 2,
      }));

      await prisma.scan.createMany({
        data: scansData,
      });

      // Primera página (limit 10)
      const page1 = await request(app.getHttpServer())
        .get('/api/scanner?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(page1.body.scans).toHaveLength(10);
      expect(page1.body.total).toBe(15);
      expect(page1.body.page).toBe(1);

      // Segunda página (limit 10)
      const page2 = await request(app.getHttpServer())
        .get('/api/scanner?page=2&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(page2.body.scans).toHaveLength(5);
      expect(page2.body.total).toBe(15);
      expect(page2.body.page).toBe(2);
    });

    it('debería rechazar sin autenticación', () => {
      return request(app.getHttpServer()).get('/api/scanner').expect(401);
    });

    it('debería rechazar con usuario no-admin', () => {
      return request(app.getHttpServer())
        .get('/api/scanner')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('debería validar parámetros de paginación', () => {
      return request(app.getHttpServer())
        .get('/api/scanner?page=-1&limit=0')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });
});
