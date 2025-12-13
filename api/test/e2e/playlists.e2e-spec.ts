import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DrizzleService } from '../../src/infrastructure/database/drizzle.service';
import { BullmqService } from '../../src/infrastructure/queue/bullmq.service';
import {
  createTestApp,
  createUserAndLogin,
  cleanUserTables,
  cleanContentTables,
  cleanQueues,
  createTestArtist,
  createTestAlbum,
  createTestTrack,
  createTestPlaylist,
} from './helpers/test-setup';

/**
 * Playlists E2E Tests
 *
 * Prueba los endpoints de playlists:
 * - POST /api/playlists - Crear playlist
 * - GET /api/playlists - Listar playlists del usuario
 * - GET /api/playlists/:id - Obtener playlist por ID
 * - PATCH /api/playlists/:id - Actualizar playlist
 * - DELETE /api/playlists/:id - Eliminar playlist
 * - POST /api/playlists/:id/tracks - Agregar track
 * - DELETE /api/playlists/:id/tracks/:trackId - Remover track
 */
describe('Playlists E2E', () => {
  let app: INestApplication;
  let drizzle: DrizzleService;
  let bullmq: BullmqService;
  let userToken: string;
  let user2Token: string;
  let userId: string;
  let user2Id: string;
  let trackId: string;
  let track2Id: string;

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
    // Limpiar colas de BullMQ para evitar jobs huérfanos
    await cleanQueues(bullmq);
    // Limpiar BD
    // ORDEN IMPORTANTE: users primero (cascadea a playlists/playHistory), luego content
    await cleanUserTables(drizzle);
    await cleanContentTables(drizzle);

    // Crear usuario 1
    const user1Result = await createUserAndLogin(drizzle, app, {
      username: 'user_playlists',
      password: 'User123!',
    });
    userToken = user1Result.accessToken;
    userId = user1Result.user.id;

    // Crear usuario 2
    const user2Result = await createUserAndLogin(drizzle, app, {
      username: 'user2_playlists',
      password: 'User123!',
    });
    user2Token = user2Result.accessToken;
    user2Id = user2Result.user.id;

    // Crear artista y álbum de prueba
    const artist = await createTestArtist(drizzle, { name: 'Test Artist' });
    const album = await createTestAlbum(drizzle, {
      name: 'Test Album',
      artistId: artist.id,
    });

    // Crear tracks de prueba
    const track1 = await createTestTrack(drizzle, {
      title: 'Test Track 1',
      path: '/music/test1.mp3',
      albumId: album.id,
      artistId: artist.id,
    });
    trackId = track1.id;

    const track2 = await createTestTrack(drizzle, {
      title: 'Test Track 2',
      path: '/music/test2.mp3',
      albumId: album.id,
      artistId: artist.id,
    });
    track2Id = track2.id;
  });

  describe('POST /api/playlists', () => {
    it('debería crear una playlist privada', () => {
      return request(app.getHttpServer())
        .post('/api/playlists')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'My Playlist',
          description: 'Test playlist',
          public: false,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBeDefined();
          expect(res.body.name).toBe('My Playlist');
          expect(res.body.description).toBe('Test playlist');
          expect(res.body.public).toBe(false);
        });
    });

    it('debería crear una playlist pública', () => {
      return request(app.getHttpServer())
        .post('/api/playlists')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Public Playlist',
          description: 'Public test playlist',
          public: true,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.public).toBe(true);
        });
    });

    it('debería rechazar sin autenticación', () => {
      return request(app.getHttpServer())
        .post('/api/playlists')
        .send({
          name: 'Test',
          public: false,
        })
        .expect(401);
    });

    it('debería validar nombre requerido', () => {
      return request(app.getHttpServer())
        .post('/api/playlists')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          description: 'No name',
          public: false,
        })
        .expect(400);
    });
  });

  describe('GET /api/playlists/:id', () => {
    it('debería obtener una playlist por id', async () => {
      // Crear playlist
      const createRes = await request(app.getHttpServer())
        .post('/api/playlists')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Test Playlist',
          description: 'Test',
          public: false,
        });

      const playlistId = createRes.body.id;

      return request(app.getHttpServer())
        .get(`/api/playlists/${playlistId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(playlistId);
          expect(res.body.name).toBe('Test Playlist');
        });
    });

    it('debería retornar 404 para playlist inexistente', () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      return request(app.getHttpServer())
        .get(`/api/playlists/${nonExistentId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });

    it('debería retornar 400 para ID inválido', () => {
      return request(app.getHttpServer())
        .get('/api/playlists/invalid-id')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);
    });

    it('debería rechazar sin autenticación', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/playlists')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Test', public: false });

      return request(app.getHttpServer())
        .get(`/api/playlists/${createRes.body.id}`)
        .expect(401);
    });
  });

  describe('GET /api/playlists', () => {
    it('debería listar playlists del usuario', async () => {
      // Crear 2 playlists para el usuario
      await request(app.getHttpServer())
        .post('/api/playlists')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Playlist 1', public: false });

      await request(app.getHttpServer())
        .post('/api/playlists')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Playlist 2', public: false });

      return request(app.getHttpServer())
        .get('/api/playlists')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.items).toHaveLength(2);
          expect(res.body.total).toBe(2);
        });
    });

    it('debería respetar paginación', async () => {
      // Crear 3 playlists
      for (let i = 1; i <= 3; i++) {
        await request(app.getHttpServer())
          .post('/api/playlists')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ name: `Playlist ${i}`, public: false });
      }

      const response = await request(app.getHttpServer())
        .get('/api/playlists?skip=0&take=2')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.items.length).toBe(2);
      expect(response.body.total).toBe(3);
    });

    it('debería rechazar sin autenticación', () => {
      return request(app.getHttpServer())
        .get('/api/playlists')
        .expect(401);
    });
  });

  describe('PATCH /api/playlists/:id', () => {
    it('debería actualizar una playlist', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/playlists')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Original Name', public: false });

      const playlistId = createRes.body.id;

      return request(app.getHttpServer())
        .patch(`/api/playlists/${playlistId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Updated Name',
          description: 'Updated description',
          public: true,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.name).toBe('Updated Name');
          expect(res.body.description).toBe('Updated description');
          expect(res.body.public).toBe(true);
        });
    });

    it('debería rechazar sin autenticación', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/playlists')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Test', public: false });

      return request(app.getHttpServer())
        .patch(`/api/playlists/${createRes.body.id}`)
        .send({ name: 'Updated' })
        .expect(401);
    });
  });

  describe('DELETE /api/playlists/:id', () => {
    it('debería eliminar una playlist', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/playlists')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'To Delete', public: false });

      const playlistId = createRes.body.id;

      await request(app.getHttpServer())
        .delete(`/api/playlists/${playlistId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Verificar que ya no existe
      return request(app.getHttpServer())
        .get(`/api/playlists/${playlistId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });

    it('debería rechazar sin autenticación', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/playlists')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Test', public: false });

      return request(app.getHttpServer())
        .delete(`/api/playlists/${createRes.body.id}`)
        .expect(401);
    });
  });

  describe('POST /api/playlists/:id/tracks', () => {
    it('debería agregar un track a la playlist', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/playlists')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Test Playlist', public: false });

      const playlistId = createRes.body.id;

      return request(app.getHttpServer())
        .post(`/api/playlists/${playlistId}/tracks`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ trackId: trackId })
        .expect(201)
        .expect((res) => {
          expect(res.body.playlistId).toBe(playlistId);
          expect(res.body.trackId).toBe(trackId);
        });
    });

    it('debería rechazar sin autenticación', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/playlists')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Test', public: false });

      return request(app.getHttpServer())
        .post(`/api/playlists/${createRes.body.id}/tracks`)
        .send({ trackId: trackId })
        .expect(401);
    });
  });

  describe('DELETE /api/playlists/:id/tracks/:trackId', () => {
    it('debería remover un track de la playlist', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/playlists')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Test', public: false });

      const playlistId = createRes.body.id;

      // Agregar track
      await request(app.getHttpServer())
        .post(`/api/playlists/${playlistId}/tracks`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ trackId: trackId });

      // Remover track
      return request(app.getHttpServer())
        .delete(`/api/playlists/${playlistId}/tracks/${trackId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
    });
  });

  describe('Flujo completo de playlist', () => {
    it('debería crear playlist, agregar tracks, y eliminar', async () => {
      // 1. Crear playlist
      const createRes = await request(app.getHttpServer())
        .post('/api/playlists')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Flow Playlist',
          description: 'Testing flow',
          public: false,
        })
        .expect(201);

      const playlistId = createRes.body.id;

      // 2. Agregar tracks
      await request(app.getHttpServer())
        .post(`/api/playlists/${playlistId}/tracks`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ trackId: trackId })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/playlists/${playlistId}/tracks`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ trackId: track2Id })
        .expect(201);

      // 3. Obtener playlist con tracks
      const getRes = await request(app.getHttpServer())
        .get(`/api/playlists/${playlistId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(getRes.body.songCount).toBe(2);

      // 4. Actualizar nombre
      await request(app.getHttpServer())
        .patch(`/api/playlists/${playlistId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Updated Flow Playlist' })
        .expect(200);

      // 5. Eliminar un track
      await request(app.getHttpServer())
        .delete(`/api/playlists/${playlistId}/tracks/${trackId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // 6. Eliminar playlist
      await request(app.getHttpServer())
        .delete(`/api/playlists/${playlistId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
    });
  });
});
