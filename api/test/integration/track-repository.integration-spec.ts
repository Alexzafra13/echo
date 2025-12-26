import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { DrizzleService } from '../../src/infrastructure/database/drizzle.service';
import { DrizzleTrackRepository } from '../../src/features/tracks/infrastructure/persistence/track.repository';
import { Track } from '../../src/features/tracks/domain/entities/track.entity';
import * as schema from '../../src/infrastructure/database/schema';
import { eq } from 'drizzle-orm';

/**
 * TrackRepository Integration Tests
 *
 * Tests de integración que verifican el DrizzleTrackRepository
 * con una base de datos PostgreSQL REAL (no mocks).
 *
 * Estos tests detectan errores que los mocks no pueden encontrar:
 * - Errores en queries SQL
 * - Problemas con el schema
 * - Errores de mapping
 * - Paginación y ordenamiento
 * - Búsqueda con caracteres especiales
 *
 * Requieren: PostgreSQL corriendo con schema aplicado
 * Ejecutar: pnpm test:integration track-repository
 */
describe('TrackRepository Integration', () => {
  let module: TestingModule;
  let drizzle: DrizzleService;
  let repository: DrizzleTrackRepository;

  // IDs de artista y album de prueba
  let testArtistId: string;
  let testAlbumId: string;

  // Helper para limpiar tablas
  const cleanTables = async () => {
    try {
      await drizzle.db.delete(schema.tracks);
      await drizzle.db.delete(schema.albums);
      await drizzle.db.delete(schema.artists);
    } catch {
      // Ignorar errores de constraints
    }
  };

  // Helper para crear artista de prueba
  const createTestArtist = async (name = 'Test Artist') => {
    const [artist] = await drizzle.db
      .insert(schema.artists)
      .values({
        name,
        albumCount: 1,
        songCount: 10,
        size: 0,
      })
      .returning();
    return artist;
  };

  // Helper para crear album de prueba
  const createTestAlbum = async (artistId: string, name = 'Test Album') => {
    const [album] = await drizzle.db
      .insert(schema.albums)
      .values({
        name,
        artistId,
        year: 2024,
        songCount: 10,
        duration: 3600,
        size: 100000000,
        compilation: false,
      })
      .returning();
    return album;
  };

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required for integration tests');
    }

    module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot()],
      providers: [
        {
          provide: DrizzleService,
          useFactory: () => {
            const { Pool } = require('pg');
            const { drizzle } = require('drizzle-orm/node-postgres');

            const pool = new Pool({
              connectionString: process.env.DATABASE_URL,
            });

            const db = drizzle(pool, { schema });

            return {
              db,
              client: pool,
              onModuleInit: async () => {
                const client = await pool.connect();
                client.release();
              },
              onModuleDestroy: async () => {
                await pool.end();
              },
            };
          },
        },
        DrizzleTrackRepository,
      ],
    }).compile();

    drizzle = module.get<DrizzleService>(DrizzleService);
    repository = module.get<DrizzleTrackRepository>(DrizzleTrackRepository);

    await drizzle.onModuleInit();
  });

  afterAll(async () => {
    await cleanTables();
    await module?.close();
  });

  beforeEach(async () => {
    await cleanTables();

    // Crear artista y album de prueba para cada test
    const artist = await createTestArtist();
    testArtistId = artist.id;

    const album = await createTestAlbum(testArtistId);
    testAlbumId = album.id;
  });

  describe('create', () => {
    it('debería crear un track en la BD', async () => {
      const track = Track.create({
        title: 'Integration Test Track',
        path: '/music/test/track.mp3',
        albumId: testAlbumId,
        artistId: testArtistId,
        duration: 180,
        trackNumber: 1,
        discNumber: 1,
        compilation: false,
      });

      const created = await repository.create(track);

      expect(created).toBeDefined();
      expect(created.id).toBeDefined();
      expect(created.title).toBe('Integration Test Track');
      expect(created.path).toBe('/music/test/track.mp3');
      expect(created.duration).toBe(180);

      // Verificar en BD
      const [dbTrack] = await drizzle.db
        .select()
        .from(schema.tracks)
        .where(eq(schema.tracks.id, created.id));

      expect(dbTrack).toBeDefined();
      expect(dbTrack.title).toBe('Integration Test Track');
    });

    it('debería crear un track con todos los campos opcionales', async () => {
      const track = Track.create({
        title: 'Full Track',
        path: '/music/full/track.flac',
        albumId: testAlbumId,
        artistId: testArtistId,
        duration: 300,
        trackNumber: 5,
        discNumber: 2,
        year: 2024,
        bitRate: 320,
        size: 50000000,
        suffix: 'flac',
        lyrics: 'Test lyrics here',
        comment: 'Test comment',
        albumName: 'Test Album',
        artistName: 'Test Artist',
        compilation: false,
      });

      const created = await repository.create(track);

      expect(created.title).toBe('Full Track');
      expect(created.bitRate).toBe(320);
      expect(created.suffix).toBe('flac');
      expect(created.lyrics).toBe('Test lyrics here');
    });

    it('debería crear un track sin album ni artista', async () => {
      const track = Track.create({
        title: 'Orphan Track',
        path: '/music/orphan.mp3',
        discNumber: 1,
        compilation: false,
      });

      const created = await repository.create(track);

      expect(created.title).toBe('Orphan Track');
      expect(created.albumId).toBeUndefined();
      expect(created.artistId).toBeUndefined();
    });
  });

  describe('findById', () => {
    it('debería encontrar track por ID', async () => {
      const track = Track.create({
        title: 'Find By ID Track',
        path: '/music/findbyid.mp3',
        discNumber: 1,
        compilation: false,
      });
      const created = await repository.create(track);

      const found = await repository.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.title).toBe('Find By ID Track');
    });

    it('debería retornar null si ID no existe', async () => {
      const found = await repository.findById('00000000-0000-0000-0000-000000000000');

      expect(found).toBeNull();
    });
  });

  describe('findByIds', () => {
    it('debería encontrar múltiples tracks por IDs', async () => {
      const tracks = await Promise.all([
        repository.create(Track.create({
          title: 'Track 1',
          path: '/music/1.mp3',
          discNumber: 1,
          compilation: false,
        })),
        repository.create(Track.create({
          title: 'Track 2',
          path: '/music/2.mp3',
          discNumber: 1,
          compilation: false,
        })),
        repository.create(Track.create({
          title: 'Track 3',
          path: '/music/3.mp3',
          discNumber: 1,
          compilation: false,
        })),
      ]);

      const ids = tracks.map(t => t.id);
      const found = await repository.findByIds(ids);

      expect(found).toHaveLength(3);
      expect(found.map(t => t.title).sort()).toEqual(['Track 1', 'Track 2', 'Track 3']);
    });

    it('debería retornar array vacío para IDs vacíos', async () => {
      const found = await repository.findByIds([]);

      expect(found).toEqual([]);
    });
  });

  describe('findAll', () => {
    it('debería retornar lista paginada de tracks', async () => {
      // Crear 5 tracks
      for (let i = 0; i < 5; i++) {
        await repository.create(Track.create({
          title: `Track ${i}`,
          path: `/music/track_${i}.mp3`,
          discNumber: 1,
          compilation: false,
        }));
      }

      const page1 = await repository.findAll(0, 3);
      const page2 = await repository.findAll(3, 3);

      expect(page1).toHaveLength(3);
      expect(page2).toHaveLength(2);
    });

    it('debería excluir tracks marcados como missing', async () => {
      // Crear track normal
      await repository.create(Track.create({
        title: 'Normal Track',
        path: '/music/normal.mp3',
        discNumber: 1,
        compilation: false,
      }));

      // Crear track missing directamente en BD
      await drizzle.db.insert(schema.tracks).values({
        title: 'Missing Track',
        path: '/music/missing.mp3',
        discNumber: 1,
        compilation: false,
        missingAt: new Date(),
      });

      const all = await repository.findAll(0, 10);

      expect(all).toHaveLength(1);
      expect(all[0].title).toBe('Normal Track');
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      await repository.create(Track.create({
        title: 'Rock Anthem',
        path: '/music/rock.mp3',
        discNumber: 1,
        compilation: false,
      }));
      await repository.create(Track.create({
        title: 'Pop Song',
        path: '/music/pop.mp3',
        discNumber: 1,
        compilation: false,
      }));
      await repository.create(Track.create({
        title: 'Rock Ballad',
        path: '/music/ballad.mp3',
        discNumber: 1,
        compilation: false,
      }));
    });

    it('debería buscar tracks por título (case insensitive)', async () => {
      const results = await repository.search('rock', 0, 10);

      expect(results).toHaveLength(2);
      expect(results.map(t => t.title)).toContain('Rock Anthem');
      expect(results.map(t => t.title)).toContain('Rock Ballad');
    });

    it('debería buscar con mayúsculas/minúsculas mixtas', async () => {
      const results = await repository.search('ROCK', 0, 10);

      expect(results).toHaveLength(2);
    });

    it('debería manejar caracteres especiales en búsqueda', async () => {
      await repository.create(Track.create({
        title: 'Test % Percent',
        path: '/music/percent.mp3',
        discNumber: 1,
        compilation: false,
      }));

      const results = await repository.search('%', 0, 10);

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Test % Percent');
    });

    it('debería manejar underscore en búsqueda', async () => {
      await repository.create(Track.create({
        title: 'Track_With_Underscores',
        path: '/music/underscore.mp3',
        discNumber: 1,
        compilation: false,
      }));

      const results = await repository.search('_With_', 0, 10);

      expect(results).toHaveLength(1);
    });

    it('debería paginar resultados de búsqueda', async () => {
      const page1 = await repository.search('rock', 0, 1);
      const page2 = await repository.search('rock', 1, 1);

      expect(page1).toHaveLength(1);
      expect(page2).toHaveLength(1);
      expect(page1[0].id).not.toBe(page2[0].id);
    });
  });

  describe('findByAlbumId', () => {
    it('debería encontrar tracks de un album ordenados por disc/track', async () => {
      await repository.create(Track.create({
        title: 'Track 3',
        path: '/music/t3.mp3',
        albumId: testAlbumId,
        trackNumber: 3,
        discNumber: 1,
        compilation: false,
      }));
      await repository.create(Track.create({
        title: 'Track 1',
        path: '/music/t1.mp3',
        albumId: testAlbumId,
        trackNumber: 1,
        discNumber: 1,
        compilation: false,
      }));
      await repository.create(Track.create({
        title: 'Track 2',
        path: '/music/t2.mp3',
        albumId: testAlbumId,
        trackNumber: 2,
        discNumber: 1,
        compilation: false,
      }));

      const tracks = await repository.findByAlbumId(testAlbumId);

      expect(tracks).toHaveLength(3);
      expect(tracks[0].title).toBe('Track 1');
      expect(tracks[1].title).toBe('Track 2');
      expect(tracks[2].title).toBe('Track 3');
    });

    it('debería ordenar por disco y luego por track', async () => {
      await repository.create(Track.create({
        title: 'Disc 2 Track 1',
        path: '/music/d2t1.mp3',
        albumId: testAlbumId,
        trackNumber: 1,
        discNumber: 2,
        compilation: false,
      }));
      await repository.create(Track.create({
        title: 'Disc 1 Track 2',
        path: '/music/d1t2.mp3',
        albumId: testAlbumId,
        trackNumber: 2,
        discNumber: 1,
        compilation: false,
      }));
      await repository.create(Track.create({
        title: 'Disc 1 Track 1',
        path: '/music/d1t1.mp3',
        albumId: testAlbumId,
        trackNumber: 1,
        discNumber: 1,
        compilation: false,
      }));

      const tracks = await repository.findByAlbumId(testAlbumId);

      expect(tracks[0].title).toBe('Disc 1 Track 1');
      expect(tracks[1].title).toBe('Disc 1 Track 2');
      expect(tracks[2].title).toBe('Disc 2 Track 1');
    });

    it('debería incluir tracks missing por defecto', async () => {
      await repository.create(Track.create({
        title: 'Present Track',
        path: '/music/present.mp3',
        albumId: testAlbumId,
        discNumber: 1,
        compilation: false,
      }));

      // Track missing
      await drizzle.db.insert(schema.tracks).values({
        title: 'Missing Track',
        path: '/music/missing.mp3',
        albumId: testAlbumId,
        discNumber: 1,
        compilation: false,
        missingAt: new Date(),
      });

      const tracks = await repository.findByAlbumId(testAlbumId, true);
      expect(tracks).toHaveLength(2);
    });

    it('debería excluir tracks missing si se indica', async () => {
      await repository.create(Track.create({
        title: 'Present Track',
        path: '/music/present.mp3',
        albumId: testAlbumId,
        discNumber: 1,
        compilation: false,
      }));

      await drizzle.db.insert(schema.tracks).values({
        title: 'Missing Track',
        path: '/music/missing.mp3',
        albumId: testAlbumId,
        discNumber: 1,
        compilation: false,
        missingAt: new Date(),
      });

      const tracks = await repository.findByAlbumId(testAlbumId, false);
      expect(tracks).toHaveLength(1);
      expect(tracks[0].title).toBe('Present Track');
    });
  });

  describe('findByArtistId', () => {
    it('debería encontrar tracks por artistId', async () => {
      await repository.create(Track.create({
        title: 'Artist Track 1',
        path: '/music/at1.mp3',
        artistId: testArtistId,
        discNumber: 1,
        compilation: false,
      }));
      await repository.create(Track.create({
        title: 'Artist Track 2',
        path: '/music/at2.mp3',
        artistId: testArtistId,
        discNumber: 1,
        compilation: false,
      }));

      const tracks = await repository.findByArtistId(testArtistId, 0, 10);

      expect(tracks).toHaveLength(2);
    });

    it('debería encontrar tracks por albumArtistId', async () => {
      await repository.create(Track.create({
        title: 'Album Artist Track',
        path: '/music/aat.mp3',
        albumArtistId: testArtistId,
        discNumber: 1,
        compilation: false,
      }));

      const tracks = await repository.findByArtistId(testArtistId, 0, 10);

      expect(tracks).toHaveLength(1);
      expect(tracks[0].title).toBe('Album Artist Track');
    });

    it('debería excluir tracks missing', async () => {
      await repository.create(Track.create({
        title: 'Present',
        path: '/music/present.mp3',
        artistId: testArtistId,
        discNumber: 1,
        compilation: false,
      }));

      await drizzle.db.insert(schema.tracks).values({
        title: 'Missing',
        path: '/music/missing.mp3',
        artistId: testArtistId,
        discNumber: 1,
        compilation: false,
        missingAt: new Date(),
      });

      const tracks = await repository.findByArtistId(testArtistId, 0, 10);

      expect(tracks).toHaveLength(1);
    });
  });

  describe('count', () => {
    it('debería retornar conteo correcto de tracks', async () => {
      for (let i = 0; i < 5; i++) {
        await repository.create(Track.create({
          title: `Count Track ${i}`,
          path: `/music/count_${i}.mp3`,
          discNumber: 1,
          compilation: false,
        }));
      }

      const count = await repository.count();

      expect(count).toBe(5);
    });

    it('debería excluir tracks missing del conteo', async () => {
      await repository.create(Track.create({
        title: 'Present',
        path: '/music/present.mp3',
        discNumber: 1,
        compilation: false,
      }));

      await drizzle.db.insert(schema.tracks).values({
        title: 'Missing',
        path: '/music/missing.mp3',
        discNumber: 1,
        compilation: false,
        missingAt: new Date(),
      });

      const count = await repository.count();

      expect(count).toBe(1);
    });

    it('debería retornar 0 si no hay tracks', async () => {
      const count = await repository.count();

      expect(count).toBe(0);
    });
  });

  describe('findShuffledPaginated', () => {
    beforeEach(async () => {
      for (let i = 0; i < 10; i++) {
        await repository.create(Track.create({
          title: `Shuffle Track ${i}`,
          path: `/music/shuffle_${i}.mp3`,
          discNumber: 1,
          compilation: false,
        }));
      }
    });

    it('debería retornar tracks en orden determinístico con el mismo seed', async () => {
      const seed = 12345;

      const result1 = await repository.findShuffledPaginated(seed, 0, 5);
      const result2 = await repository.findShuffledPaginated(seed, 0, 5);

      expect(result1.map(t => t.id)).toEqual(result2.map(t => t.id));
    });

    it('debería retornar orden diferente con diferente seed', async () => {
      const result1 = await repository.findShuffledPaginated(111, 0, 5);
      const result2 = await repository.findShuffledPaginated(222, 0, 5);

      // Muy improbable que sean iguales con seeds diferentes
      const ids1 = result1.map(t => t.id).join(',');
      const ids2 = result2.map(t => t.id).join(',');
      expect(ids1).not.toBe(ids2);
    });

    it('debería paginar consistentemente con el mismo seed', async () => {
      const seed = 54321;

      const page1 = await repository.findShuffledPaginated(seed, 0, 3);
      const page2 = await repository.findShuffledPaginated(seed, 3, 3);
      const page3 = await repository.findShuffledPaginated(seed, 6, 3);

      // Verificar que no hay duplicados entre páginas
      const allIds = [...page1, ...page2, ...page3].map(t => t.id);
      const uniqueIds = new Set(allIds);
      expect(uniqueIds.size).toBe(9);
    });
  });

  describe('update', () => {
    it('debería actualizar campos del track', async () => {
      const track = await repository.create(Track.create({
        title: 'Original Title',
        path: '/music/original.mp3',
        discNumber: 1,
        compilation: false,
      }));

      const updated = await repository.update(track.id, {
        title: 'Updated Title',
        duration: 240,
      } as any);

      expect(updated).toBeDefined();
      expect(updated?.title).toBe('Updated Title');

      // Verificar en BD
      const [dbTrack] = await drizzle.db
        .select()
        .from(schema.tracks)
        .where(eq(schema.tracks.id, track.id));

      expect(dbTrack.title).toBe('Updated Title');
    });

    it('debería actualizar updatedAt automáticamente', async () => {
      const track = await repository.create(Track.create({
        title: 'Test',
        path: '/music/test.mp3',
        discNumber: 1,
        compilation: false,
      }));

      const originalUpdatedAt = track.updatedAt;

      // Esperar un poco para que updatedAt sea diferente
      await new Promise(resolve => setTimeout(resolve, 10));

      await repository.update(track.id, { title: 'Modified' } as any);

      const [dbTrack] = await drizzle.db
        .select()
        .from(schema.tracks)
        .where(eq(schema.tracks.id, track.id));

      expect(dbTrack.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('debería retornar null si track no existe', async () => {
      const result = await repository.update(
        '00000000-0000-0000-0000-000000000000',
        { title: 'No Existe' } as any,
      );

      expect(result).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('debería manejar títulos muy largos', async () => {
      const longTitle = 'A'.repeat(500);
      const track = Track.create({
        title: longTitle,
        path: '/music/long.mp3',
        discNumber: 1,
        compilation: false,
      });

      const created = await repository.create(track);
      expect(created.title).toBe(longTitle);
    });

    it('debería manejar caracteres unicode en título', async () => {
      const track = Track.create({
        title: '日本語の曲 🎵 Música en español',
        path: '/music/unicode.mp3',
        discNumber: 1,
        compilation: false,
      });

      const created = await repository.create(track);
      const found = await repository.findById(created.id);

      expect(found?.title).toBe('日本語の曲 🎵 Música en español');
    });

    it('debería manejar paths con caracteres especiales', async () => {
      const track = Track.create({
        title: 'Special Path Track',
        path: "/music/Rock & Roll/It's My Life (Remaster).mp3",
        discNumber: 1,
        compilation: false,
      });

      const created = await repository.create(track);
      const found = await repository.findById(created.id);

      expect(found?.path).toBe("/music/Rock & Roll/It's My Life (Remaster).mp3");
    });
  });
});
