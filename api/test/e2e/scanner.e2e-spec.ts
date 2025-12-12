import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DrizzleService } from '../../src/infrastructure/database/drizzle.service';
import { BullmqService } from '../../src/infrastructure/queue/bullmq.service';
import {
  createTestApp,
  createAdminAndLogin,
  createUserAndLogin,
  cleanUserTables,
  cleanScannerTables,
  cleanQueues,
} from './helpers/test-setup';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Scanner E2E Tests
 *
 * Prueba los endpoints del scanner de música:
 * - POST /api/scanner/start - Iniciar escaneo (solo admin)
 * - GET /api/scanner/:id - Obtener estado del escaneo (solo admin)
 * - GET /api/scanner - Historial de escaneos (solo admin)
 *
 * NOTA: Estos endpoints requieren rol de administrador.
 */
describe('Scanner E2E', () => {
  let app: INestApplication;
  let drizzle: DrizzleService;
  let bullmq: BullmqService;
  let adminToken: string;
  let userToken: string;
  let testMusicDir: string;

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    drizzle = testApp.drizzle;
    bullmq = testApp.bullmq;

    // Crear directorio temporal para archivos de prueba
    testMusicDir = path.join(process.cwd(), 'test-music-temp');
    if (!fs.existsSync(testMusicDir)) {
      fs.mkdirSync(testMusicDir, { recursive: true });
    }
  });

  afterAll(async () => {
    // Limpiar directorio temporal
    if (fs.existsSync(testMusicDir)) {
      fs.rmSync(testMusicDir, { recursive: true, force: true });
    }

    await app.close();
  });

  beforeEach(async () => {
    // Limpiar colas de BullMQ para evitar jobs huérfanos
    await cleanQueues(bullmq);
    await cleanScannerTables(drizzle);
    await cleanUserTables(drizzle);

    // Crear admin de prueba
    const adminResult = await createAdminAndLogin(drizzle, app, {
      username: 'admin_scanner',
      password: 'Admin123!',
    });
    adminToken = adminResult.accessToken;

    // Crear usuario normal
    const userResult = await createUserAndLogin(drizzle, app, {
      username: 'user_scanner',
      password: 'User123!',
    });
    userToken = userResult.accessToken;
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
          expect(res.body.id).toBeDefined();
          expect(res.body.status).toBeDefined();
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

    it('debería aceptar escaneo sin path (usa directorio por defecto)', () => {
      return request(app.getHttpServer())
        .post('/api/scanner/start')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          recursive: true,
          pruneDeleted: false,
        })
        .expect(202)
        .expect((res) => {
          expect(res.body.id).toBeDefined();
          expect(res.body.status).toBeDefined();
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
          expect(res.body.id).toBeDefined();
        });
    });
  });

  describe('GET /api/scanner', () => {
    it('debería obtener el historial de escaneos con admin', () => {
      return request(app.getHttpServer())
        .get('/api/scanner')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.scans).toBeDefined();
          expect(Array.isArray(res.body.scans)).toBe(true);
          expect(res.body.total).toBeDefined();
        });
    });

    it('debería rechazar sin autenticación', () => {
      return request(app.getHttpServer())
        .get('/api/scanner')
        .expect(401);
    });

    it('debería rechazar con usuario no-admin', () => {
      return request(app.getHttpServer())
        .get('/api/scanner')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('debería respetar parámetros de paginación', () => {
      return request(app.getHttpServer())
        .get('/api/scanner?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.page).toBe(1);
          expect(res.body.limit).toBe(5);
        });
    });
  });

  describe('GET /api/scanner/:id', () => {
    it('debería rechazar sin autenticación', () => {
      return request(app.getHttpServer())
        .get('/api/scanner/00000000-0000-0000-0000-000000000000')
        .expect(401);
    });

    it('debería rechazar con usuario no-admin', () => {
      return request(app.getHttpServer())
        .get('/api/scanner/00000000-0000-0000-0000-000000000000')
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

    it('debería obtener el estado de un escaneo existente', async () => {
      // Primero iniciar un escaneo
      const startRes = await request(app.getHttpServer())
        .post('/api/scanner/start')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          path: testMusicDir,
        })
        .expect(202);

      const scanId = startRes.body.id;

      // Luego obtener su estado
      return request(app.getHttpServer())
        .get(`/api/scanner/${scanId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(scanId);
          expect(res.body.status).toBeDefined();
        });
    });
  });

  describe('Flujo completo del scanner', () => {
    it('debería completar el flujo start → status → history', async () => {
      // 1. Iniciar escaneo
      const startRes = await request(app.getHttpServer())
        .post('/api/scanner/start')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          path: testMusicDir,
          recursive: true,
        })
        .expect(202);

      const scanId = startRes.body.id;
      expect(scanId).toBeDefined();

      // 2. Obtener estado del escaneo
      const statusRes = await request(app.getHttpServer())
        .get(`/api/scanner/${scanId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(statusRes.body.id).toBe(scanId);
      // Note: path is not stored/returned in status - only used as request param

      // 3. Obtener historial (debería incluir el escaneo)
      const historyRes = await request(app.getHttpServer())
        .get('/api/scanner')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(historyRes.body.scans.length).toBeGreaterThan(0);
      expect(historyRes.body.scans.some((s: any) => s.id === scanId)).toBe(true);
    });
  });
});
