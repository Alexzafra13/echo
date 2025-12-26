import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DrizzleService } from '../../src/infrastructure/database/drizzle.service';
import {
  createTestApp,
  createUserAndLogin,
  cleanUserTables,
  cleanContentTables,
  createTestArtist,
  createTestAlbum,
  createTestTrack,
} from './helpers/test-setup';
import * as schema from '../../src/infrastructure/database/schema';

/**
 * Streaming E2E Tests
 *
 * Prueba los endpoints de streaming de audio:
 * - POST /api/stream-token/generate - Generar token de streaming
 * - GET /api/stream-token - Obtener token actual
 * - DELETE /api/stream-token - Revocar token
 * - HEAD /api/tracks/:id/stream - Metadata del stream
 * - GET /api/tracks/:id/stream - Stream de audio (con/sin Range)
 * - GET /api/tracks/:id/download - Descarga de audio
 *
 * Nota: Los tests de streaming real requieren archivos de audio.
 * Estos tests cubren autenticación, validación y manejo de errores.
 */
describe('Streaming E2E', () => {
  let app: INestApplication;
  let drizzle: DrizzleService;
  let accessToken: string;
  let streamToken: string;
  let userId: string;
  let trackId: string;
  let nonExistentTrackId: string;

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    drizzle = testApp.drizzle;
    nonExistentTrackId = '00000000-0000-0000-0000-000000000000';
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Limpiar tablas
    await drizzle.db.delete(schema.streamTokens);
    await cleanContentTables(drizzle);
    await cleanUserTables(drizzle);

    // Crear usuario
    const userResult = await createUserAndLogin(drizzle, app, {
      username: 'streaming_user',
      password: 'Test123!',
    });
    accessToken = userResult.accessToken;
    userId = userResult.user.id;

    // Crear contenido de prueba
    const artist = await createTestArtist(drizzle, { name: 'Streaming Artist' });
    const album = await createTestAlbum(drizzle, {
      name: 'Streaming Album',
      artistId: artist.id,
    });

    // Track con path ficticio (no hay archivo real)
    const track = await createTestTrack(drizzle, {
      title: 'Streaming Track',
      path: '/music/test-stream.mp3',
      albumId: album.id,
      artistId: artist.id,
      duration: 180,
    });
    trackId = track.id;

    // Generar stream token
    const tokenRes = await request(app.getHttpServer())
      .post('/api/stream-token/generate')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    streamToken = tokenRes.body.token;
  });

  describe('Stream Token Management', () => {
    describe('POST /api/stream-token/generate', () => {
      it('debería generar un token de streaming', async () => {
        // Limpiar tokens existentes
        await drizzle.db.delete(schema.streamTokens);

        return request(app.getHttpServer())
          .post('/api/stream-token/generate')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body.token).toBeDefined();
            expect(typeof res.body.token).toBe('string');
            expect(res.body.token.length).toBeGreaterThan(20);
            expect(res.body.expiresAt).toBeDefined();
          });
      });

      it('debería retornar el mismo token si ya existe uno válido', async () => {
        const firstToken = streamToken;

        const res = await request(app.getHttpServer())
          .post('/api/stream-token/generate')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(res.body.token).toBe(firstToken);
      });

      it('debería rechazar sin autenticación', () => {
        return request(app.getHttpServer())
          .post('/api/stream-token/generate')
          .expect(401);
      });
    });

    describe('GET /api/stream-token', () => {
      it('debería obtener el token actual', () => {
        return request(app.getHttpServer())
          .get('/api/stream-token')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body.token).toBe(streamToken);
            expect(res.body.expiresAt).toBeDefined();
          });
      });

      it('debería generar token si no existe', async () => {
        // Limpiar tokens
        await drizzle.db.delete(schema.streamTokens);

        return request(app.getHttpServer())
          .get('/api/stream-token')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body.token).toBeDefined();
          });
      });

      it('debería rechazar sin autenticación', () => {
        return request(app.getHttpServer())
          .get('/api/stream-token')
          .expect(401);
      });
    });

    describe('DELETE /api/stream-token', () => {
      it('debería revocar el token', async () => {
        await request(app.getHttpServer())
          .delete('/api/stream-token')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(204);

        // Verificar que el token antiguo ya no funciona
        return request(app.getHttpServer())
          .head(`/api/tracks/${trackId}/stream?token=${streamToken}`)
          .expect(401);
      });

      it('debería rechazar sin autenticación', () => {
        return request(app.getHttpServer())
          .delete('/api/stream-token')
          .expect(401);
      });
    });
  });

  describe('Stream Authentication', () => {
    describe('HEAD /api/tracks/:id/stream', () => {
      it('debería rechazar sin token', () => {
        return request(app.getHttpServer())
          .head(`/api/tracks/${trackId}/stream`)
          .expect(401);
      });

      it('debería rechazar con token inválido', () => {
        return request(app.getHttpServer())
          .head(`/api/tracks/${trackId}/stream?token=invalid-token`)
          .expect(401);
      });

      it('debería rechazar con token expirado', async () => {
        // Crear token expirado directamente en BD
        await drizzle.db.delete(schema.streamTokens);
        await drizzle.db.insert(schema.streamTokens).values({
          userId: userId,
          token: 'expired-token-123',
          expiresAt: new Date(Date.now() - 1000), // Expirado hace 1 segundo
        });

        return request(app.getHttpServer())
          .head(`/api/tracks/${trackId}/stream?token=expired-token-123`)
          .expect(401);
      });

      it('debería retornar 404 para track inexistente con token válido', () => {
        return request(app.getHttpServer())
          .head(`/api/tracks/${nonExistentTrackId}/stream?token=${streamToken}`)
          .expect(404);
      });
    });

    describe('GET /api/tracks/:id/stream', () => {
      it('debería rechazar sin token', () => {
        return request(app.getHttpServer())
          .get(`/api/tracks/${trackId}/stream`)
          .expect(401);
      });

      it('debería rechazar con token inválido', () => {
        return request(app.getHttpServer())
          .get(`/api/tracks/${trackId}/stream?token=invalid`)
          .expect(401);
      });

      it('debería retornar 404 para track inexistente', () => {
        return request(app.getHttpServer())
          .get(`/api/tracks/${nonExistentTrackId}/stream?token=${streamToken}`)
          .expect(404);
      });
    });

    describe('GET /api/tracks/:id/download', () => {
      it('debería rechazar sin token', () => {
        return request(app.getHttpServer())
          .get(`/api/tracks/${trackId}/download`)
          .expect(401);
      });

      it('debería rechazar con token inválido', () => {
        return request(app.getHttpServer())
          .get(`/api/tracks/${trackId}/download?token=invalid`)
          .expect(401);
      });

      it('debería retornar 404 para track inexistente', () => {
        return request(app.getHttpServer())
          .get(`/api/tracks/${nonExistentTrackId}/download?token=${streamToken}`)
          .expect(404);
      });
    });
  });

  describe('Stream Token Isolation', () => {
    let user2Token: string;
    let user2StreamToken: string;

    beforeEach(async () => {
      // Crear segundo usuario
      const user2Result = await createUserAndLogin(drizzle, app, {
        username: 'streaming_user2',
        password: 'Test123!',
      });
      user2Token = user2Result.accessToken;

      // Generar stream token para user2
      const tokenRes = await request(app.getHttpServer())
        .post('/api/stream-token/generate')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      user2StreamToken = tokenRes.body.token;
    });

    it('debería mantener tokens separados por usuario', () => {
      expect(streamToken).not.toBe(user2StreamToken);
    });

    it('usuarios deberían poder acceder con sus propios tokens', async () => {
      // User 1 con su token
      await request(app.getHttpServer())
        .head(`/api/tracks/${trackId}/stream?token=${streamToken}`)
        .expect((res) => {
          // 404 porque no hay archivo, pero autenticación pasó
          expect([200, 404, 500]).toContain(res.status);
        });

      // User 2 con su token
      await request(app.getHttpServer())
        .head(`/api/tracks/${trackId}/stream?token=${user2StreamToken}`)
        .expect((res) => {
          expect([200, 404, 500]).toContain(res.status);
        });
    });
  });

  describe('Stream Token Regeneration', () => {
    it('debería poder regenerar token después de revocar', async () => {
      const originalToken = streamToken;

      // Revocar
      await request(app.getHttpServer())
        .delete('/api/stream-token')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      // Regenerar
      const res = await request(app.getHttpServer())
        .post('/api/stream-token/generate')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.token).toBeDefined();
      expect(res.body.token).not.toBe(originalToken);
    });
  });

  describe('Flujo completo de streaming', () => {
    it('debería completar flujo de token y acceso', async () => {
      // 1. Revocar token existente
      await request(app.getHttpServer())
        .delete('/api/stream-token')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      // 2. Verificar que el token antiguo no funciona
      await request(app.getHttpServer())
        .head(`/api/tracks/${trackId}/stream?token=${streamToken}`)
        .expect(401);

      // 3. Generar nuevo token
      const genRes = await request(app.getHttpServer())
        .post('/api/stream-token/generate')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const newToken = genRes.body.token;
      expect(newToken).toBeDefined();

      // 4. Obtener token (debería devolver el mismo)
      const getRes = await request(app.getHttpServer())
        .get('/api/stream-token')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(getRes.body.token).toBe(newToken);

      // 5. Verificar que el nuevo token funciona
      // (404 porque no hay archivo, pero autenticación pasa)
      await request(app.getHttpServer())
        .head(`/api/tracks/${trackId}/stream?token=${newToken}`)
        .expect((res) => {
          // Esperamos 404 (archivo no existe) o 500 (error de lectura)
          // pero NO 401 (autenticación fallida)
          expect(res.status).not.toBe(401);
        });
    });
  });
});
