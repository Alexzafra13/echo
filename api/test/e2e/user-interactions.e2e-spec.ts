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
  createTestPlaylist,
} from './helpers/test-setup';
import * as schema from '../../src/infrastructure/database/schema';

/**
 * User Interactions E2E Tests
 *
 * Prueba los endpoints de interacciones de usuario:
 * - POST /api/interactions/like - Toggle like
 * - POST /api/interactions/dislike - Toggle dislike
 * - POST /api/interactions/rating - Establecer rating
 * - DELETE /api/interactions/rating/:itemType/:itemId - Eliminar rating
 * - GET /api/interactions/me - Obtener interacciones del usuario
 * - GET /api/interactions/item/:itemType/:itemId - Resumen de un item
 */
describe('User Interactions E2E', () => {
  let app: INestApplication;
  let drizzle: DrizzleService;
  let accessToken: string;
  let user2Token: string;
  let userId: string;
  let user2Id: string;
  let trackId: string;
  let albumId: string;
  let artistId: string;
  let playlistId: string;

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    drizzle = testApp.drizzle;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Limpiar tablas de interacciones primero
    await drizzle.db.delete(schema.userStarred);
    await drizzle.db.delete(schema.userRatings);

    // Limpiar BD
    await cleanContentTables(drizzle);
    await cleanUserTables(drizzle);

    // Crear usuarios
    const userResult = await createUserAndLogin(drizzle, app, {
      username: 'interactions_user',
      password: 'Test123!',
    });
    accessToken = userResult.accessToken;
    userId = userResult.user.id;

    const user2Result = await createUserAndLogin(drizzle, app, {
      username: 'interactions_user2',
      password: 'Test123!',
    });
    user2Token = user2Result.accessToken;
    user2Id = user2Result.user.id;

    // Crear contenido de prueba
    const artist = await createTestArtist(drizzle, { name: 'Liked Artist' });
    artistId = artist.id;

    const album = await createTestAlbum(drizzle, {
      name: 'Liked Album',
      artistId: artist.id,
    });
    albumId = album.id;

    const track = await createTestTrack(drizzle, {
      title: 'Liked Track',
      path: '/music/liked.mp3',
      albumId: album.id,
      artistId: artist.id,
    });
    trackId = track.id;

    const playlist = await createTestPlaylist(drizzle, {
      name: 'Liked Playlist',
      ownerId: userId,
    });
    playlistId = playlist.id;
  });

  describe('POST /api/interactions/like', () => {
    it('debería dar like a un track', () => {
      return request(app.getHttpServer())
        .post('/api/interactions/like')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          itemId: trackId,
          itemType: 'track',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.liked).toBe(true);
          expect(res.body.likedAt).toBeDefined();
        });
    });

    it('debería quitar like (toggle off)', async () => {
      // Dar like primero
      await request(app.getHttpServer())
        .post('/api/interactions/like')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ itemId: trackId, itemType: 'track' });

      // Toggle off
      return request(app.getHttpServer())
        .post('/api/interactions/like')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ itemId: trackId, itemType: 'track' })
        .expect(200)
        .expect((res) => {
          expect(res.body.liked).toBe(false);
        });
    });

    it('debería dar like a un álbum', () => {
      return request(app.getHttpServer())
        .post('/api/interactions/like')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          itemId: albumId,
          itemType: 'album',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.liked).toBe(true);
        });
    });

    it('debería dar like a un artista', () => {
      return request(app.getHttpServer())
        .post('/api/interactions/like')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          itemId: artistId,
          itemType: 'artist',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.liked).toBe(true);
        });
    });

    it('debería dar like a una playlist', () => {
      return request(app.getHttpServer())
        .post('/api/interactions/like')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          itemId: playlistId,
          itemType: 'playlist',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.liked).toBe(true);
        });
    });

    it('debería rechazar sin autenticación', () => {
      return request(app.getHttpServer())
        .post('/api/interactions/like')
        .send({ itemId: trackId, itemType: 'track' })
        .expect(401);
    });

    it('debería validar itemType', () => {
      return request(app.getHttpServer())
        .post('/api/interactions/like')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ itemId: trackId, itemType: 'invalid' })
        .expect(400);
    });

    it('debería validar campos requeridos', () => {
      return request(app.getHttpServer())
        .post('/api/interactions/like')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ itemType: 'track' })
        .expect(400);
    });
  });

  describe('POST /api/interactions/dislike', () => {
    it('debería dar dislike a un track', () => {
      return request(app.getHttpServer())
        .post('/api/interactions/dislike')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          itemId: trackId,
          itemType: 'track',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.disliked).toBe(true);
        });
    });

    it('debería quitar dislike (toggle off)', async () => {
      // Dar dislike primero
      await request(app.getHttpServer())
        .post('/api/interactions/dislike')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ itemId: trackId, itemType: 'track' });

      // Toggle off
      return request(app.getHttpServer())
        .post('/api/interactions/dislike')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ itemId: trackId, itemType: 'track' })
        .expect(200)
        .expect((res) => {
          expect(res.body.disliked).toBe(false);
        });
    });

    it('debería rechazar sin autenticación', () => {
      return request(app.getHttpServer())
        .post('/api/interactions/dislike')
        .send({ itemId: trackId, itemType: 'track' })
        .expect(401);
    });
  });

  describe('POST /api/interactions/rating', () => {
    it('debería establecer rating de 5 estrellas', () => {
      return request(app.getHttpServer())
        .post('/api/interactions/rating')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          itemId: trackId,
          itemType: 'track',
          rating: 5,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.rating).toBe(5);
          expect(res.body.itemId).toBe(trackId);
          expect(res.body.itemType).toBe('track');
          expect(res.body.userId).toBe(userId);
        });
    });

    it('debería actualizar rating existente', async () => {
      // Rating inicial
      await request(app.getHttpServer())
        .post('/api/interactions/rating')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ itemId: trackId, itemType: 'track', rating: 3 });

      // Actualizar
      return request(app.getHttpServer())
        .post('/api/interactions/rating')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ itemId: trackId, itemType: 'track', rating: 5 })
        .expect(200)
        .expect((res) => {
          expect(res.body.rating).toBe(5);
        });
    });

    it('debería validar rating mínimo (1)', () => {
      return request(app.getHttpServer())
        .post('/api/interactions/rating')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ itemId: trackId, itemType: 'track', rating: 0 })
        .expect(400);
    });

    it('debería validar rating máximo (5)', () => {
      return request(app.getHttpServer())
        .post('/api/interactions/rating')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ itemId: trackId, itemType: 'track', rating: 6 })
        .expect(400);
    });

    it('debería validar rating entero', () => {
      return request(app.getHttpServer())
        .post('/api/interactions/rating')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ itemId: trackId, itemType: 'track', rating: 3.5 })
        .expect(400);
    });

    it('debería rechazar sin autenticación', () => {
      return request(app.getHttpServer())
        .post('/api/interactions/rating')
        .send({ itemId: trackId, itemType: 'track', rating: 5 })
        .expect(401);
    });
  });

  describe('DELETE /api/interactions/rating/:itemType/:itemId', () => {
    it('debería eliminar rating existente', async () => {
      // Crear rating
      await request(app.getHttpServer())
        .post('/api/interactions/rating')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ itemId: trackId, itemType: 'track', rating: 4 });

      // Eliminar
      return request(app.getHttpServer())
        .delete(`/api/interactions/rating/track/${trackId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);
    });

    it('debería rechazar sin autenticación', () => {
      return request(app.getHttpServer())
        .delete(`/api/interactions/rating/track/${trackId}`)
        .expect(401);
    });
  });

  describe('GET /api/interactions/me', () => {
    beforeEach(async () => {
      // Crear varias interacciones
      await request(app.getHttpServer())
        .post('/api/interactions/like')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ itemId: trackId, itemType: 'track' });

      await request(app.getHttpServer())
        .post('/api/interactions/like')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ itemId: albumId, itemType: 'album' });

      await request(app.getHttpServer())
        .post('/api/interactions/dislike')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ itemId: artistId, itemType: 'artist' });

      await request(app.getHttpServer())
        .post('/api/interactions/rating')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ itemId: trackId, itemType: 'track', rating: 5 });
    });

    it('debería obtener todas las interacciones del usuario', () => {
      return request(app.getHttpServer())
        .get('/api/interactions/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });

    it('debería filtrar por tipo de item', () => {
      return request(app.getHttpServer())
        .get('/api/interactions/me?itemType=track')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          res.body.forEach((interaction: any) => {
            expect(interaction.itemType).toBe('track');
          });
        });
    });

    it('debería incluir todos los campos de interacción', () => {
      return request(app.getHttpServer())
        .get('/api/interactions/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          const interaction = res.body[0];
          expect(interaction).toHaveProperty('userId');
          expect(interaction).toHaveProperty('itemId');
          expect(interaction).toHaveProperty('itemType');
          expect(interaction).toHaveProperty('sentiment');
        });
    });

    it('debería rechazar sin autenticación', () => {
      return request(app.getHttpServer())
        .get('/api/interactions/me')
        .expect(401);
    });
  });

  describe('GET /api/interactions/item/:itemType/:itemId', () => {
    beforeEach(async () => {
      // Usuario 1 da like y rating 5
      await request(app.getHttpServer())
        .post('/api/interactions/like')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ itemId: trackId, itemType: 'track' });

      await request(app.getHttpServer())
        .post('/api/interactions/rating')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ itemId: trackId, itemType: 'track', rating: 5 });

      // Usuario 2 da like y rating 4
      await request(app.getHttpServer())
        .post('/api/interactions/like')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ itemId: trackId, itemType: 'track' });

      await request(app.getHttpServer())
        .post('/api/interactions/rating')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ itemId: trackId, itemType: 'track', rating: 4 });
    });

    it('debería obtener resumen de interacciones de un item', () => {
      return request(app.getHttpServer())
        .get(`/api/interactions/item/track/${trackId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.itemId).toBe(trackId);
          expect(res.body.itemType).toBe('track');
          expect(res.body.totalLikes).toBe(2);
          expect(res.body.totalDislikes).toBe(0);
          expect(res.body.totalRatings).toBe(2);
          expect(res.body.averageRating).toBe(4.5);
          // Incluir estado del usuario actual
          expect(res.body.userSentiment).toBe('like');
          expect(res.body.userRating).toBe(5);
        });
    });

    it('debería mostrar perspectiva del usuario 2', () => {
      return request(app.getHttpServer())
        .get(`/api/interactions/item/track/${trackId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.userRating).toBe(4);
        });
    });

    it('debería rechazar sin autenticación', () => {
      return request(app.getHttpServer())
        .get(`/api/interactions/item/track/${trackId}`)
        .expect(401);
    });
  });

  describe('Interacción like/dislike mutuamente exclusiva', () => {
    it('dar like debería quitar dislike previo', async () => {
      // Dar dislike primero
      await request(app.getHttpServer())
        .post('/api/interactions/dislike')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ itemId: trackId, itemType: 'track' });

      // Dar like debería quitar el dislike
      await request(app.getHttpServer())
        .post('/api/interactions/like')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ itemId: trackId, itemType: 'track' })
        .expect(200);

      // Verificar estado
      return request(app.getHttpServer())
        .get(`/api/interactions/item/track/${trackId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.userSentiment).toBe('like');
          expect(res.body.totalLikes).toBe(1);
          expect(res.body.totalDislikes).toBe(0);
        });
    });

    it('dar dislike debería quitar like previo', async () => {
      // Dar like primero
      await request(app.getHttpServer())
        .post('/api/interactions/like')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ itemId: trackId, itemType: 'track' });

      // Dar dislike debería quitar el like
      await request(app.getHttpServer())
        .post('/api/interactions/dislike')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ itemId: trackId, itemType: 'track' })
        .expect(200);

      // Verificar estado
      return request(app.getHttpServer())
        .get(`/api/interactions/item/track/${trackId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.userSentiment).toBe('dislike');
          expect(res.body.totalLikes).toBe(0);
          expect(res.body.totalDislikes).toBe(1);
        });
    });
  });

  describe('Flujo completo de interacciones', () => {
    it('debería completar flujo de like, rating y consulta', async () => {
      // 1. Dar like
      const likeRes = await request(app.getHttpServer())
        .post('/api/interactions/like')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ itemId: trackId, itemType: 'track' })
        .expect(200);

      expect(likeRes.body.liked).toBe(true);

      // 2. Dar rating
      const ratingRes = await request(app.getHttpServer())
        .post('/api/interactions/rating')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ itemId: trackId, itemType: 'track', rating: 5 })
        .expect(200);

      expect(ratingRes.body.rating).toBe(5);

      // 3. Obtener mis interacciones
      const meRes = await request(app.getHttpServer())
        .get('/api/interactions/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(meRes.body.length).toBeGreaterThan(0);

      // 4. Obtener resumen del item
      const summaryRes = await request(app.getHttpServer())
        .get(`/api/interactions/item/track/${trackId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(summaryRes.body.totalLikes).toBe(1);
      expect(summaryRes.body.averageRating).toBe(5);

      // 5. Quitar like
      const unlikeRes = await request(app.getHttpServer())
        .post('/api/interactions/like')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ itemId: trackId, itemType: 'track' })
        .expect(200);

      expect(unlikeRes.body.liked).toBe(false);

      // 6. Eliminar rating
      await request(app.getHttpServer())
        .delete(`/api/interactions/rating/track/${trackId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      // 7. Verificar estado final
      const finalRes = await request(app.getHttpServer())
        .get(`/api/interactions/item/track/${trackId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(finalRes.body.totalLikes).toBe(0);
      // userRating puede ser null o undefined cuando no hay rating
      expect(finalRes.body.userRating ?? null).toBeNull();
    });
  });
});
