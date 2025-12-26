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
 * Play Tracking E2E Tests
 *
 * Prueba los endpoints de seguimiento de reproducción:
 * - POST /api/play-tracking/play - Registrar evento de reproducción
 * - POST /api/play-tracking/skip - Registrar evento de skip
 * - GET /api/play-tracking/history - Historial de reproducciones
 * - GET /api/play-tracking/top-tracks - Tracks más escuchados
 * - GET /api/play-tracking/recently-played - Tracks recientes únicos
 * - GET /api/play-tracking/summary - Resumen de estadísticas
 * - PUT /api/play-tracking/playback-state - Estado de reproducción actual
 */
describe('Play Tracking E2E', () => {
  let app: INestApplication;
  let drizzle: DrizzleService;
  let accessToken: string;
  let userId: string;
  let trackId: string;
  let track2Id: string;
  let track3Id: string;
  let albumId: string;

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    drizzle = testApp.drizzle;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Limpiar tablas de play tracking primero
    await drizzle.db.delete(schema.playHistory);
    await drizzle.db.delete(schema.userPlayStats);

    // Limpiar BD
    await cleanContentTables(drizzle);
    await cleanUserTables(drizzle);

    // Crear usuario
    const userResult = await createUserAndLogin(drizzle, app, {
      username: 'play_tracking_user',
      password: 'Test123!',
    });
    accessToken = userResult.accessToken;
    userId = userResult.user.id;

    // Crear contenido de prueba
    const artist = await createTestArtist(drizzle, { name: 'Test Artist' });
    const album = await createTestAlbum(drizzle, {
      name: 'Test Album',
      artistId: artist.id,
    });
    albumId = album.id;

    const track1 = await createTestTrack(drizzle, {
      title: 'Track One',
      path: '/music/track1.mp3',
      albumId: album.id,
      artistId: artist.id,
      duration: 200,
    });
    trackId = track1.id;

    const track2 = await createTestTrack(drizzle, {
      title: 'Track Two',
      path: '/music/track2.mp3',
      albumId: album.id,
      artistId: artist.id,
      duration: 180,
    });
    track2Id = track2.id;

    const track3 = await createTestTrack(drizzle, {
      title: 'Track Three',
      path: '/music/track3.mp3',
      albumId: album.id,
      artistId: artist.id,
      duration: 220,
    });
    track3Id = track3.id;
  });

  describe('POST /api/play-tracking/play', () => {
    it('debería registrar un evento de reproducción', () => {
      return request(app.getHttpServer())
        .post('/api/play-tracking/play')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          trackId: trackId,
          playContext: 'direct',
          completionRate: 1.0,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBeDefined();
          expect(res.body.trackId).toBe(trackId);
          expect(res.body.userId).toBe(userId);
          expect(res.body.playContext).toBe('direct');
          expect(res.body.completionRate).toBe(1.0);
          expect(res.body.skipped).toBe(false);
          expect(res.body.playedAt).toBeDefined();
        });
    });

    it('debería registrar reproducción con contexto de álbum', () => {
      return request(app.getHttpServer())
        .post('/api/play-tracking/play')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          trackId: trackId,
          playContext: 'album',
          sourceId: albumId,
          sourceType: 'album',
          completionRate: 0.85,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.playContext).toBe('album');
          expect(res.body.sourceId).toBe(albumId);
          expect(res.body.sourceType).toBe('album');
        });
    });

    it('debería registrar reproducción con contexto de playlist', () => {
      return request(app.getHttpServer())
        .post('/api/play-tracking/play')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          trackId: trackId,
          playContext: 'playlist',
          completionRate: 0.5,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.playContext).toBe('playlist');
        });
    });

    it('debería rechazar sin autenticación', () => {
      return request(app.getHttpServer())
        .post('/api/play-tracking/play')
        .send({
          trackId: trackId,
          playContext: 'direct',
        })
        .expect(401);
    });

    it('debería validar campos requeridos', () => {
      return request(app.getHttpServer())
        .post('/api/play-tracking/play')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          playContext: 'direct',
        })
        .expect(400);
    });

    it('debería validar playContext válido', () => {
      return request(app.getHttpServer())
        .post('/api/play-tracking/play')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          trackId: trackId,
          playContext: 'invalid_context',
        })
        .expect(400);
    });

    it('debería validar completionRate entre 0 y 1', () => {
      return request(app.getHttpServer())
        .post('/api/play-tracking/play')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          trackId: trackId,
          playContext: 'direct',
          completionRate: 1.5,
        })
        .expect(400);
    });
  });

  describe('POST /api/play-tracking/skip', () => {
    it('debería registrar un evento de skip', () => {
      return request(app.getHttpServer())
        .post('/api/play-tracking/skip')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          trackId: trackId,
          completionRate: 0.3,
          playContext: 'direct',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.trackId).toBe(trackId);
          expect(res.body.skipped).toBe(true);
          expect(res.body.completionRate).toBe(0.3);
        });
    });

    it('debería rechazar sin autenticación', () => {
      return request(app.getHttpServer())
        .post('/api/play-tracking/skip')
        .send({
          trackId: trackId,
          completionRate: 0.3,
          playContext: 'direct',
        })
        .expect(401);
    });

    it('debería validar campos requeridos', () => {
      return request(app.getHttpServer())
        .post('/api/play-tracking/skip')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          trackId: trackId,
        })
        .expect(400);
    });
  });

  describe('GET /api/play-tracking/history', () => {
    beforeEach(async () => {
      // Registrar algunas reproducciones
      await request(app.getHttpServer())
        .post('/api/play-tracking/play')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ trackId: trackId, playContext: 'direct', completionRate: 1.0 });

      await request(app.getHttpServer())
        .post('/api/play-tracking/play')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ trackId: track2Id, playContext: 'album', completionRate: 0.8 });

      await request(app.getHttpServer())
        .post('/api/play-tracking/skip')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ trackId: track3Id, completionRate: 0.2, playContext: 'playlist' });
    });

    it('debería obtener historial de reproducciones', () => {
      return request(app.getHttpServer())
        .get('/api/play-tracking/history')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(3);
          // El más reciente primero
          expect(res.body[0].trackId).toBe(track3Id);
          expect(res.body[0].skipped).toBe(true);
        });
    });

    it('debería aplicar límite', () => {
      return request(app.getHttpServer())
        .get('/api/play-tracking/history?limit=2')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.length).toBe(2);
        });
    });

    it('debería aplicar offset', () => {
      return request(app.getHttpServer())
        .get('/api/play-tracking/history?offset=1&limit=2')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.length).toBe(2);
          expect(res.body[0].trackId).toBe(track2Id);
        });
    });

    it('debería rechazar sin autenticación', () => {
      return request(app.getHttpServer())
        .get('/api/play-tracking/history')
        .expect(401);
    });
  });

  describe('GET /api/play-tracking/top-tracks', () => {
    beforeEach(async () => {
      // Reproducir track1 3 veces
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post('/api/play-tracking/play')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ trackId: trackId, playContext: 'direct', completionRate: 1.0 });
      }
      // Reproducir track2 1 vez
      await request(app.getHttpServer())
        .post('/api/play-tracking/play')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ trackId: track2Id, playContext: 'direct', completionRate: 1.0 });
    });

    it('debería obtener top tracks ordenados por reproducciones', () => {
      return request(app.getHttpServer())
        .get('/api/play-tracking/top-tracks')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
          // El track más reproducido primero
          expect(res.body[0].trackId).toBe(trackId);
        });
    });

    it('debería aplicar límite', () => {
      return request(app.getHttpServer())
        .get('/api/play-tracking/top-tracks?limit=1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.length).toBe(1);
        });
    });

    it('debería filtrar por días', () => {
      return request(app.getHttpServer())
        .get('/api/play-tracking/top-tracks?days=7')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('debería rechazar sin autenticación', () => {
      return request(app.getHttpServer())
        .get('/api/play-tracking/top-tracks')
        .expect(401);
    });
  });

  describe('GET /api/play-tracking/recently-played', () => {
    beforeEach(async () => {
      // Reproducir varios tracks
      await request(app.getHttpServer())
        .post('/api/play-tracking/play')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ trackId: trackId, playContext: 'direct', completionRate: 1.0 });

      await request(app.getHttpServer())
        .post('/api/play-tracking/play')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ trackId: track2Id, playContext: 'direct', completionRate: 1.0 });

      // Reproducir track1 de nuevo
      await request(app.getHttpServer())
        .post('/api/play-tracking/play')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ trackId: trackId, playContext: 'direct', completionRate: 1.0 });
    });

    it('debería obtener tracks recientes únicos', () => {
      return request(app.getHttpServer())
        .get('/api/play-tracking/recently-played')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          // Debería incluir solo tracks únicos
          const uniqueIds = [...new Set(res.body)];
          expect(res.body.length).toBe(uniqueIds.length);
        });
    });

    it('debería aplicar límite', () => {
      return request(app.getHttpServer())
        .get('/api/play-tracking/recently-played?limit=1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.length).toBeLessThanOrEqual(1);
        });
    });

    it('debería rechazar sin autenticación', () => {
      return request(app.getHttpServer())
        .get('/api/play-tracking/recently-played')
        .expect(401);
    });
  });

  describe('GET /api/play-tracking/summary', () => {
    beforeEach(async () => {
      // Crear datos de ejemplo
      await request(app.getHttpServer())
        .post('/api/play-tracking/play')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ trackId: trackId, playContext: 'direct', completionRate: 1.0 });

      await request(app.getHttpServer())
        .post('/api/play-tracking/play')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ trackId: track2Id, playContext: 'album', completionRate: 0.8 });

      await request(app.getHttpServer())
        .post('/api/play-tracking/skip')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ trackId: track3Id, completionRate: 0.2, playContext: 'direct' });
    });

    it('debería obtener resumen de estadísticas', () => {
      return request(app.getHttpServer())
        .get('/api/play-tracking/summary')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('totalPlays');
          expect(res.body).toHaveProperty('totalSkips');
          expect(res.body).toHaveProperty('avgCompletionRate');
          expect(res.body).toHaveProperty('topContext');
          expect(res.body).toHaveProperty('playsByContext');
          expect(res.body).toHaveProperty('recentPlays');
          expect(typeof res.body.totalPlays).toBe('number');
          expect(typeof res.body.totalSkips).toBe('number');
        });
    });

    it('debería filtrar por días', () => {
      return request(app.getHttpServer())
        .get('/api/play-tracking/summary?days=7')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('totalPlays');
        });
    });

    it('debería rechazar sin autenticación', () => {
      return request(app.getHttpServer())
        .get('/api/play-tracking/summary')
        .expect(401);
    });
  });

  describe('PUT /api/play-tracking/playback-state', () => {
    it('debería actualizar estado de reproducción', () => {
      return request(app.getHttpServer())
        .put('/api/play-tracking/playback-state')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          isPlaying: true,
          currentTrackId: trackId,
        })
        .expect(204);
    });

    it('debería limpiar estado de reproducción', () => {
      return request(app.getHttpServer())
        .put('/api/play-tracking/playback-state')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          isPlaying: false,
          currentTrackId: null,
        })
        .expect(204);
    });

    it('debería rechazar sin autenticación', () => {
      return request(app.getHttpServer())
        .put('/api/play-tracking/playback-state')
        .send({
          isPlaying: true,
          currentTrackId: trackId,
        })
        .expect(401);
    });
  });

  describe('Flujo completo de play tracking', () => {
    it('debería seguir el flujo completo de reproducción', async () => {
      // 1. Registrar reproducción completa
      const playRes = await request(app.getHttpServer())
        .post('/api/play-tracking/play')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          trackId: trackId,
          playContext: 'album',
          sourceId: albumId,
          sourceType: 'album',
          completionRate: 1.0,
        })
        .expect(201);

      expect(playRes.body.skipped).toBe(false);

      // 2. Actualizar playback state
      await request(app.getHttpServer())
        .put('/api/play-tracking/playback-state')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ isPlaying: true, currentTrackId: track2Id })
        .expect(204);

      // 3. Registrar skip
      await request(app.getHttpServer())
        .post('/api/play-tracking/skip')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          trackId: track2Id,
          completionRate: 0.3,
          playContext: 'album',
        })
        .expect(201);

      // 4. Verificar historial
      const historyRes = await request(app.getHttpServer())
        .get('/api/play-tracking/history')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(historyRes.body.length).toBe(2);
      expect(historyRes.body[0].skipped).toBe(true);
      expect(historyRes.body[1].skipped).toBe(false);

      // 5. Verificar summary
      const summaryRes = await request(app.getHttpServer())
        .get('/api/play-tracking/summary')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(summaryRes.body.totalPlays).toBe(2);
      expect(summaryRes.body.totalSkips).toBe(1);
    });
  });
});
