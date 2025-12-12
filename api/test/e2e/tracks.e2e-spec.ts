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
} from './helpers/test-setup';

/**
 * Tracks E2E Tests
 *
 * Prueba los endpoints de tracks:
 * - GET /api/tracks/:id - Obtener track por ID
 * - GET /api/tracks - Listar tracks con paginación
 * - GET /api/tracks/search/:query - Buscar tracks
 */
describe('Tracks E2E', () => {
  let app: INestApplication;
  let drizzle: DrizzleService;
  let bullmq: BullmqService;
  let accessToken: string;

  let track1Id: string;
  let track2Id: string;
  let track3Id: string;

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
    // Limpiar BD antes de cada test
    await cleanContentTables(drizzle);
    await cleanUserTables(drizzle);

    // Crear usuario para autenticación
    const { accessToken: token } = await createUserAndLogin(drizzle, app, {
      username: 'testuser',
      password: 'Test123!',
    });
    accessToken = token;

    // Crear artista y álbum de prueba
    const artist = await createTestArtist(drizzle, { name: 'The Beatles' });
    const album = await createTestAlbum(drizzle, {
      name: 'Abbey Road',
      artistId: artist.id,
      year: 1969,
    });

    // Crear tracks de prueba
    const track1 = await createTestTrack(drizzle, {
      title: 'Come Together',
      path: '/music/beatles/01-come-together.mp3',
      albumId: album.id,
      artistId: artist.id,
      duration: 259,
      trackNumber: 1,
    });

    const track2 = await createTestTrack(drizzle, {
      title: 'Something',
      path: '/music/beatles/02-something.mp3',
      albumId: album.id,
      artistId: artist.id,
      duration: 182,
      trackNumber: 2,
    });

    const track3 = await createTestTrack(drizzle, {
      title: 'Here Comes the Sun',
      path: '/music/beatles/03-here-comes-the-sun.mp3',
      albumId: album.id,
      artistId: artist.id,
      duration: 185,
      trackNumber: 3,
    });

    track1Id = track1.id;
    track2Id = track2.id;
    track3Id = track3.id;
  });

  describe('GET /api/tracks/:id', () => {
    it('debería obtener un track por su ID', () => {
      return request(app.getHttpServer())
        .get(`/api/tracks/${track1Id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(track1Id);
          expect(res.body.title).toBe('Come Together');
          expect(res.body.trackNumber).toBe(1);
          expect(res.body.duration).toBe(259);
          expect(res.body.createdAt).toBeDefined();
          expect(res.body.updatedAt).toBeDefined();
        });
    });

    it('debería retornar 404 si el track no existe', () => {
      return request(app.getHttpServer())
        .get('/api/tracks/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404)
        .expect((res) => {
          expect(res.body.message).toContain('not found');
        });
    });

    it('debería permitir acceso sin autenticación (endpoint público)', () => {
      return request(app.getHttpServer())
        .get(`/api/tracks/${track1Id}`)
        .expect(200);
    });
  });

  describe('GET /api/tracks', () => {
    it('debería obtener lista de tracks con paginación por defecto', () => {
      return request(app.getHttpServer())
        .get('/api/tracks')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeInstanceOf(Array);
          expect(res.body.data.length).toBeGreaterThan(0);
          expect(res.body.total).toBe(3);
          expect(res.body.skip).toBe(0);
          expect(res.body.take).toBe(10);
          expect(res.body.hasMore).toBe(false);
        });
    });

    it('debería aplicar paginación con skip y take', () => {
      return request(app.getHttpServer())
        .get('/api/tracks?skip=1&take=1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveLength(1);
          expect(res.body.skip).toBe(1);
          expect(res.body.take).toBe(1);
          expect(res.body.total).toBe(3);
          expect(res.body.hasMore).toBe(true);
        });
    });

    it('debería retornar array vacío cuando skip > total', () => {
      return request(app.getHttpServer())
        .get('/api/tracks?skip=100')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveLength(0);
          expect(res.body.hasMore).toBe(false);
        });
    });

    it('debería incluir todos los campos en cada track', () => {
      return request(app.getHttpServer())
        .get('/api/tracks')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          const track = res.body.data[0];
          expect(track).toHaveProperty('id');
          expect(track).toHaveProperty('title');
          expect(track).toHaveProperty('path');
          expect(track).toHaveProperty('discNumber');
          expect(track).toHaveProperty('compilation');
          expect(track).toHaveProperty('createdAt');
          expect(track).toHaveProperty('updatedAt');
        });
    });

    it('debería permitir acceso sin autenticación (endpoint público)', () => {
      return request(app.getHttpServer())
        .get('/api/tracks')
        .expect(200);
    });
  });

  describe('GET /api/tracks/search/:query', () => {
    it('debería buscar tracks por título', () => {
      return request(app.getHttpServer())
        .get('/api/tracks/search/Come')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeInstanceOf(Array);
          expect(res.body.data.length).toBeGreaterThan(0);
          expect(res.body.query).toBe('Come');
          expect(res.body.data[0].title).toContain('Come');
        });
    });

    it('debería buscar de forma case-insensitive', () => {
      return request(app.getHttpServer())
        .get('/api/tracks/search/come')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.length).toBeGreaterThan(0);
        });
    });

    it('debería retornar array vacío si no hay coincidencias', () => {
      return request(app.getHttpServer())
        .get('/api/tracks/search/NonExistent')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveLength(0);
          expect(res.body.total).toBe(0);
          expect(res.body.hasMore).toBe(false);
        });
    });

    it('debería incluir metadatos de paginación', () => {
      // Nota: la búsqueda requiere mínimo 2 caracteres
      return request(app.getHttpServer())
        .get('/api/tracks/search/th?skip=0&take=10')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('skip');
          expect(res.body).toHaveProperty('take');
          expect(res.body).toHaveProperty('query');
          expect(res.body).toHaveProperty('hasMore');
        });
    });

    it('debería permitir acceso sin autenticación (endpoint público)', () => {
      return request(app.getHttpServer())
        .get('/api/tracks/search/Come')
        .expect(200);
    });
  });

  describe('Validación de respuestas', () => {
    it('debería retornar track con estructura correcta', () => {
      return request(app.getHttpServer())
        .get(`/api/tracks/${track1Id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(typeof res.body.id).toBe('string');
          expect(typeof res.body.title).toBe('string');
        });
    });

    it('debería retornar lista con estructura correcta', () => {
      return request(app.getHttpServer())
        .get('/api/tracks')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(typeof res.body.total).toBe('number');
          expect(typeof res.body.skip).toBe('number');
          expect(typeof res.body.take).toBe('number');
          expect(typeof res.body.hasMore).toBe('boolean');
        });
    });
  });
});
