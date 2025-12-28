import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerStorage, ThrottlerStorageRecord } from '@nestjs/throttler';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DrizzleService } from '../../../src/infrastructure/database/drizzle.service';
import { AppModule } from '../../../src/app.module';
import { WebSocketAdapter } from '../../../src/infrastructure/websocket/websocket.adapter';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import * as schema from '../../../src/infrastructure/database/schema';
import { libraryScans } from '../../../src/infrastructure/database/schema/system';
import request from 'supertest';

/**
 * Mock ThrottlerGuard que siempre permite requests (para E2E tests)
 */
class NoOpThrottlerGuard extends ThrottlerGuard {
  protected override async shouldSkip(): Promise<boolean> {
    return true; // Siempre skip throttling en tests
  }

  protected override async handleRequest(): Promise<boolean> {
    return true; // Siempre permitir
  }
}

/**
 * Mock ThrottlerStorage que nunca bloquea (para E2E tests)
 */
class NoOpThrottlerStorage implements ThrottlerStorage {
  async increment(): Promise<ThrottlerStorageRecord> {
    return { totalHits: 0, timeToExpire: 0, isBlocked: false, timeToBlockExpire: 0 };
  }
}

/**
 * Crea y configura la aplicación NestJS para E2E tests
 * con ThrottlerGuard deshabilitado
 */
export async function createTestApp(): Promise<{
  app: NestFastifyApplication;
  module: TestingModule;
  drizzle: DrizzleService;
}> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideGuard(ThrottlerGuard)
    .useClass(NoOpThrottlerGuard)
    .overrideProvider(ThrottlerStorage)
    .useClass(NoOpThrottlerStorage)
    .compile();

  const app = moduleFixture.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter(),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api');

  // Habilitar CORS para WebSocket tests
  app.enableCors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Habilitar WebSocket adapter para tests de WebSocket E2E
  app.useWebSocketAdapter(new WebSocketAdapter(app));

  // NOTE: MustChangePasswordGuard is NOT applied globally because it requires
  // JwtAuthGuard to run first to populate request.user. Since JwtAuthGuard is
  // per-controller, the global guard sees undefined user. This needs architectural
  // changes (convert to interceptor or make JwtAuthGuard global with @Public()).

  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  const drizzle = moduleFixture.get<DrizzleService>(DrizzleService);

  return { app, module: moduleFixture, drizzle };
}

/**
 * Helpers para tests E2E
 *
 * El proyecto usa Drizzle ORM (no Prisma) y NO tiene endpoint de registro público.
 * Los usuarios se crean:
 * 1. Directamente en la BD para setup de tests
 * 2. Via admin panel en producción
 */

/**
 * Crea un usuario de prueba directamente en la BD
 */
export async function createTestUser(
  drizzle: DrizzleService,
  data: {
    username: string;
    password: string;
    name?: string;
    isAdmin?: boolean;
    isActive?: boolean;
    mustChangePassword?: boolean;
  },
): Promise<{ id: string; username: string }> {
  const passwordHash = await bcrypt.hash(data.password, 12);

  const [user] = await drizzle.db
    .insert(schema.users)
    .values({
      username: data.username,
      passwordHash,
      name: data.name || data.username,
      isAdmin: data.isAdmin ?? false,
      isActive: data.isActive ?? true,
      mustChangePassword: data.mustChangePassword ?? false,
      theme: 'dark',
      language: 'es',
      isPublicProfile: false,
      showTopTracks: true,
      showTopArtists: true,
      showTopAlbums: true,
      showPlaylists: true,
    })
    .returning({ id: schema.users.id, username: schema.users.username });

  return user;
}

/**
 * Obtiene tokens de autenticación para un usuario
 */
export async function loginUser(
  app: INestApplication,
  username: string,
  password: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const response = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ username, password })
    .expect(200);

  return {
    accessToken: response.body.accessToken,
    refreshToken: response.body.refreshToken,
  };
}

