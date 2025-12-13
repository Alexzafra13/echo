import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerStorage } from '@nestjs/throttler';
import { DrizzleService } from '../../../src/infrastructure/database/drizzle.service';
import { BullmqService } from '../../../src/infrastructure/queue/bullmq.service';
import { AppModule } from '../../../src/app.module';
import { eq, sql } from 'drizzle-orm';
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
}

/**
 * Crea y configura la aplicación NestJS para E2E tests
 * con ThrottlerGuard deshabilitado
 */
export async function createTestApp(): Promise<{
  app: INestApplication;
  module: TestingModule;
  drizzle: DrizzleService;
  bullmq: BullmqService;
}> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideGuard(ThrottlerGuard)
    .useClass(NoOpThrottlerGuard)
    .compile();

  const app = moduleFixture.createNestApplication();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api');

  await app.init();

  const drizzle = moduleFixture.get<DrizzleService>(DrizzleService);
  const bullmq = moduleFixture.get<BullmqService>(BullmqService);

  return { app, module: moduleFixture, drizzle, bullmq };
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
 *
 * Todas las FK a users tienen onDelete: 'cascade', por lo que eliminar
 * de users automáticamente elimina registros en tablas dependientes.
 * Sin embargo, primero limpiamos tablas que tienen FK tanto a users como
 * a content (como playlists y playHistory) para evitar conflictos de orden.
 */
export async function cleanUserTables(drizzle: DrizzleService): Promise<void> {
  // Primero limpiar tablas que tienen FK tanto a users como a content
  // playHistory tiene FK a users Y tracks, limpiamos explícitamente
  await drizzle.db.delete(schema.playHistory);

  // playQueueTracks tiene FK a playQueues Y tracks
  await drizzle.db.delete(schema.playQueueTracks);
  await drizzle.db.delete(schema.playQueues);

  // playlists y playlistTracks tienen FK a users Y tracks
  await drizzle.db.delete(schema.playlistTracks);
  await drizzle.db.delete(schema.playlists);

  // Ahora eliminar users - esto cascadeará a todas las demás tablas dependientes:
  // - federationAccessTokens, federationTokens, connectedServers, albumImportQueue
  // - userPlayStats, userStarred, userRatings
  // - friendships
  // - shares, bookmarks
  // - radioStations
  // - players
  // - streamTokens
  await drizzle.db.delete(schema.users);
}

/**
 * Limpia tablas de contenido (albums, artists, tracks)
 *
 * NOTA: playlists y playlistTracks se limpian en cleanUserTables
 * porque tienen FK a users y necesitan limpiarse antes de users.
 */
export async function cleanContentTables(drizzle: DrizzleService): Promise<void> {
  // trackArtists tiene FK a tracks Y artists
  await drizzle.db.delete(schema.trackArtists);

  // Genre junction tables (FK to artists, albums, tracks, genres)
  await drizzle.db.delete(schema.trackGenres);
  await drizzle.db.delete(schema.albumGenres);
  await drizzle.db.delete(schema.artistGenres);

  // Tracks (FK to albums, artists con cascade/set null)
  await drizzle.db.delete(schema.tracks);

  // Custom covers/images (FK to albums/artists)
  await drizzle.db.delete(schema.customAlbumCovers);
  await drizzle.db.delete(schema.albums);
  await drizzle.db.delete(schema.customArtistImages);
  await drizzle.db.delete(schema.artistBanners);
  await drizzle.db.delete(schema.artists);

  // Genres no tiene FK salvo las junction tables ya limpias
  await drizzle.db.delete(schema.genres);
}

/**
 * Limpia todas las tablas de prueba
 *
 * ORDEN IMPORTANTE:
 * 1. Users primero - cascadea a playlists, playHistory, etc.
 * 2. Content después - tracks, albums, artists
 * 3. Scanner al final
 */
export async function cleanAllTables(drizzle: DrizzleService): Promise<void> {
  await cleanUserTables(drizzle);
  await cleanContentTables(drizzle);
  await cleanScannerTables(drizzle);
}

/**
 * Limpia tablas del scanner
 */
export async function cleanScannerTables(drizzle: DrizzleService): Promise<void> {
  await drizzle.db.delete(libraryScans);
}

/**
 * Limpia las colas de BullMQ para evitar jobs huérfanos entre tests
 */
export async function cleanQueues(bullmq: BullmqService): Promise<void> {
  await bullmq.obliterateAllQueues();
}

/**
 * Crea un artista de prueba
 * Por defecto songCount=1 para que aparezca en listados (se filtran artistas sin contenido)
 */
export async function createTestArtist(
  drizzle: DrizzleService,
  data: {
    name: string;
    biography?: string;
    songCount?: number;
    albumCount?: number;
  },
): Promise<{ id: string; name: string }> {
  const [artist] = await drizzle.db
    .insert(schema.artists)
    .values({
      name: data.name,
      biography: data.biography,
      albumCount: data.albumCount ?? 1,
      songCount: data.songCount ?? 1,
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
