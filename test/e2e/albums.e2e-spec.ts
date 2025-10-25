import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/infrastructure/persistence/prisma.service';

describe('Albums E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let album1Id: string;
  let album2Id: string;
  let album3Id: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    app.setGlobalPrefix('api');

    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Limpiar BD antes de cada test
    await prisma.album.deleteMany();

    // Crear álbumes de prueba
    const album1 = await prisma.album.create({
      data: {
        name: 'Abbey Road',
        year: 1969,
        compilation: false,
        songCount: 17,
        duration: 2820,
        size: BigInt(125000000),
        description: 'The eleventh studio album by The Beatles',
      },
    });

    const album2 = await prisma.album.create({
      data: {
        name: 'Thriller',
        year: 1982,
        compilation: false,
        songCount: 9,
        duration: 2580,
        size: BigInt(115000000),
        description: 'Michael Jackson masterpiece',
      },
    });

    const album3 = await prisma.album.create({
      data: {
        name: 'The Dark Side of the Moon',
        year: 1973,
        compilation: false,
        songCount: 10,
        duration: 2580,
        size: BigInt(120000000),
        description: 'Pink Floyd classic',
      },
    });

    album1Id = album1.id;
    album2Id = album2.id;
    album3Id = album3.id;
  });

  describe('GET /api/albums/:id', () => {
    it('debería obtener un álbum por su ID', () => {
      return request(app.getHttpServer())
        .get(`/api/albums/${album1Id}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(album1Id);
          expect(res.body.name).toBe('Abbey Road');
          expect(res.body.year).toBe(1969);
          expect(res.body.songCount).toBe(17);
          expect(res.body.duration).toBe(2820);
          expect(res.body.compilation).toBe(false);
          expect(res.body.description).toBe(
            'The eleventh studio album by The Beatles',
          );
          expect(res.body.createdAt).toBeDefined();
          expect(res.body.updatedAt).toBeDefined();
        });
    });

    it('debería retornar 404 si el álbum no existe', () => {
      return request(app.getHttpServer())
        .get('/api/albums/00000000-0000-0000-0000-000000000000')
        .expect(404)
        .expect((res) => {
          expect(res.body.message).toContain('not found');
        });
    });

    it('debería retornar 404 si el ID es inválido', () => {
      return request(app.getHttpServer())
        .get('/api/albums/invalid-id')
        .expect(404);
    });

    it('debería incluir campos opcionales cuando existen', async () => {
      const albumWithOptionals = await prisma.album.create({
        data: {
          name: 'Complete Album',
          year: 2020,
          compilation: true,
          songCount: 15,
          duration: 3600,
          size: BigInt(150000000),
          coverArtPath: '/covers/complete.jpg',
          description: 'An album with all fields',
        },
      });

      return request(app.getHttpServer())
        .get(`/api/albums/${albumWithOptionals.id}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.coverArtPath).toBe('/covers/complete.jpg');
          expect(res.body.compilation).toBe(true);
        });
    });
  });

  describe('GET /api/albums', () => {
    it('debería obtener lista de álbumes con paginación por defecto', () => {
      return request(app.getHttpServer())
        .get('/api/albums')
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
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveLength(1);
          expect(res.body.skip).toBe(1);
          expect(res.body.take).toBe(1);
          expect(res.body.total).toBe(3);
          expect(res.body.hasMore).toBe(true); // 1 + 1 < 3
        });
    });

    it('debería manejar skip mayor al total de resultados', () => {
      return request(app.getHttpServer())
        .get('/api/albums?skip=100&take=10')
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

    it('debería manejar lista vacía de álbumes', async () => {
      await prisma.album.deleteMany();

      return request(app.getHttpServer())
        .get('/api/albums')
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveLength(0);
          expect(res.body.total).toBe(0);
          expect(res.body.hasMore).toBe(false);
        });
    });
  });

  describe('GET /api/albums/search/:query', () => {
    it('debería buscar álbumes por nombre', () => {
      return request(app.getHttpServer())
        .get('/api/albums/search/Abbey')
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
        .expect(200)
        .expect((res) => {
          expect(res.body.data.length).toBeGreaterThan(0);
          expect(res.body.data[0].name).toContain('Abbey');
        });
    });

    it('debería retornar resultados vacíos si no hay coincidencias', () => {
      return request(app.getHttpServer())
        .get('/api/albums/search/NonExistentAlbum')
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveLength(0);
          expect(res.body.total).toBe(0);
        });
    });

    it('debería rechazar búsqueda con query vacío', () => {
      return request(app.getHttpServer())
        .get('/api/albums/search/ ')
        .expect(400);
    });

    it('debería rechazar búsqueda con query de 1 carácter', () => {
      return request(app.getHttpServer())
        .get('/api/albums/search/a')
        .expect(400);
    });

    it('debería aceptar búsqueda con query de 2 caracteres', () => {
      return request(app.getHttpServer())
        .get('/api/albums/search/ab')
        .expect(200);
    });

    it('debería respetar paginación en búsqueda', () => {
      return request(app.getHttpServer())
        .get('/api/albums/search/a?skip=0&take=1')
        .expect(200)
        .expect((res) => {
          expect(res.body.skip).toBe(0);
          expect(res.body.take).toBe(1);
        });
    });

    it('debería incluir metadata de paginación', () => {
      return request(app.getHttpServer())
        .get('/api/albums/search/Dark')
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

    it('debería buscar coincidencias parciales', () => {
      return request(app.getHttpServer())
        .get('/api/albums/search/Dark')
        .expect(200)
        .expect((res) => {
          expect(res.body.data.length).toBeGreaterThan(0);
          expect(res.body.data[0].name).toBe('The Dark Side of the Moon');
        });
    });

    it('debería manejar caracteres especiales en búsqueda', () => {
      return request(app.getHttpServer())
        .get('/api/albums/search/Dark%20Side')
        .expect(200);
    });
  });

  describe('Validación de respuestas', () => {
    it('debería retornar álbum con estructura correcta', () => {
      return request(app.getHttpServer())
        .get(`/api/albums/${album1Id}`)
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
