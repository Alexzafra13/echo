import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  index,
  boolean,
  integer,
  bigint,
  text,
  jsonb,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

// ============================================
// Connected Servers (Servidores de amigos)
// ============================================
// Stores connections to friend's Echo servers
export const connectedServers = pgTable(
  'connected_servers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(), // Nombre del amigo/servidor
    baseUrl: varchar('base_url', { length: 512 }).notNull(), // URL del servidor
    authToken: varchar('auth_token', { length: 512 }).notNull(), // Token de autenticación
    isActive: boolean('is_active').default(true).notNull(),
    // Online status
    isOnline: boolean('is_online').default(false).notNull(),
    lastOnlineAt: timestamp('last_online_at'),
    lastCheckedAt: timestamp('last_checked_at'),
    // Stats del servidor remoto (cacheadas)
    remoteAlbumCount: integer('remote_album_count').default(0).notNull(),
    remoteTrackCount: integer('remote_track_count').default(0).notNull(),
    remoteArtistCount: integer('remote_artist_count').default(0).notNull(),
    lastSyncAt: timestamp('last_sync_at'),
    lastErrorAt: timestamp('last_error_at'),
    lastError: text('last_error'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_connected_servers_user').on(table.userId),
    index('idx_connected_servers_active').on(table.isActive),
  ],
);

// ============================================
// Federation Tokens (Códigos de invitación)
// ============================================
// Tokens to invite other servers to connect
export const federationTokens = pgTable(
  'federation_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdByUserId: uuid('created_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: varchar('token', { length: 64 }).notNull().unique(),
    name: varchar('name', { length: 100 }), // Nombre descriptivo opcional
    isUsed: boolean('is_used').default(false).notNull(),
    usedByServerName: varchar('used_by_server_name', { length: 100 }),
    usedByIp: varchar('used_by_ip', { length: 45 }),
    usedAt: timestamp('used_at'),
    expiresAt: timestamp('expires_at').notNull(),
    maxUses: integer('max_uses').default(1).notNull(),
    currentUses: integer('current_uses').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_federation_tokens_token').on(table.token),
    index('idx_federation_tokens_created_by').on(table.createdByUserId),
    index('idx_federation_tokens_expires').on(table.expiresAt),
  ],
);

// ============================================
// Federation Access Tokens (Acceso de servidores conectados)
// ============================================
// Long-lived tokens for connected servers to access our library
export const federationAccessTokens = pgTable(
  'federation_access_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: varchar('token', { length: 512 }).notNull().unique(),
    serverName: varchar('server_name', { length: 100 }).notNull(), // Nombre del servidor que usa este token
    serverUrl: varchar('server_url', { length: 512 }), // URL del servidor conectado
    permissions: jsonb('permissions').$type<FederationPermissions>().default({
      canBrowse: true,
      canStream: true,
      canDownload: false,
    }).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    lastUsedAt: timestamp('last_used_at'),
    lastUsedIp: varchar('last_used_ip', { length: 45 }),
    expiresAt: timestamp('expires_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_federation_access_tokens_token').on(table.token),
    index('idx_federation_access_tokens_owner').on(table.ownerId),
    index('idx_federation_access_tokens_active').on(table.isActive),
  ],
);

// ============================================
// Album Import Queue (Cola de descarga de álbumes)
// ============================================
// Queue for downloading albums from connected servers
export const albumImportQueue = pgTable(
  'album_import_queue',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    connectedServerId: uuid('connected_server_id')
      .notNull()
      .references(() => connectedServers.id, { onDelete: 'cascade' }),
    remoteAlbumId: varchar('remote_album_id', { length: 36 }).notNull(),
    albumName: varchar('album_name', { length: 255 }).notNull(),
    artistName: varchar('artist_name', { length: 255 }),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    progress: integer('progress').default(0).notNull(), // 0-100
    totalTracks: integer('total_tracks').default(0).notNull(),
    downloadedTracks: integer('downloaded_tracks').default(0).notNull(),
    totalSize: bigint('total_size', { mode: 'number' }).default(0).notNull(),
    downloadedSize: bigint('downloaded_size', { mode: 'number' }).default(0).notNull(),
    errorMessage: text('error_message'),
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_album_import_queue_user').on(table.userId),
    index('idx_album_import_queue_server').on(table.connectedServerId),
    index('idx_album_import_queue_status').on(table.status),
    check('valid_import_status', sql`${table.status} IN ('pending', 'downloading', 'completed', 'failed', 'cancelled')`),
  ],
);

// ============================================
// Types
// ============================================

export interface FederationPermissions {
  canBrowse: boolean; // Puede ver la biblioteca
  canStream: boolean; // Puede hacer streaming
  canDownload: boolean; // Puede descargar álbumes completos
}

export type ConnectedServer = typeof connectedServers.$inferSelect;
export type NewConnectedServer = typeof connectedServers.$inferInsert;

export type FederationToken = typeof federationTokens.$inferSelect;
export type NewFederationToken = typeof federationTokens.$inferInsert;

export type FederationAccessToken = typeof federationAccessTokens.$inferSelect;
export type NewFederationAccessToken = typeof federationAccessTokens.$inferInsert;

export type AlbumImportQueue = typeof albumImportQueue.$inferSelect;
export type NewAlbumImportQueue = typeof albumImportQueue.$inferInsert;

export type ImportStatus = 'pending' | 'downloading' | 'completed' | 'failed' | 'cancelled';
