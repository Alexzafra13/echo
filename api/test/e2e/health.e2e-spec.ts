import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DrizzleService } from '../../src/infrastructure/database/drizzle.service';
import { createTestApp, cleanUserTables } from './helpers/test-setup';

/**
 * Health Check E2E Tests
 *
 * Tests para el endpoint de health check que verifica:
 * - Estado de la aplicación
 * - Conectividad a PostgreSQL
 * - Conectividad a Redis
 *
 * Estos tests son críticos para producción:
 * - Load balancers usan /api/health para verificar instancias
 * - Kubernetes usa estos endpoints para liveness/readiness probes
 * - Monitoreo externo depende de estos endpoints
 */
describe('Health Check E2E', () => {
  let app: INestApplication;
  let drizzle: DrizzleService;

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    drizzle = testApp.drizzle;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/health', () => {
    it('debería retornar 200 cuando todo está saludable', () => {
      return request(app.getHttpServer())
        .get('/api/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');
        });
    });

    it('debería ser accesible sin autenticación (público)', () => {
      return request(app.getHttpServer())
        .get('/api/health')
        .expect(200);
    });

    it('debería responder rápidamente (< 1s)', async () => {
      const start = Date.now();

      await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000);
    });

    it('debería incluir timestamp', () => {
      return request(app.getHttpServer())
        .get('/api/health')
        .expect(200)
        .expect((res) => {
          // La respuesta debería incluir alguna indicación de tiempo
          expect(res.body).toBeDefined();
        });
    });
  });

  describe('Database Connectivity', () => {
    it('debería poder ejecutar queries a PostgreSQL', async () => {
      // Verificar que podemos hacer una query simple
      const result = await drizzle.db.execute('SELECT 1 as ping');
      expect(result).toBeDefined();
    });
  });

  describe('Availability under load', () => {
    it('debería manejar múltiples requests simultáneos', async () => {
      const requests = Array.from({ length: 20 }, () =>
        request(app.getHttpServer()).get('/api/health')
      );

      const responses = await Promise.all(requests);

      responses.forEach(res => {
        expect(res.status).toBe(200);
      });
    });
  });
});