/**
 * Crea un usuario admin y obtiene sus tokens
 */
export async function createAdminAndLogin(
  drizzle: DrizzleService,
  app: INestApplication,
  options?: { username?: string; password?: string },
): Promise<{
  user: { id: string; username: string };
  accessToken: string;
  refreshToken: string;
}> {
  const username = options?.username || 'admin';
  const password = options?.password || 'Admin123!';

  const user = await createTestUser(drizzle, {
    username,
    password,
    name: 'Admin User',
    isAdmin: true,
    mustChangePassword: false,
  });

  const tokens = await loginUser(app, username, password);

  return { user, ...tokens };
}

/**
 * Crea un usuario regular y obtiene sus tokens
 */
export async function createUserAndLogin(
  drizzle: DrizzleService,
  app: INestApplication,
  options?: { username?: string; password?: string; name?: string },
): Promise<{
  user: { id: string; username: string };
  accessToken: string;
  refreshToken: string;
}> {
  const username = options?.username || 'testuser';
  const password = options?.password || 'Test123!';

  const user = await createTestUser(drizzle, {
    username,
    password,
    name: options?.name || 'Test User',
    isAdmin: false,
    mustChangePassword: false,
  });

  const tokens = await loginUser(app, username, password);

  return { user, ...tokens };
}

/**
 * Limpia todas las tablas relacionadas con usuarios
 */
export async function cleanUserTables(drizzle: DrizzleService): Promise<void> {
  // Usar TRUNCATE CASCADE para limpiar todo de una vez (más robusto que DELETE)
  try {
    await drizzle.client.query(`
      TRUNCATE TABLE
        radio_stations,
        play_history,
        user_play_stats,
        user_starred,
        user_ratings,
        stream_tokens,
        users
      RESTART IDENTITY CASCADE
    `);
  } catch {
    // Fallback a DELETE si TRUNCATE falla (por ejemplo, si la tabla no existe)
    await drizzle.db.delete(schema.radioStations);
    await drizzle.db.delete(schema.playHistory);
    await drizzle.db.delete(schema.userPlayStats);
    await drizzle.db.delete(schema.userStarred);
    await drizzle.db.delete(schema.userRatings);
    await drizzle.db.delete(schema.streamTokens);
    await drizzle.db.delete(schema.users);
  }
}

/**
 * Limpia tablas de contenido (albums, artists, tracks)
 */
export async function cleanContentTables(drizzle: DrizzleService): Promise<void> {
  // Usar TRUNCATE CASCADE para limpiar todo de una vez
  try {
    await drizzle.client.query(`
      TRUNCATE TABLE
        playlist_tracks,
        playlists,
        track_artists,
        track_genres,
        tracks,
        album_genres,
        custom_album_covers,
        albums,
        artist_genres,
        custom_artist_images,
        artist_banners,
        artists,
        genres
      RESTART IDENTITY CASCADE
    `);
  } catch {
    // Fallback a DELETE si TRUNCATE falla
    await drizzle.db.delete(schema.playlistTracks);
    await drizzle.db.delete(schema.playlists);
    await drizzle.db.delete(schema.trackArtists);
    await drizzle.db.delete(schema.trackGenres);
    await drizzle.db.delete(schema.tracks);
    await drizzle.db.delete(schema.albumGenres);
    await drizzle.db.delete(schema.customAlbumCovers);
    await drizzle.db.delete(schema.albums);
    await drizzle.db.delete(schema.artistGenres);
    await drizzle.db.delete(schema.customArtistImages);
    await drizzle.db.delete(schema.artistBanners);
    await drizzle.db.delete(schema.artists);
    await drizzle.db.delete(schema.genres);
  }
}

/**
 * Limpia todas las tablas de prueba
 */
