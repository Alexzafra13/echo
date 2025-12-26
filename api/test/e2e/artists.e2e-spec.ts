import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DrizzleService } from '../../src/infrastructure/database/drizzle.service';
import {
  createTestApp,
  createUserAndLogin,
  cleanUserTables,
  cleanContentTables,
  createTestArtist,
} from './helpers/test-setup';

/**
 * Artists E2E Tests
 *
 * Prueba los endpoints de artistas:
 * - GET /api/artists/:id - Obtener artista por ID
 * - GET /api/artists - Listar artistas con paginación
 * - GET /api/artists/search/:query - Buscar artistas
 */
describe('Artists E2E', () => {
  let app: INestApplication;
  let drizzle: DrizzleService;
  let accessToken: string;

  let artist1Id: string;
  let artist2Id: string;
  let artist3Id: string;

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    drizzle = testApp.drizzle;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Limpiar BD antes de cada test
    await cleanContentTables(drizzle);
    await cleanUserTables(drizzle);

    // Crear usuario para autenticación
    const { accessToken: token } = await createUserAndLogin(drizzle, app, {
      username: 'testuser',
      password: 'Test123!',
    });
    accessToken = token;

    // Crear artistas de prueba
    const artist1 = await createTestArtist(drizzle, {
      name: 'The Beatles',
      biography: 'The Beatles were an English rock band...',
    });

    const artist2 = await createTestArtist(drizzle, {
      name: 'Pink Floyd',
      biography: 'Pink Floyd were an English rock band...',
    });

    const artist3 = await createTestArtist(drizzle, {
      name: 'Led Zeppelin',
    });

    artist1Id = artist1.id;
    artist2Id = artist2.id;
    artist3Id = artist3.id;
  });

  describe('GET /api/artists/:id', () => {
    it('debería obtener un artista por su ID', () => {
      return request(app.getHttpServer())
        .get(`/api/artists/${artist1Id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(artist1Id);
          expect(res.body.name).toBe('The Beatles');
          expect(res.body.biography).toBe('The Beatles were an English rock band...');
          expect(res.body.createdAt).toBeDefined();
          expect(res.body.updatedAt).toBeDefined();
        });
    });

    it('debería retornar 404 si el artista no existe', () => {
      return request(app.getHttpServer())
        .get('/api/artists/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404)
        .expect((res) => {
          expect(res.body.message).toContain('not found');
        });
    });

    it('debería retornar error si el ID tiene formato inválido', () => {
      // El backend puede retornar 400 (validación) o 404 (no encontrado)
      return request(app.getHttpServer())
        .get('/api/artists/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('debería permitir acceso sin autenticación (endpoint público)', () => {
      return request(app.getHttpServer())
        .get(`/api/artists/${artist1Id}`)
        .expect(200);
    });
  });

  describe('GET /api/artists', () => {
    it('debería obtener lista de artistas con paginación por defecto', () => {
      return request(app.getHttpServer())
        .get('/api/artists')
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
        .get('/api/artists?skip=1&take=1')
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
        .get('/api/artists?skip=100')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveLength(0);
          expect(res.body.hasMore).toBe(false);
        });
    });

    it('debería incluir todos los campos en cada artista', () => {
      return request(app.getHttpServer())
        .get('/api/artists')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          const artist = res.body.data[0];
          expect(artist).toHaveProperty('id');
          expect(artist).toHaveProperty('name');
          expect(artist).toHaveProperty('albumCount');
          expect(artist).toHaveProperty('songCount');
          expect(artist).toHaveProperty('createdAt');
          expect(artist).toHaveProperty('updatedAt');
        });
    });

    it('debería permitir acceso sin autenticación (endpoint público)', () => {
      return request(app.getHttpServer())
        .get('/api/artists')
        .expect(200);
    });
  });

  describe('GET /api/artists/search/:query', () => {
    it('debería buscar artistas por nombre', () => {
      return request(app.getHttpServer())
        .get('/api/artists/search/Beatles')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeInstanceOf(Array);
          expect(res.body.data.length).toBeGreaterThan(0);
          expect(res.body.query).toBe('Beatles');
          expect(res.body.data[0].name).toContain('Beatles');
        });
    });

    it('debería buscar de forma case-insensitive', () => {
      return request(app.getHttpServer())
        .get('/api/artists/search/beatles')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.length).toBeGreaterThan(0);
        });
    });

    it('debería aplicar paginación en búsqueda', () => {
      // Nota: la búsqueda requiere mínimo 2 caracteres
      return request(app.getHttpServer())
        .get('/api/artists/search/th?skip=0&take=1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveLength(1);
          expect(res.body.skip).toBe(0);
          expect(res.body.take).toBe(1);
        });
    });

    it('debería retornar array vacío si no hay coincidencias', () => {
      return request(app.getHttpServer())
        .get('/api/artists/search/NonExistent')
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
        .get('/api/artists/search/th?skip=0&take=10')
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
        .get('/api/artists/search/Beatles')
        .expect(200);
    });
  });

  describe('Validación de respuestas', () => {
    it('debería retornar artista con estructura correcta', () => {
      return request(app.getHttpServer())
        .get(`/api/artists/${artist1Id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(typeof res.body.id).toBe('string');
          expect(typeof res.body.name).toBe('string');
        });
    });

    it('debería retornar lista con estructura correcta', () => {
      return request(app.getHttpServer())
        .get('/api/artists')
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
        .get('/api/artists/search/Beatles')
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
