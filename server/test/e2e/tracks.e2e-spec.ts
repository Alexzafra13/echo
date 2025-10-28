import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/infrastructure/persistence/prisma.service';

describe('Tracks E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let track1Id: string;
  let track2Id: string;
  let track3Id: string;

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
    await prisma.track.deleteMany();

    // Crear tracks de prueba
    const track1 = await prisma.track.create({
      data: {
        title: 'Come Together',
        path: '/music/beatles/01-come-together.mp3',
        trackNumber: 1,
        discNumber: 1,
        year: 1969,
        duration: 259,
        bitRate: 320000,
        size: BigInt(10485760),
        suffix: 'mp3',
        compilation: false,
      },
    });

    const track2 = await prisma.track.create({
      data: {
        title: 'Something',
        path: '/music/beatles/02-something.mp3',
        trackNumber: 2,
        discNumber: 1,
        year: 1969,
        duration: 182,
        bitRate: 320000,
        size: BigInt(7340032),
        suffix: 'mp3',
        compilation: false,
      },
    });

    const track3 = await prisma.track.create({
      data: {
        title: 'Here Comes the Sun',
        path: '/music/beatles/03-here-comes-the-sun.mp3',
        trackNumber: 3,
        discNumber: 1,
        year: 1969,
        duration: 185,
        bitRate: 320000,
        size: BigInt(7464960),
        suffix: 'mp3',
        compilation: false,
      },
    });

    track1Id = track1.id;
    track2Id = track2.id;
    track3Id = track3.id;
  });

  describe('GET /api/tracks/:id', () => {
    it('debería obtener un track por su ID', () => {
      return request(app.getHttpServer())
        .get(`/api/tracks/${track1Id}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(track1Id);
          expect(res.body.title).toBe('Come Together');
          expect(res.body.path).toBe('/music/beatles/01-come-together.mp3');
          expect(res.body.trackNumber).toBe(1);
          expect(res.body.discNumber).toBe(1);
          expect(res.body.year).toBe(1969);
          expect(res.body.duration).toBe(259);
          expect(res.body.bitRate).toBe(320000);
          expect(res.body.suffix).toBe('mp3');
          expect(res.body.compilation).toBe(false);
          expect(res.body.createdAt).toBeDefined();
          expect(res.body.updatedAt).toBeDefined();
        });
    });

    it('debería retornar 404 si el track no existe', () => {
      return request(app.getHttpServer())
        .get('/api/tracks/00000000-0000-0000-0000-000000000000')
        .expect(404)
        .expect((res) => {
          expect(res.body.message).toContain('not found');
        });
    });

    it('debería retornar 404 si el ID es inválido', () => {
      return request(app.getHttpServer())
        .get('/api/tracks/invalid-id')
        .expect(404);
    });

    it('debería incluir campos opcionales cuando existen', async () => {
      const trackWithOptionals = await prisma.track.create({
        data: {
          title: 'Complete Track',
          path: '/music/complete.mp3',
          trackNumber: 5,
          discNumber: 2,
          year: 2020,
          duration: 300,
          bitRate: 320000,
          size: BigInt(12000000),
          suffix: 'mp3',
          lyrics: 'These are the lyrics...',
          comment: 'A complete track',
          albumName: 'Complete Album',
          artistName: 'Complete Artist',
          compilation: true,
        },
      });

      return request(app.getHttpServer())
        .get(`/api/tracks/${trackWithOptionals.id}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.lyrics).toBe('These are the lyrics...');
          expect(res.body.comment).toBe('A complete track');
          expect(res.body.albumName).toBe('Complete Album');
          expect(res.body.artistName).toBe('Complete Artist');
          expect(res.body.compilation).toBe(true);
        });
    });
  });

  describe('GET /api/tracks', () => {
    it('debería obtener lista de tracks con paginación por defecto', () => {
      return request(app.getHttpServer())
        .get('/api/tracks')
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
        .get('/api/tracks?take=150')
        .expect(200)
        .expect((res) => {
          expect(res.body.take).toBe(100);
        });
    });

    it('debería convertir skip negativo a 0', () => {
      return request(app.getHttpServer())
        .get('/api/tracks?skip=-10')
        .expect(200)
        .expect((res) => {
          expect(res.body.skip).toBe(0);
        });
    });

    it('debería convertir take inválido a 1', () => {
      return request(app.getHttpServer())
        .get('/api/tracks?take=0')
        .expect(200)
        .expect((res) => {
          expect(res.body.take).toBe(1);
        });
    });

    it('debería retornar array vacío cuando skip > total', () => {
      return request(app.getHttpServer())
        .get('/api/tracks?skip=100')
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveLength(0);
          expect(res.body.hasMore).toBe(false);
        });
    });

    it('debería ordenar por createdAt descendente', () => {
      return request(app.getHttpServer())
        .get('/api/tracks')
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

    it('debería incluir todos los campos en cada track', () => {
      return request(app.getHttpServer())
        .get('/api/tracks')
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
  });

  describe('GET /api/tracks/search/:query', () => {
    it('debería buscar tracks por título', () => {
      return request(app.getHttpServer())
        .get('/api/tracks/search/Come')
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
        .expect(200)
        .expect((res) => {
          expect(res.body.data.length).toBeGreaterThan(0);
        });
    });

    it('debería retornar 400 si query tiene menos de 2 caracteres', () => {
      return request(app.getHttpServer())
        .get('/api/tracks/search/a')
        .expect(400);
    });

    it('debería aplicar paginación en búsqueda', () => {
      return request(app.getHttpServer())
        .get('/api/tracks/search/e?skip=0&take=1')
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveLength(1);
          expect(res.body.skip).toBe(0);
          expect(res.body.take).toBe(1);
        });
    });

    it('debería retornar array vacío si no hay coincidencias', () => {
      return request(app.getHttpServer())
        .get('/api/tracks/search/NonExistent')
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveLength(0);
          expect(res.body.total).toBe(0);
          expect(res.body.hasMore).toBe(false);
        });
    });

    it('debería manejar caracteres especiales en query', () => {
      return request(app.getHttpServer())
        .get('/api/tracks/search/AC%2FDC')
        .expect(200);
    });

    it('debería incluir metadatos de paginación', () => {
      return request(app.getHttpServer())
        .get('/api/tracks/search/e?skip=0&take=10')
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
      // Crear más tracks para probar hasMore
      await prisma.track.createMany({
        data: [
          {
            title: 'Test Track 1',
            path: '/music/test1.mp3',
            discNumber: 1,
            compilation: false,
          },
          {
            title: 'Test Track 2',
            path: '/music/test2.mp3',
            discNumber: 1,
            compilation: false,
          },
          {
            title: 'Test Track 3',
            path: '/music/test3.mp3',
            discNumber: 1,
            compilation: false,
          },
        ],
      });

      return request(app.getHttpServer())
        .get('/api/tracks/search/Test?skip=0&take=2')
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveLength(2);
          expect(res.body.hasMore).toBe(true);
        });
    });
  });
});
