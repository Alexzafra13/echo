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
  createTestAlbum,
  createTestArtist,
} from './helpers/test-setup';

/**
 * Albums E2E Tests
 *
 * Prueba los endpoints de álbumes:
 * - GET /api/albums/:id - Obtener álbum por ID
 * - GET /api/albums - Listar álbumes con paginación
 * - GET /api/albums/search/:query - Buscar álbumes
 */
describe('Albums E2E', () => {
  let app: INestApplication;
  let drizzle: DrizzleService;
  let bullmq: BullmqService;
  let accessToken: string;

  let album1Id: string;
  let album2Id: string;
  let album3Id: string;

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

    // Crear artista de prueba
    const artist = await createTestArtist(drizzle, { name: 'The Beatles' });

    // Crear álbumes de prueba
    const album1 = await createTestAlbum(drizzle, {
      name: 'Abbey Road',
      artistId: artist.id,
      year: 1969,
      songCount: 17,
      duration: 2820,
    });

    const album2 = await createTestAlbum(drizzle, {
      name: 'Thriller',
      year: 1982,
      songCount: 9,
      duration: 2580,
    });

    const album3 = await createTestAlbum(drizzle, {
      name: 'The Dark Side of the Moon',
      year: 1973,
      songCount: 10,
      duration: 2580,
    });

    album1Id = album1.id;
    album2Id = album2.id;
    album3Id = album3.id;
  });

  describe('GET /api/albums/:id', () => {
    it('debería obtener un álbum por su ID', () => {
      return request(app.getHttpServer())
        .get(`/api/albums/${album1Id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(album1Id);
          expect(res.body.name).toBe('Abbey Road');
          expect(res.body.year).toBe(1969);
          expect(res.body.songCount).toBe(17);
          expect(res.body.duration).toBe(2820);
          expect(res.body.compilation).toBe(false);
          expect(res.body.createdAt).toBeDefined();
          expect(res.body.updatedAt).toBeDefined();
        });
    });

    it('debería retornar 404 si el álbum no existe', () => {
      return request(app.getHttpServer())
        .get('/api/albums/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404)
        .expect((res) => {
          expect(res.body.message).toContain('not found');
        });
    });

    it('debería retornar 500 si el ID tiene formato inválido', () => {
      // PostgreSQL lanza error para UUIDs inválidos
      return request(app.getHttpServer())
        .get('/api/albums/invalid-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(500);
    });

    it('debería permitir acceso sin autenticación (endpoint público)', () => {
      return request(app.getHttpServer())
        .get(`/api/albums/${album1Id}`)
        .expect(200);
    });
  });

  describe('GET /api/albums', () => {
    it('debería obtener lista de álbumes con paginación por defecto', () => {
      return request(app.getHttpServer())
        .get('/api/albums')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeDefined();
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBeGreaterThanOrEqual(3);
          expect(res.body.total).toBe(3);
          expect(res.body.skip).toBe(0);
          expect(res.body.take).toBe(10);
          expect(res.body.hasMore).toBe(false);
        });
    });

    it('debería respetar parámetros de paginación skip y take', () => {
      return request(app.getHttpServer())
        .get('/api/albums?skip=1&take=1')
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

    it('debería manejar skip mayor al total de resultados', () => {
      return request(app.getHttpServer())
        .get('/api/albums?skip=100&take=10')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveLength(0);
          expect(res.body.total).toBe(3);
          expect(res.body.hasMore).toBe(false);
        });
    });

    it('debería retornar álbumes con todos los campos', () => {
      return request(app.getHttpServer())
        .get('/api/albums')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          const album = res.body.data[0];
          expect(album).toHaveProperty('id');
          expect(album).toHaveProperty('name');
          expect(album).toHaveProperty('year');
          expect(album).toHaveProperty('songCount');
          expect(album).toHaveProperty('duration');
          expect(album).toHaveProperty('compilation');
          expect(album).toHaveProperty('createdAt');
          expect(album).toHaveProperty('updatedAt');
        });
    });

    it('debería permitir acceso sin autenticación (endpoint público)', () => {
      return request(app.getHttpServer())
        .get('/api/albums')
        .expect(200);
    });
  });

  describe('GET /api/albums/search/:query', () => {
    it('debería buscar álbumes por nombre', () => {
      return request(app.getHttpServer())
        .get('/api/albums/search/Abbey')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeDefined();
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBeGreaterThan(0);
          expect(res.body.query).toBe('Abbey');
          expect(res.body.data[0].name).toContain('Abbey');
        });
    });

    it('debería buscar de forma case-insensitive', () => {
      return request(app.getHttpServer())
        .get('/api/albums/search/abbey')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.length).toBeGreaterThan(0);
          expect(res.body.data[0].name).toContain('Abbey');
        });
    });

    it('debería retornar resultados vacíos si no hay coincidencias', () => {
      return request(app.getHttpServer())
        .get('/api/albums/search/NonExistentAlbum')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveLength(0);
          expect(res.body.total).toBe(0);
        });
    });

    it('debería buscar coincidencias parciales', () => {
      return request(app.getHttpServer())
        .get('/api/albums/search/Dark')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.length).toBeGreaterThan(0);
          expect(res.body.data[0].name).toBe('The Dark Side of the Moon');
        });
    });

    it('debería incluir metadata de paginación', () => {
      return request(app.getHttpServer())
        .get('/api/albums/search/Dark')
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
        .get('/api/albums/search/Abbey')
        .expect(200);
    });
  });

  describe('Validación de respuestas', () => {
    it('debería retornar álbum con estructura correcta', () => {
      return request(app.getHttpServer())
        .get(`/api/albums/${album1Id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(typeof res.body.id).toBe('string');
          expect(typeof res.body.name).toBe('string');
          expect(typeof res.body.compilation).toBe('boolean');
          expect(typeof res.body.songCount).toBe('number');
          expect(typeof res.body.duration).toBe('number');
        });
    });

    it('debería retornar lista con estructura correcta', () => {
      return request(app.getHttpServer())
        .get('/api/albums')
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

    it('debería retornar búsqueda con estructura correcta', () => {
      return request(app.getHttpServer())
        .get('/api/albums/search/Abbey')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(typeof res.body.total).toBe('number');
          expect(typeof res.body.query).toBe('string');
          expect(typeof res.body.hasMore).toBe('boolean');
        });
    });
  });
});
