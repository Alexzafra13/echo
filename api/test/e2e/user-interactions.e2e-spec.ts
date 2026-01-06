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
 * Prueba los endpoints de interacciones de usuario (ratings):
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
    // Limpiar tablas de interacciones
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
    const artist = await createTestArtist(drizzle, { name: 'Rated Artist' });
    artistId = artist.id;

    const album = await createTestAlbum(drizzle, {
      name: 'Rated Album',
      artistId: artist.id,
    });
    albumId = album.id;

    const track = await createTestTrack(drizzle, {
      title: 'Rated Track',
      path: '/music/rated.mp3',
      albumId: album.id,
      artistId: artist.id,
    });
    trackId = track.id;

    const playlist = await createTestPlaylist(drizzle, {
      name: 'Rated Playlist',
      ownerId: userId,
    });
    playlistId = playlist.id;
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

    it('debería dar rating a un álbum', () => {
      return request(app.getHttpServer())
        .post('/api/interactions/rating')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          itemId: albumId,
          itemType: 'album',
          rating: 4,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.rating).toBe(4);
          expect(res.body.itemType).toBe('album');
        });
    });

    it('debería dar rating a un artista', () => {
      return request(app.getHttpServer())
        .post('/api/interactions/rating')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          itemId: artistId,
          itemType: 'artist',
          rating: 5,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.rating).toBe(5);
          expect(res.body.itemType).toBe('artist');
        });
    });

    it('debería dar rating a una playlist', () => {
      return request(app.getHttpServer())
        .post('/api/interactions/rating')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          itemId: playlistId,
          itemType: 'playlist',
          rating: 3,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.rating).toBe(3);
          expect(res.body.itemType).toBe('playlist');
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

    it('debería validar itemType', () => {
      return request(app.getHttpServer())
        .post('/api/interactions/rating')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ itemId: trackId, itemType: 'invalid', rating: 5 })
        .expect(400);
    });

    it('debería validar campos requeridos', () => {
      return request(app.getHttpServer())
        .post('/api/interactions/rating')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ itemType: 'track', rating: 5 })
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

    it('no debería fallar al eliminar rating inexistente', () => {
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
      // Crear varios ratings
      await request(app.getHttpServer())
        .post('/api/interactions/rating')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ itemId: trackId, itemType: 'track', rating: 5 });

      await request(app.getHttpServer())
        .post('/api/interactions/rating')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ itemId: albumId, itemType: 'album', rating: 4 });

      await request(app.getHttpServer())
        .post('/api/interactions/rating')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ itemId: artistId, itemType: 'artist', rating: 3 });
    });

    it('debería obtener todas las interacciones del usuario', () => {
      return request(app.getHttpServer())
        .get('/api/interactions/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(3);
        });
    });

    it('debería filtrar por tipo de item', () => {
      return request(app.getHttpServer())
        .get('/api/interactions/me?itemType=track')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(1);
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
          expect(interaction).toHaveProperty('rating');
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
      // Usuario 1 da rating 5
      await request(app.getHttpServer())
        .post('/api/interactions/rating')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ itemId: trackId, itemType: 'track', rating: 5 });

      // Usuario 2 da rating 4
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
          expect(res.body.totalRatings).toBe(2);
          expect(res.body.averageRating).toBe(4.5);
          // Incluir rating del usuario actual
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
          expect(res.body.averageRating).toBe(4.5);
        });
    });

    it('debería mostrar item sin rating de usuario', async () => {
      // Crear tercer usuario sin rating
      const user3Result = await createUserAndLogin(drizzle, app, {
        username: 'interactions_user3',
        password: 'Test123!',
      });

      return request(app.getHttpServer())
        .get(`/api/interactions/item/track/${trackId}`)
        .set('Authorization', `Bearer ${user3Result.accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.totalRatings).toBe(2);
          expect(res.body.averageRating).toBe(4.5);
          expect(res.body.userRating).toBeUndefined();
        });
    });

    it('debería rechazar sin autenticación', () => {
      return request(app.getHttpServer())
        .get(`/api/interactions/item/track/${trackId}`)
        .expect(401);
    });
  });

  describe('Flujo completo de ratings', () => {
    it('debería completar flujo de rating y consulta', async () => {
      // 1. Dar rating
      const ratingRes = await request(app.getHttpServer())
        .post('/api/interactions/rating')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ itemId: trackId, itemType: 'track', rating: 5 })
        .expect(200);

      expect(ratingRes.body.rating).toBe(5);

      // 2. Obtener mis interacciones
      const meRes = await request(app.getHttpServer())
        .get('/api/interactions/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(meRes.body.length).toBe(1);
      expect(meRes.body[0].rating).toBe(5);

      // 3. Obtener resumen del item
      const summaryRes = await request(app.getHttpServer())
        .get(`/api/interactions/item/track/${trackId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(summaryRes.body.totalRatings).toBe(1);
      expect(summaryRes.body.averageRating).toBe(5);
      expect(summaryRes.body.userRating).toBe(5);

      // 4. Actualizar rating
      const updateRes = await request(app.getHttpServer())
        .post('/api/interactions/rating')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ itemId: trackId, itemType: 'track', rating: 3 })
        .expect(200);

      expect(updateRes.body.rating).toBe(3);

      // 5. Verificar actualización
      const verifyRes = await request(app.getHttpServer())
        .get(`/api/interactions/item/track/${trackId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(verifyRes.body.averageRating).toBe(3);
      expect(verifyRes.body.userRating).toBe(3);

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

      expect(finalRes.body.totalRatings).toBe(0);
      expect(finalRes.body.averageRating).toBe(0);
      // userRating puede ser undefined cuando no hay rating
      expect(finalRes.body.userRating).toBeUndefined();
    });
  });

  describe('Aislamiento entre usuarios', () => {
    it('cada usuario debería tener su propio rating independiente', async () => {
      // Usuario 1 da rating 5
      await request(app.getHttpServer())
        .post('/api/interactions/rating')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ itemId: trackId, itemType: 'track', rating: 5 });

      // Usuario 2 da rating 2
      await request(app.getHttpServer())
        .post('/api/interactions/rating')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ itemId: trackId, itemType: 'track', rating: 2 });

      // Verificar ratings de usuario 1
      const user1Res = await request(app.getHttpServer())
        .get('/api/interactions/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(user1Res.body.length).toBe(1);
      expect(user1Res.body[0].rating).toBe(5);

      // Verificar ratings de usuario 2
      const user2Res = await request(app.getHttpServer())
        .get('/api/interactions/me')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      expect(user2Res.body.length).toBe(1);
      expect(user2Res.body[0].rating).toBe(2);

      // Verificar promedio
      const summaryRes = await request(app.getHttpServer())
        .get(`/api/interactions/item/track/${trackId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(summaryRes.body.averageRating).toBe(3.5);
      expect(summaryRes.body.totalRatings).toBe(2);
    });
  });
});
