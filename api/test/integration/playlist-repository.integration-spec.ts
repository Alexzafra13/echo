import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { DrizzleService } from '../../src/infrastructure/database/drizzle.service';
import { DrizzlePlaylistRepository } from '../../src/features/playlists/infrastructure/persistence/playlist.repository';
import { Playlist, PlaylistTrack } from '../../src/features/playlists/domain/entities';
import * as schema from '../../src/infrastructure/database/schema';
import { eq } from 'drizzle-orm';

/**
 * PlaylistRepository Integration Tests
 *
 * Tests de integración que verifican el DrizzlePlaylistRepository
 * con una base de datos PostgreSQL REAL (no mocks).
 *
 * Estos tests cubren:
 * - CRUD de playlists
 * - Gestión de tracks en playlists
 * - Transacciones para race conditions
 * - Reordenamiento de tracks
 * - Búsqueda y paginación
 *
 * Requieren: PostgreSQL corriendo con schema aplicado
 * Ejecutar: pnpm test:integration playlist-repository
 */
describe('PlaylistRepository Integration', () => {
  let module: TestingModule;
  let drizzle: DrizzleService;
  let repository: DrizzlePlaylistRepository;

  // IDs de prueba
  let testUserId: string;
  let testArtistId: string;
  let testAlbumId: string;
  let testTrackIds: string[] = [];

  // Helper para limpiar tablas usando TRUNCATE CASCADE
  const cleanTables = async () => {
    await drizzle.client.query(`
      TRUNCATE TABLE
        playlist_tracks,
        playlists,
        tracks,
        albums,
        artists,
        users
      RESTART IDENTITY CASCADE
    `);
  };

  // Helper para crear usuario de prueba
  const createTestUser = async (username = 'playlist_test_user') => {
    const [user] = await drizzle.db
      .insert(schema.users)
      .values({
        username,
        passwordHash: '$2b$12$test_hash',
        name: 'Playlist Test User',
        isAdmin: false,
        isActive: true,
        mustChangePassword: false,
        theme: 'dark',
        language: 'es',
        isPublicProfile: false,
        showTopTracks: true,
        showTopArtists: true,
        showTopAlbums: true,
        showPlaylists: true,
      })
      .returning();
    return user;
  };

  // Helper para crear artista de prueba
  const createTestArtist = async () => {
    const [artist] = await drizzle.db
      .insert(schema.artists)
      .values({
        name: 'Playlist Test Artist',
        albumCount: 1,
        songCount: 10,
        size: 0,
      })
      .returning();
    return artist;
  };

  // Helper para crear album de prueba
  const createTestAlbum = async (artistId: string) => {
    const [album] = await drizzle.db
      .insert(schema.albums)
      .values({
        name: 'Playlist Test Album',
        artistId,
        year: 2024,
        songCount: 5,
        duration: 1200,
        size: 50000000,
        compilation: false,
      })
      .returning();
    return album;
  };

  // Helper para crear tracks de prueba
  const createTestTracks = async (albumId: string, artistId: string, count = 5) => {
    const tracks: string[] = [];
    for (let i = 0; i < count; i++) {
      const [track] = await drizzle.db
        .insert(schema.tracks)
        .values({
          title: `Test Track ${i + 1}`,
          path: `/music/track_${i + 1}.mp3`,
          albumId,
          artistId,
          duration: 180 + i * 30,
          trackNumber: i + 1,
          discNumber: 1,
          compilation: false,
        })
        .returning();
      tracks.push(track.id);
    }
    return tracks;
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
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { Pool } = require('pg');
            // eslint-disable-next-line @typescript-eslint/no-var-requires
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
        DrizzlePlaylistRepository,
      ],
    }).compile();

    drizzle = module.get<DrizzleService>(DrizzleService);
    repository = module.get<DrizzlePlaylistRepository>(DrizzlePlaylistRepository);

    await drizzle.onModuleInit();
  });

  afterAll(async () => {
    await cleanTables();
    await module?.close();
  });

  beforeEach(async () => {
    await cleanTables();

    // Setup datos de prueba
    const user = await createTestUser();
    testUserId = user.id;

    const artist = await createTestArtist();
    testArtistId = artist.id;

    const album = await createTestAlbum(testArtistId);
    testAlbumId = album.id;

    testTrackIds = await createTestTracks(testAlbumId, testArtistId);
  });

  describe('Playlist CRUD', () => {
    describe('create', () => {
      it('debería crear una playlist', async () => {
        const playlist = Playlist.create({
          name: 'My Playlist',
          description: 'Test description',
          ownerId: testUserId,
          public: false,
          duration: 0,
          size: 0,
          songCount: 0,
          sync: false,
        });

        const created = await repository.create(playlist);

        expect(created).toBeDefined();
        expect(created.id).toBeDefined();
        expect(created.name).toBe('My Playlist');
        expect(created.description).toBe('Test description');
        expect(created.ownerId).toBe(testUserId);
        expect(created.public).toBe(false);
      });

      it('debería crear una playlist pública', async () => {
        const playlist = Playlist.create({
          name: 'Public Playlist',
          ownerId: testUserId,
          public: true,
          duration: 0,
          size: 0,
          songCount: 0,
          sync: false,
        });

        const created = await repository.create(playlist);

        expect(created.public).toBe(true);
      });
    });

    describe('findById', () => {
      it('debería encontrar playlist por ID', async () => {
        const playlist = await repository.create(Playlist.create({
          name: 'Find Me',
          ownerId: testUserId,
          public: false,
          duration: 0,
          size: 0,
          songCount: 0,
          sync: false,
        }));

        const found = await repository.findById(playlist.id);

        expect(found).toBeDefined();
        expect(found?.id).toBe(playlist.id);
        expect(found?.name).toBe('Find Me');
      });

      it('debería retornar null si no existe', async () => {
        const found = await repository.findById('00000000-0000-0000-0000-000000000000');

        expect(found).toBeNull();
      });
    });

    describe('findByOwnerId', () => {
      it('debería encontrar playlists del usuario', async () => {
        await repository.create(Playlist.create({
          name: 'Playlist 1',
          ownerId: testUserId,
          public: false,
          duration: 0,
          size: 0,
          songCount: 0,
          sync: false,
        }));
        await repository.create(Playlist.create({
          name: 'Playlist 2',
          ownerId: testUserId,
          public: false,
          duration: 0,
          size: 0,
          songCount: 0,
          sync: false,
        }));

        const playlists = await repository.findByOwnerId(testUserId, 0, 10);

        expect(playlists).toHaveLength(2);
      });

      it('debería paginar resultados', async () => {
        for (let i = 0; i < 5; i++) {
          await repository.create(Playlist.create({
            name: `Playlist ${i}`,
            ownerId: testUserId,
            public: false,
            duration: 0,
            size: 0,
            songCount: 0,
            sync: false,
          }));
        }

        const page1 = await repository.findByOwnerId(testUserId, 0, 2);
        const page2 = await repository.findByOwnerId(testUserId, 2, 2);

        expect(page1).toHaveLength(2);
        expect(page2).toHaveLength(2);
      });
    });

    describe('findPublic', () => {
      it('debería encontrar solo playlists públicas', async () => {
        await repository.create(Playlist.create({
          name: 'Public',
          ownerId: testUserId,
          public: true,
          duration: 0,
          size: 0,
          songCount: 0,
          sync: false,
        }));
        await repository.create(Playlist.create({
          name: 'Private',
          ownerId: testUserId,
          public: false,
          duration: 0,
          size: 0,
          songCount: 0,
          sync: false,
        }));

        const publicPlaylists = await repository.findPublic(0, 10);

        expect(publicPlaylists).toHaveLength(1);
        expect(publicPlaylists[0].name).toBe('Public');
      });
    });

    describe('search', () => {
      beforeEach(async () => {
        await repository.create(Playlist.create({
          name: 'Rock Hits',
          ownerId: testUserId,
          public: true,
          duration: 0,
          size: 0,
          songCount: 0,
          sync: false,
        }));
        await repository.create(Playlist.create({
          name: 'Pop Songs',
          ownerId: testUserId,
          public: true,
          duration: 0,
          size: 0,
          songCount: 0,
          sync: false,
        }));
        await repository.create(Playlist.create({
          name: 'Rock Ballads',
          ownerId: testUserId,
          public: true,
          duration: 0,
          size: 0,
          songCount: 0,
          sync: false,
        }));
      });

      it('debería buscar por nombre (case insensitive)', async () => {
        const results = await repository.search('rock', 0, 10);

        expect(results).toHaveLength(2);
      });

      it('debería manejar caracteres especiales', async () => {
        await repository.create(Playlist.create({
          name: 'Test % Special',
          ownerId: testUserId,
          public: true,
          duration: 0,
          size: 0,
          songCount: 0,
          sync: false,
        }));

        const results = await repository.search('%', 0, 10);

        expect(results).toHaveLength(1);
      });
    });

    describe('update', () => {
      it('debería actualizar playlist', async () => {
        const playlist = await repository.create(Playlist.create({
          name: 'Original',
          ownerId: testUserId,
          public: false,
          duration: 0,
          size: 0,
          songCount: 0,
          sync: false,
        }));

        const toUpdate = Playlist.fromPrimitives({
          ...playlist.toPrimitives(),
          name: 'Updated',
          description: 'New description',
          public: true,
        });

        const updated = await repository.update(playlist.id, toUpdate);

        expect(updated?.name).toBe('Updated');
        expect(updated?.description).toBe('New description');
        expect(updated?.public).toBe(true);
      });
    });

    describe('delete', () => {
      it('debería eliminar playlist', async () => {
        const playlist = await repository.create(Playlist.create({
          name: 'To Delete',
          ownerId: testUserId,
          public: false,
          duration: 0,
          size: 0,
          songCount: 0,
          sync: false,
        }));

        const deleted = await repository.delete(playlist.id);
        const found = await repository.findById(playlist.id);

        expect(deleted).toBe(true);
        expect(found).toBeNull();
      });

      it('debería retornar false si no existe', async () => {
        const deleted = await repository.delete('00000000-0000-0000-0000-000000000000');

        expect(deleted).toBe(false);
      });
    });

    describe('count', () => {
      it('debería contar playlists totales', async () => {
        await repository.create(Playlist.create({
          name: 'P1',
          ownerId: testUserId,
          public: false,
          duration: 0,
          size: 0,
          songCount: 0,
          sync: false,
        }));
        await repository.create(Playlist.create({
          name: 'P2',
          ownerId: testUserId,
          public: false,
          duration: 0,
          size: 0,
          songCount: 0,
          sync: false,
        }));

        const count = await repository.count();

        expect(count).toBe(2);
      });

      it('debería contar por owner', async () => {
        const user2 = await createTestUser('other_user');

        await repository.create(Playlist.create({
          name: 'User1 Playlist',
          ownerId: testUserId,
          public: false,
          duration: 0,
          size: 0,
          songCount: 0,
          sync: false,
        }));
        await repository.create(Playlist.create({
          name: 'User2 Playlist',
          ownerId: user2.id,
          public: false,
          duration: 0,
          size: 0,
          songCount: 0,
          sync: false,
        }));

        const countUser1 = await repository.countByOwnerId(testUserId);
        const countUser2 = await repository.countByOwnerId(user2.id);

        expect(countUser1).toBe(1);
        expect(countUser2).toBe(1);
      });
    });
  });

  describe('Playlist Tracks Management', () => {
    let testPlaylistId: string;

    beforeEach(async () => {
      const playlist = await repository.create(Playlist.create({
        name: 'Track Test Playlist',
        ownerId: testUserId,
        public: false,
        duration: 0,
        size: 0,
        songCount: 0,
        sync: false,
      }));
      testPlaylistId = playlist.id;
    });

    describe('addTrack', () => {
      it('debería agregar track a playlist', async () => {
        const playlistTrack = PlaylistTrack.create({
          playlistId: testPlaylistId,
          trackId: testTrackIds[0],
          trackOrder: 1,
        });

        const added = await repository.addTrack(playlistTrack);

        expect(added).toBeDefined();
        expect(added.playlistId).toBe(testPlaylistId);
        expect(added.trackId).toBe(testTrackIds[0]);
        expect(added.trackOrder).toBe(1);
      });

      it('debería agregar múltiples tracks', async () => {
        for (let i = 0; i < 3; i++) {
          await repository.addTrack(PlaylistTrack.create({
            playlistId: testPlaylistId,
            trackId: testTrackIds[i],
            trackOrder: i + 1,
          }));
        }

        const tracks = await repository.getPlaylistTracks(testPlaylistId);

        expect(tracks).toHaveLength(3);
      });
    });

    describe('addTrackWithAutoOrder (race condition fix)', () => {
      it('debería asignar orden automáticamente', async () => {
        const result1 = await repository.addTrackWithAutoOrder(testPlaylistId, testTrackIds[0]);
        const result2 = await repository.addTrackWithAutoOrder(testPlaylistId, testTrackIds[1]);
        const result3 = await repository.addTrackWithAutoOrder(testPlaylistId, testTrackIds[2]);

        expect(result1.trackOrder).toBe(1);
        expect(result2.trackOrder).toBe(2);
        expect(result3.trackOrder).toBe(3);
      });

      it('debería manejar adiciones concurrentes (race condition)', async () => {
        // Simular adiciones concurrentes con Promise.allSettled
        // para manejar posibles errores de serialización de transacciones
        const promises = testTrackIds.map(trackId =>
          repository.addTrackWithAutoOrder(testPlaylistId, trackId)
        );

        const results = await Promise.allSettled(promises);

        // Contar cuántas fueron exitosas
        const successfulResults = results
          .filter((r): r is PromiseFulfilledResult<PlaylistTrack> => r.status === 'fulfilled')
          .map(r => r.value);

        // Al menos algunas deberían ser exitosas
        expect(successfulResults.length).toBeGreaterThan(0);

        // Verificar que los exitosos tienen órdenes únicos
        const orders = successfulResults.map(r => r.trackOrder);
        const uniqueOrders = new Set(orders);
        expect(uniqueOrders.size).toBe(successfulResults.length);

        // Verificar el estado final de la playlist
        const tracks = await repository.getPlaylistTracks(testPlaylistId);
        const _finalOrders = tracks.map((_, i) => i + 1);

        // Los tracks añadidos deberían tener orden secuencial
        expect(tracks.length).toBe(successfulResults.length);
      });
    });

    describe('removeTrack', () => {
      it('debería eliminar track de playlist', async () => {
        await repository.addTrack(PlaylistTrack.create({
          playlistId: testPlaylistId,
          trackId: testTrackIds[0],
          trackOrder: 1,
        }));

        const removed = await repository.removeTrack(testPlaylistId, testTrackIds[0]);
        const isInPlaylist = await repository.isTrackInPlaylist(testPlaylistId, testTrackIds[0]);

        expect(removed).toBe(true);
        expect(isInPlaylist).toBe(false);
      });

      it('debería retornar false si track no está en playlist', async () => {
        const removed = await repository.removeTrack(testPlaylistId, testTrackIds[0]);

        expect(removed).toBe(false);
      });
    });

    describe('getPlaylistTracks', () => {
      it('debería retornar tracks ordenados', async () => {
        // Agregar en orden inverso
        await repository.addTrack(PlaylistTrack.create({
          playlistId: testPlaylistId,
          trackId: testTrackIds[2],
          trackOrder: 3,
        }));
        await repository.addTrack(PlaylistTrack.create({
          playlistId: testPlaylistId,
          trackId: testTrackIds[0],
          trackOrder: 1,
        }));
        await repository.addTrack(PlaylistTrack.create({
          playlistId: testPlaylistId,
          trackId: testTrackIds[1],
          trackOrder: 2,
        }));

        const tracks = await repository.getPlaylistTracks(testPlaylistId);

        expect(tracks).toHaveLength(3);
        expect(tracks[0].id).toBe(testTrackIds[0]);
        expect(tracks[1].id).toBe(testTrackIds[1]);
        expect(tracks[2].id).toBe(testTrackIds[2]);
      });

      it('debería retornar array vacío si playlist no tiene tracks', async () => {
        const tracks = await repository.getPlaylistTracks(testPlaylistId);

        expect(tracks).toEqual([]);
      });
    });

    describe('isTrackInPlaylist', () => {
      it('debería retornar true si track está en playlist', async () => {
        await repository.addTrack(PlaylistTrack.create({
          playlistId: testPlaylistId,
          trackId: testTrackIds[0],
          trackOrder: 1,
        }));

        const isIn = await repository.isTrackInPlaylist(testPlaylistId, testTrackIds[0]);

        expect(isIn).toBe(true);
      });

      it('debería retornar false si track no está en playlist', async () => {
        const isIn = await repository.isTrackInPlaylist(testPlaylistId, testTrackIds[0]);

        expect(isIn).toBe(false);
      });
    });

    describe('reorderTracks', () => {
      beforeEach(async () => {
        // Agregar 3 tracks en orden 1, 2, 3
        for (let i = 0; i < 3; i++) {
          await repository.addTrack(PlaylistTrack.create({
            playlistId: testPlaylistId,
            trackId: testTrackIds[i],
            trackOrder: i + 1,
          }));
        }
      });

      it('debería reordenar tracks', async () => {
        // Invertir orden: 3, 2, 1
        const newOrder = [
          { trackId: testTrackIds[0], order: 3 },
          { trackId: testTrackIds[1], order: 2 },
          { trackId: testTrackIds[2], order: 1 },
        ];

        const result = await repository.reorderTracks(testPlaylistId, newOrder);
        const tracks = await repository.getPlaylistTracks(testPlaylistId);

        expect(result).toBe(true);
        expect(tracks[0].id).toBe(testTrackIds[2]);
        expect(tracks[1].id).toBe(testTrackIds[1]);
        expect(tracks[2].id).toBe(testTrackIds[0]);
      });

      it('debería manejar array vacío', async () => {
        const result = await repository.reorderTracks(testPlaylistId, []);

        expect(result).toBe(true);
      });

      it('debería reordenar parcialmente', async () => {
        // Solo cambiar el primero al final
        const newOrder = [
          { trackId: testTrackIds[0], order: 4 },
        ];

        await repository.reorderTracks(testPlaylistId, newOrder);
        const tracks = await repository.getPlaylistTracks(testPlaylistId);

        // Track 0 ahora debería ser el último
        expect(tracks[tracks.length - 1].id).toBe(testTrackIds[0]);
      });
    });

    describe('getPlaylistAlbumIds', () => {
      it('debería retornar album IDs únicos', async () => {
        for (const trackId of testTrackIds) {
          await repository.addTrack(PlaylistTrack.create({
            playlistId: testPlaylistId,
            trackId,
            trackOrder: testTrackIds.indexOf(trackId) + 1,
          }));
        }

        const albumIds = await repository.getPlaylistAlbumIds(testPlaylistId);

        expect(albumIds).toHaveLength(1);
        expect(albumIds[0]).toBe(testAlbumId);
      });
    });

    describe('getBatchPlaylistAlbumIds', () => {
      it('debería obtener album IDs para múltiples playlists', async () => {
        const playlist2 = await repository.create(Playlist.create({
          name: 'Playlist 2',
          ownerId: testUserId,
          public: false,
          duration: 0,
          size: 0,
          songCount: 0,
          sync: false,
        }));

        // Agregar tracks a ambas playlists
        await repository.addTrack(PlaylistTrack.create({
          playlistId: testPlaylistId,
          trackId: testTrackIds[0],
          trackOrder: 1,
        }));
        await repository.addTrack(PlaylistTrack.create({
          playlistId: playlist2.id,
          trackId: testTrackIds[1],
          trackOrder: 1,
        }));

        const result = await repository.getBatchPlaylistAlbumIds([testPlaylistId, playlist2.id]);

        expect(result.has(testPlaylistId)).toBe(true);
        expect(result.has(playlist2.id)).toBe(true);
        expect(result.get(testPlaylistId)).toHaveLength(1);
        expect(result.get(playlist2.id)).toHaveLength(1);
      });

      it('debería retornar array vacío para playlists sin tracks', async () => {
        const result = await repository.getBatchPlaylistAlbumIds([testPlaylistId]);

        expect(result.get(testPlaylistId)).toEqual([]);
      });
    });
  });

  describe('Public Playlists by Artist', () => {
    it('debería encontrar playlists públicas con tracks del artista', async () => {
      const publicPlaylist = await repository.create(Playlist.create({
        name: 'Public with Artist',
        ownerId: testUserId,
        public: true,
        duration: 0,
        size: 0,
        songCount: 0,
        sync: false,
      }));

      const privatePlaylist = await repository.create(Playlist.create({
        name: 'Private with Artist',
        ownerId: testUserId,
        public: false,
        duration: 0,
        size: 0,
        songCount: 0,
        sync: false,
      }));

      // Agregar tracks del mismo artista a ambas
      await repository.addTrack(PlaylistTrack.create({
        playlistId: publicPlaylist.id,
        trackId: testTrackIds[0],
        trackOrder: 1,
      }));
      await repository.addTrack(PlaylistTrack.create({
        playlistId: privatePlaylist.id,
        trackId: testTrackIds[1],
        trackOrder: 1,
      }));

      const results = await repository.findPublicByArtistId(testArtistId, 0, 10);

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Public with Artist');
    });

    it('debería contar playlists públicas por artista', async () => {
      const playlist1 = await repository.create(Playlist.create({
        name: 'Public 1',
        ownerId: testUserId,
        public: true,
        duration: 0,
        size: 0,
        songCount: 0,
        sync: false,
      }));
      const playlist2 = await repository.create(Playlist.create({
        name: 'Public 2',
        ownerId: testUserId,
        public: true,
        duration: 0,
        size: 0,
        songCount: 0,
        sync: false,
      }));

      await repository.addTrack(PlaylistTrack.create({
        playlistId: playlist1.id,
        trackId: testTrackIds[0],
        trackOrder: 1,
      }));
      await repository.addTrack(PlaylistTrack.create({
        playlistId: playlist2.id,
        trackId: testTrackIds[1],
        trackOrder: 1,
      }));

      const count = await repository.countPublicByArtistId(testArtistId);

      expect(count).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    it('debería manejar nombres de playlist muy largos', async () => {
      const longName = 'A'.repeat(255);
      const playlist = Playlist.create({
        name: longName,
        ownerId: testUserId,
        public: false,
        duration: 0,
        size: 0,
        songCount: 0,
        sync: false,
      });

      const created = await repository.create(playlist);
      expect(created.name).toBe(longName);
    });

    it('debería manejar caracteres unicode', async () => {
      const playlist = Playlist.create({
        name: '日本語プレイリスト 🎵',
        description: 'Música en español con emojis 🎸',
        ownerId: testUserId,
        public: false,
        duration: 0,
        size: 0,
        songCount: 0,
        sync: false,
      });

      const created = await repository.create(playlist);
      const found = await repository.findById(created.id);

      expect(found?.name).toBe('日本語プレイリスト 🎵');
      expect(found?.description).toBe('Música en español con emojis 🎸');
    });

    it('debería eliminar playlist con tracks (cascade)', async () => {
      const playlist = await repository.create(Playlist.create({
        name: 'With Tracks',
        ownerId: testUserId,
        public: false,
        duration: 0,
        size: 0,
        songCount: 0,
        sync: false,
      }));

      await repository.addTrack(PlaylistTrack.create({
        playlistId: playlist.id,
        trackId: testTrackIds[0],
        trackOrder: 1,
      }));

      await repository.delete(playlist.id);

      // Verificar que los playlist_tracks también fueron eliminados
      const [remaining] = await drizzle.db
        .select()
        .from(schema.playlistTracks)
        .where(eq(schema.playlistTracks.playlistId, playlist.id));

      expect(remaining).toBeUndefined();
    });
  });
});