export async function cleanAllTables(drizzle: DrizzleService): Promise<void> {
  await cleanContentTables(drizzle);
  await cleanUserTables(drizzle);
  await cleanScannerTables(drizzle);
}

/**
 * Limpia tablas del scanner
 */
export async function cleanScannerTables(drizzle: DrizzleService): Promise<void> {
  await drizzle.db.delete(libraryScans);
}

/**
 * Crea un artista de prueba
 * Por defecto crea artistas con contenido (songCount > 0) para que aparezcan en listados
 */
export async function createTestArtist(
  drizzle: DrizzleService,
  data: {
    name: string;
    biography?: string;
    albumCount?: number;
    songCount?: number;
  },
): Promise<{ id: string; name: string }> {
  const [artist] = await drizzle.db
    .insert(schema.artists)
    .values({
      name: data.name,
      biography: data.biography,
      albumCount: data.albumCount ?? 1,
      songCount: data.songCount ?? 10,
      size: 0,
    })
    .returning({ id: schema.artists.id, name: schema.artists.name });

  return artist;
}

/**
 * Crea un álbum de prueba
 */
export async function createTestAlbum(
  drizzle: DrizzleService,
  data: {
    name: string;
    artistId?: string;
    year?: number;
    songCount?: number;
    duration?: number;
  },
): Promise<{ id: string; name: string }> {
  const [album] = await drizzle.db
    .insert(schema.albums)
    .values({
      name: data.name,
      artistId: data.artistId,
      year: data.year || 2024,
      songCount: data.songCount || 0,
      duration: data.duration || 0,
      size: 0,
      compilation: false,
    })
    .returning({ id: schema.albums.id, name: schema.albums.name });

  return album;
}

/**
 * Crea un track de prueba
 */
export async function createTestTrack(
  drizzle: DrizzleService,
  data: {
    title: string;
    path: string;
    albumId?: string;
    artistId?: string;
    duration?: number;
    trackNumber?: number;
    discNumber?: number;
  },
): Promise<{ id: string; title: string }> {
  const [track] = await drizzle.db
    .insert(schema.tracks)
    .values({
      title: data.title,
      path: data.path,
      albumId: data.albumId,
      artistId: data.artistId,
      duration: data.duration || 180,
      trackNumber: data.trackNumber || 1,
      discNumber: data.discNumber || 1,
      compilation: false,
    })
    .returning({ id: schema.tracks.id, title: schema.tracks.title });

  return track;
}

/**
 * Obtiene un usuario por username
 */
export async function getUserByUsername(
  drizzle: DrizzleService,
  username: string,
) {
  const [user] = await drizzle.db
    .select()
    .from(schema.users)
    .where(eq(schema.users.username, username))
    .limit(1);

  return user;
}

/**
 * Obtiene un usuario por ID
 */
export async function getUserById(
  drizzle: DrizzleService,
  id: string,
) {
  const [user] = await drizzle.db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, id))
    .limit(1);

  return user;
}

/**
 * Crea una playlist de prueba
 */
export async function createTestPlaylist(
  drizzle: DrizzleService,
  data: {
    name: string;
    ownerId: string;
    description?: string;
    isPublic?: boolean;
  },
): Promise<{ id: string; name: string }> {
  const [playlist] = await drizzle.db
    .insert(schema.playlists)
    .values({
      name: data.name,
      ownerId: data.ownerId,
      description: data.description,
      public: data.isPublic ?? false,
      duration: 0,
      size: 0,
      songCount: 0,
      sync: false,
    })
    .returning({ id: schema.playlists.id, name: schema.playlists.name });

  return playlist;
}

/**
 * Añade un track a una playlist
 */
export async function addTrackToPlaylist(
  drizzle: DrizzleService,
  playlistId: string,
  trackId: string,
  trackOrder: number,
): Promise<void> {
  await drizzle.db.insert(schema.playlistTracks).values({
    playlistId,
    trackId,
    trackOrder,
  });
}
