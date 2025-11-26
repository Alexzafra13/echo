import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
  bigint,
  text,
  index,
  unique,
} from 'drizzle-orm/pg-core';

// ============================================
// Playlist
// ============================================
export const playlists = pgTable(
  'playlists',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    coverImageUrl: varchar('cover_image_url', { length: 512 }),
    duration: integer('duration').default(0).notNull(),
    size: bigint('size', { mode: 'bigint' }).default(BigInt(0)).notNull(),
    ownerId: varchar('owner_id', { length: 36 }).notNull(),
    public: boolean('public').default(false).notNull(),
    songCount: integer('song_count').default(0).notNull(),
    path: varchar('path', { length: 512 }),
    sync: boolean('sync').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_playlists_owner').on(table.ownerId),
  ],
);

// ============================================
// PlaylistTrack
// ============================================
export const playlistTracks = pgTable(
  'playlist_tracks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    playlistId: varchar('playlist_id', { length: 36 }).notNull(),
    trackId: varchar('track_id', { length: 36 }).notNull(),
    trackOrder: integer('track_order').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    unique('playlist_tracks_playlist_order_unique').on(table.playlistId, table.trackOrder),
    index('idx_playlist_tracks_playlist').on(table.playlistId, table.trackOrder),
  ],
);

// Type exports
export type Playlist = typeof playlists.$inferSelect;
export type NewPlaylist = typeof playlists.$inferInsert;
export type PlaylistTrack = typeof playlistTracks.$inferSelect;
export type NewPlaylistTrack = typeof playlistTracks.$inferInsert;
