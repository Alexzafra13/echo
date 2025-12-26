import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DrizzleService } from '../../src/infrastructure/database/drizzle.service';
import {
  createTestApp,
  createUserAndLogin,
  cleanUserTables,
} from './helpers/test-setup';
import * as schema from '../../src/infrastructure/database/schema';

/**
 * Radio E2E Tests
 *
 * Prueba los endpoints de radio:
 * - GET /api/radio/search - Buscar emisoras
 * - GET /api/radio/top-voted - Emisoras más votadas
 * - GET /api/radio/popular - Emisoras populares
 * - GET /api/radio/by-country/:code - Emisoras por país
 * - GET /api/radio/by-tag/:tag - Emisoras por género
 * - GET /api/radio/tags - Obtener géneros
 * - GET /api/radio/countries - Obtener países
 * - GET /api/radio/favorites - Favoritos del usuario
 * - POST /api/radio/favorites/from-api - Guardar emisora de Radio Browser
 * - POST /api/radio/favorites/custom - Crear emisora personalizada
 * - DELETE /api/radio/favorites/:id - Eliminar favorito
 *
 * Nota: Los endpoints de búsqueda dependen de Radio Browser API externa.
 * Los tests de favoritos son locales y más confiables.
 */
describe('Radio E2E', () => {
  let app: INestApplication;
  let drizzle: DrizzleService;
  let accessToken: string;
  let user2Token: string;
  let userId: string;
  let user2Id: string;

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    drizzle = testApp.drizzle;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Limpiar tablas de radio
    await drizzle.db.delete(schema.radioStations);
    await cleanUserTables(drizzle);

    // Crear usuarios
    const userResult = await createUserAndLogin(drizzle, app, {
      username: 'radio_user',
      password: 'Test123!',
    });
    accessToken = userResult.accessToken;
    userId = userResult.user.id;

    const user2Result = await createUserAndLogin(drizzle, app, {
      username: 'radio_user2',
      password: 'Test123!',
    });
    user2Token = user2Result.accessToken;
    user2Id = user2Result.user.id;
  });

  describe('Radio Favorites - CRUD Local', () => {
    describe('GET /api/radio/favorites', () => {
      it('debería retornar lista vacía si no hay favoritos', () => {
        return request(app.getHttpServer())
          .get('/api/radio/favorites')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(0);
          });
      });

      it('debería rechazar sin autenticación', () => {
        return request(app.getHttpServer())
          .get('/api/radio/favorites')
          .expect(401);
      });
    });

    describe('POST /api/radio/favorites/custom', () => {
      it('debería crear emisora personalizada', () => {
        return request(app.getHttpServer())
          .post('/api/radio/favorites/custom')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: 'Mi Radio',
            url: 'http://stream.example.com/radio.mp3',
            country: 'Spain',
            language: 'Spanish',
            tags: 'rock,pop',
            codec: 'mp3',
            bitrate: 128,
          })
          .expect(201)
          .expect((res) => {
            expect(res.body.id).toBeDefined();
            expect(res.body.name).toBe('Mi Radio');
            expect(res.body.url).toBe('http://stream.example.com/radio.mp3');
            expect(res.body.country).toBe('Spain');
          });
      });

      it('debería validar nombre requerido', () => {
        return request(app.getHttpServer())
          .post('/api/radio/favorites/custom')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            url: 'http://stream.example.com/radio.mp3',
          })
          .expect(400);
      });

      it('debería validar URL requerida', () => {
        return request(app.getHttpServer())
          .post('/api/radio/favorites/custom')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: 'Mi Radio',
          })
          .expect(400);
      });

      it('debería validar formato de URL', () => {
        return request(app.getHttpServer())
          .post('/api/radio/favorites/custom')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: 'Mi Radio',
            url: 'not-a-valid-url',
          })
          .expect(400);
      });

      it('debería rechazar sin autenticación', () => {
        return request(app.getHttpServer())
          .post('/api/radio/favorites/custom')
          .send({
            name: 'Mi Radio',
            url: 'http://stream.example.com/radio.mp3',
          })
          .expect(401);
      });
    });

    describe('POST /api/radio/favorites/from-api', () => {
      it('debería guardar emisora de Radio Browser API', () => {
        return request(app.getHttpServer())
          .post('/api/radio/favorites/from-api')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            stationuuid: 'abc123-uuid',
            name: 'BBC Radio 1',
            url: 'http://bbcradio1.example.com/stream',
            homepage: 'http://bbc.co.uk/radio1',
            favicon: 'http://bbc.co.uk/favicon.ico',
            country: 'United Kingdom',
            countrycode: 'GB',
            language: 'English',
            tags: 'pop,hits',
            codec: 'aac',
            bitrate: 320,
            votes: 1000,
            clickcount: 50000,
          })
          .expect(201)
          .expect((res) => {
            expect(res.body.id).toBeDefined();
            expect(res.body.name).toBe('BBC Radio 1');
          });
      });

      it('debería validar campos requeridos', () => {
        return request(app.getHttpServer())
          .post('/api/radio/favorites/from-api')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: 'Radio',
            // falta stationuuid y url
          })
          .expect(400);
      });

      it('debería rechazar sin autenticación', () => {
        return request(app.getHttpServer())
          .post('/api/radio/favorites/from-api')
          .send({
            stationuuid: 'abc123',
            name: 'Radio',
            url: 'http://example.com/stream',
          })
          .expect(401);
      });
    });

    describe('DELETE /api/radio/favorites/:id', () => {
      let stationId: string;

      beforeEach(async () => {
        // Crear emisora para eliminar
        const res = await request(app.getHttpServer())
          .post('/api/radio/favorites/custom')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: 'Radio to Delete',
            url: 'http://delete.example.com/stream',
          })
          .expect(201);

        stationId = res.body.id;
      });

      it('debería eliminar emisora favorita', async () => {
        await request(app.getHttpServer())
          .delete(`/api/radio/favorites/${stationId}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(204);

        // Verificar que ya no existe
        const favoritesRes = await request(app.getHttpServer())
          .get('/api/radio/favorites')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(favoritesRes.body.length).toBe(0);
      });

      it('debería rechazar sin autenticación', () => {
        return request(app.getHttpServer())
          .delete(`/api/radio/favorites/${stationId}`)
          .expect(401);
      });

      it('no debería permitir eliminar favoritos de otros usuarios', async () => {
        // Usuario 2 intenta eliminar favorito de usuario 1
        return request(app.getHttpServer())
          .delete(`/api/radio/favorites/${stationId}`)
          .set('Authorization', `Bearer ${user2Token}`)
          .expect((res) => {
            // Debería retornar 404 o 403
            expect([403, 404]).toContain(res.status);
          });
      });
    });

    describe('Aislamiento de favoritos por usuario', () => {
      it('cada usuario debería ver solo sus favoritos', async () => {
        // Usuario 1 crea emisora
        await request(app.getHttpServer())
          .post('/api/radio/favorites/custom')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: 'User1 Radio',
            url: 'http://user1.example.com/stream',
          })
          .expect(201);

        // Usuario 2 crea emisora
        await request(app.getHttpServer())
          .post('/api/radio/favorites/custom')
          .set('Authorization', `Bearer ${user2Token}`)
          .send({
            name: 'User2 Radio',
            url: 'http://user2.example.com/stream',
          })
          .expect(201);

        // Usuario 1 solo ve su emisora
        const user1Favorites = await request(app.getHttpServer())
          .get('/api/radio/favorites')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(user1Favorites.body.length).toBe(1);
        expect(user1Favorites.body[0].name).toBe('User1 Radio');

        // Usuario 2 solo ve su emisora
        const user2Favorites = await request(app.getHttpServer())
          .get('/api/radio/favorites')
          .set('Authorization', `Bearer ${user2Token}`)
          .expect(200);

        expect(user2Favorites.body.length).toBe(1);
        expect(user2Favorites.body[0].name).toBe('User2 Radio');
      });
    });
  });

  describe('Radio Search - External API', () => {
    // Nota: Estos tests dependen de Radio Browser API externa
    // Pueden fallar si la API está caída o hay problemas de red

    describe('GET /api/radio/search', () => {
      it('debería buscar emisoras por nombre', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/radio/search?name=rock')
          .set('Authorization', `Bearer ${accessToken}`);

        // Puede ser 200 con resultados o 200 con array vacío
        // dependiendo de la disponibilidad de la API
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
      });

      it('debería aplicar límite', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/radio/search?name=radio&limit=5')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        if (res.body.length > 0) {
          expect(res.body.length).toBeLessThanOrEqual(5);
        }
      });

      it('debería rechazar sin autenticación', () => {
        return request(app.getHttpServer())
          .get('/api/radio/search?name=rock')
          .expect(401);
      });
    });

    describe('GET /api/radio/top-voted', () => {
      it('debería obtener emisoras más votadas', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/radio/top-voted')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
      });

      it('debería aplicar límite', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/radio/top-voted?limit=10')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        if (res.body.length > 0) {
          expect(res.body.length).toBeLessThanOrEqual(10);
        }
      });
    });

    describe('GET /api/radio/popular', () => {
      it('debería obtener emisoras populares', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/radio/popular')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
      });
    });

    describe('GET /api/radio/by-country/:code', () => {
      it('debería obtener emisoras por código de país', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/radio/by-country/ES')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
      });
    });

    describe('GET /api/radio/by-tag/:tag', () => {
      it('debería obtener emisoras por género', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/radio/by-tag/rock')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
      });
    });

    describe('GET /api/radio/tags', () => {
      it('debería obtener lista de géneros', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/radio/tags')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
      });
    });

    describe('GET /api/radio/countries', () => {
      it('debería obtener lista de países', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/radio/countries')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
      });
    });
  });

  describe('Radio Stream Proxy', () => {
    describe('GET /api/radio/stream/proxy', () => {
      it('debería rechazar sin URL', () => {
        return request(app.getHttpServer())
          .get('/api/radio/stream/proxy')
          .expect(400);
      });

      it('debería rechazar URL inválida', () => {
        return request(app.getHttpServer())
          .get('/api/radio/stream/proxy?url=not-a-url')
          .expect(400);
      });

      it('debería bloquear URLs a redes privadas (SSRF protection)', async () => {
        const privateUrls = [
          'http://localhost/stream',
          'http://127.0.0.1/stream',
          'http://192.168.1.1/stream',
          'http://10.0.0.1/stream',
          'http://172.16.0.1/stream',
        ];

        for (const url of privateUrls) {
          await request(app.getHttpServer())
            .get(`/api/radio/stream/proxy?url=${encodeURIComponent(url)}`)
            .expect(400);
        }
      });

      // Nota: Probar streaming real requiere un stream de radio válido
      // y puede ser lento/inestable en tests
    });
  });

  describe('Flujo completo de favoritos', () => {
    it('debería completar flujo de CRUD de favoritos', async () => {
      // 1. Verificar que no hay favoritos
      const emptyRes = await request(app.getHttpServer())
        .get('/api/radio/favorites')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(emptyRes.body.length).toBe(0);

      // 2. Crear emisora personalizada
      const createRes = await request(app.getHttpServer())
        .post('/api/radio/favorites/custom')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Flow Radio',
          url: 'http://flow.example.com/stream',
          country: 'Spain',
          tags: 'flow,test',
        })
        .expect(201);

      const stationId = createRes.body.id;
      expect(createRes.body.name).toBe('Flow Radio');

      // 3. Verificar que aparece en favoritos
      const listRes = await request(app.getHttpServer())
        .get('/api/radio/favorites')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(listRes.body.length).toBe(1);
      expect(listRes.body[0].id).toBe(stationId);

      // 4. Agregar otra emisora (desde API simulada)
      await request(app.getHttpServer())
        .post('/api/radio/favorites/from-api')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          stationuuid: 'test-uuid-123',
          name: 'API Radio',
          url: 'http://api.example.com/stream',
        })
        .expect(201);

      // 5. Verificar que hay 2 favoritos
      const list2Res = await request(app.getHttpServer())
        .get('/api/radio/favorites')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(list2Res.body.length).toBe(2);

      // 6. Eliminar la primera emisora
      await request(app.getHttpServer())
        .delete(`/api/radio/favorites/${stationId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      // 7. Verificar que solo queda 1 favorito
      const finalRes = await request(app.getHttpServer())
        .get('/api/radio/favorites')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(finalRes.body.length).toBe(1);
      expect(finalRes.body[0].name).toBe('API Radio');
    });
  });
});
