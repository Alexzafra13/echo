import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/infrastructure/persistence/prisma.service';

describe('Artists E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let artist1Id: string;
  let artist2Id: string;
  let artist3Id: string;

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
    await prisma.artist.deleteMany();

    // Crear artistas de prueba
    const artist1 = await prisma.artist.create({
      data: {
        name: 'The Beatles',
        albumCount: 13,
        songCount: 213,
        size: BigInt(1073741824),
        biography: 'The Beatles were an English rock band...',
        orderArtistName: 'Beatles, The',
      },
    });

    const artist2 = await prisma.artist.create({
      data: {
        name: 'Pink Floyd',
        albumCount: 15,
        songCount: 165,
        size: BigInt(858993459),
        biography: 'Pink Floyd were an English rock band...',
      },
    });

    const artist3 = await prisma.artist.create({
      data: {
        name: 'Led Zeppelin',
        albumCount: 9,
        songCount: 94,
        size: BigInt(644245094),
      },
    });

    artist1Id = artist1.id;
    artist2Id = artist2.id;
    artist3Id = artist3.id;
  });

  describe('GET /api/artists/:id', () => {
    it('debería obtener un artista por su ID', () => {
      return request(app.getHttpServer())
        .get(`/api/artists/${artist1Id}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(artist1Id);
          expect(res.body.name).toBe('The Beatles');
          expect(res.body.albumCount).toBe(13);
          expect(res.body.songCount).toBe(213);
          expect(res.body.biography).toBe('The Beatles were an English rock band...');
          expect(res.body.orderArtistName).toBe('Beatles, The');
          expect(res.body.createdAt).toBeDefined();
          expect(res.body.updatedAt).toBeDefined();
        });
    });

    it('debería retornar 404 si el artista no existe', () => {
      return request(app.getHttpServer())
        .get('/api/artists/00000000-0000-0000-0000-000000000000')
        .expect(404)
        .expect((res) => {
          expect(res.body.message).toContain('not found');
        });
    });

    it('debería retornar 404 si el ID es inválido', () => {
      return request(app.getHttpServer())
        .get('/api/artists/invalid-id')
        .expect(404);
    });

    it('debería incluir campos opcionales cuando existen', async () => {
      const artistWithOptionals = await prisma.artist.create({
        data: {
          name: 'Complete Artist',
          albumCount: 20,
          songCount: 250,
          size: BigInt(2147483648),
          mbzArtistId: 'test-mbz-id',
          biography: 'A complete artist biography',
          smallImageUrl: 'https://example.com/small.jpg',
          mediumImageUrl: 'https://example.com/medium.jpg',
          largeImageUrl: 'https://example.com/large.jpg',
          externalUrl: 'https://example.com/artist',
        },
      });

      return request(app.getHttpServer())
        .get(`/api/artists/${artistWithOptionals.id}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.mbzArtistId).toBe('test-mbz-id');
          expect(res.body.smallImageUrl).toBe('https://example.com/small.jpg');
          expect(res.body.externalUrl).toBe('https://example.com/artist');
        });
    });
  });

  describe('GET /api/artists', () => {
    it('debería obtener lista de artistas con paginación por defecto', () => {
      return request(app.getHttpServer())
        .get('/api/artists')
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
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveLength(1);
          expect(res.body.skip).toBe(1);
          expect(res.body.take).toBe(1);
          expect(res.body.total).toBe(3);
          expect(res.body.hasMore).toBe(true);
        });
    });

    it('debería limitar take a máximo 100', () => {
      return request(app.getHttpServer())
        .get('/api/artists?take=150')
        .expect(200)
        .expect((res) => {
          expect(res.body.take).toBe(100);
        });
    });

    it('debería convertir skip negativo a 0', () => {
      return request(app.getHttpServer())
        .get('/api/artists?skip=-10')
        .expect(200)
        .expect((res) => {
          expect(res.body.skip).toBe(0);
        });
    });

    it('debería convertir take inválido a 1', () => {
      return request(app.getHttpServer())
        .get('/api/artists?take=0')
        .expect(200)
        .expect((res) => {
          expect(res.body.take).toBe(1);
        });
    });

    it('debería retornar array vacío cuando skip > total', () => {
      return request(app.getHttpServer())
        .get('/api/artists?skip=100')
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveLength(0);
          expect(res.body.hasMore).toBe(false);
        });
    });

    it('debería ordenar por createdAt descendente', () => {
      return request(app.getHttpServer())
        .get('/api/artists')
        .expect(200)
        .expect((res) => {
          expect(res.body.data.length).toBeGreaterThan(1);
          const firstDate = new Date(res.body.data[0].createdAt);
          const lastDate = new Date(
            res.body.data[res.body.data.length - 1].createdAt,
          );
          expect(firstDate.getTime()).toBeGreaterThanOrEqual(lastDate.getTime());
        });
    });

    it('debería incluir todos los campos en cada artista', () => {
      return request(app.getHttpServer())
        .get('/api/artists')
        .expect(200)
        .expect((res) => {
          const artist = res.body.data[0];
          expect(artist).toHaveProperty('id');
          expect(artist).toHaveProperty('name');
          expect(artist).toHaveProperty('albumCount');
          expect(artist).toHaveProperty('songCount');
          expect(artist).toHaveProperty('size');
          expect(artist).toHaveProperty('createdAt');
          expect(artist).toHaveProperty('updatedAt');
        });
    });
  });

  describe('GET /api/artists/search/:query', () => {
    it('debería buscar artistas por nombre', () => {
      return request(app.getHttpServer())
        .get('/api/artists/search/Beatles')
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
        .expect(200)
        .expect((res) => {
          expect(res.body.data.length).toBeGreaterThan(0);
        });
    });

    it('debería retornar 400 si query tiene menos de 2 caracteres', () => {
      return request(app.getHttpServer())
        .get('/api/artists/search/a')
        .expect(400);
    });

    it('debería aplicar paginación en búsqueda', () => {
      return request(app.getHttpServer())
        .get('/api/artists/search/e?skip=0&take=1')
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
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveLength(0);
          expect(res.body.total).toBe(0);
          expect(res.body.hasMore).toBe(false);
        });
    });

    it('debería manejar caracteres especiales en query', () => {
      return request(app.getHttpServer())
        .get('/api/artists/search/AC%2FDC')
        .expect(200);
    });

    it('debería incluir metadatos de paginación', () => {
      return request(app.getHttpServer())
        .get('/api/artists/search/e?skip=0&take=10')
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

    it('debería establecer hasMore correctamente', async () => {
      // Crear más artistas para probar hasMore
      await prisma.artist.createMany({
        data: [
          {
            name: 'Test Artist 1',
            albumCount: 5,
            songCount: 50,
            size: BigInt(0),
          },
          {
            name: 'Test Artist 2',
            albumCount: 5,
            songCount: 50,
            size: BigInt(0),
          },
          {
            name: 'Test Artist 3',
            albumCount: 5,
            songCount: 50,
            size: BigInt(0),
          },
        ],
      });

      return request(app.getHttpServer())
        .get('/api/artists/search/Test?skip=0&take=2')
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveLength(2);
          expect(res.body.hasMore).toBe(true);
        });
    });
  });
});
