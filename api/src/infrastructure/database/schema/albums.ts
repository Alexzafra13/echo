import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
  bigint,
  text,
  date,
  index,
} from 'drizzle-orm/pg-core';
import { artists } from './artists';

// ============================================
// Album
// ============================================
export const albums = pgTable(
  'albums',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Persistent ID (PID) - Navidrome-style stable identifier
    // Uses: mbzAlbumId if available, otherwise hash(artistId + name + year)
    // Enables: stable identity when metadata changes, preserves ratings/plays
    pid: varchar('pid', { length: 64 }).unique(),
    name: varchar('name', { length: 255 }).notNull(),
    albumArtistId: uuid('album_artist_id').references(() => artists.id, { onDelete: 'set null' }),
    artistId: uuid('artist_id').references(() => artists.id, { onDelete: 'set null' }),
    coverArtPath: varchar('cover_art_path', { length: 512 }),
    externalCoverPath: varchar('external_cover_path', { length: 512 }),
    externalCoverSource: varchar('external_cover_source', { length: 50 }),
    year: integer('year'),
    releaseDate: date('release_date'),
    originalDate: date('original_date'),
    compilation: boolean('compilation').default(false).notNull(),
    songCount: integer('song_count').default(0).notNull(),
    duration: integer('duration').default(0).notNull(),
    size: bigint('size', { mode: 'number' }).default(0).notNull(),
    mbzAlbumId: varchar('mbz_album_id', { length: 36 }),
    mbzAlbumArtistId: varchar('mbz_album_artist_id', { length: 36 }),
    mbzAlbumType: varchar('mbz_album_type', { length: 100 }),
    mbidSearchedAt: timestamp('mbid_searched_at'),
    catalogNum: varchar('catalog_num', { length: 255 }),
    comment: varchar('comment', { length: 255 }),
    orderAlbumName: varchar('order_album_name', { length: 255 }),
    orderAlbumArtistName: varchar('order_album_artist_name', { length: 255 }),
    sortAlbumName: varchar('sort_album_name', { length: 255 }),
    sortArtistName: varchar('sort_artist_name', { length: 255 }),
    sortAlbumArtistName: varchar('sort_album_artist_name', { length: 255 }),
    description: text('description'),
    externalUrl: varchar('external_url', { length: 512 }),
    externalInfoUpdatedAt: timestamp('external_info_updated_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_albums_pid').on(table.pid),
    index('idx_albums_artist').on(table.artistId),
    index('idx_albums_album_artist').on(table.albumArtistId),
    index('idx_albums_year').on(table.year),
    index('idx_albums_name').on(table.name),
    index('idx_albums_mbid').on(table.mbzAlbumId),
    index('idx_albums_artist_mbid').on(table.mbzAlbumArtistId),
  ],
);

// ============================================
// CustomAlbumCover
// ============================================
export const customAlbumCovers = pgTable(
  'custom_album_covers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    albumId: uuid('album_id').notNull().references(() => albums.id, { onDelete: 'cascade' }),
    filePath: varchar('file_path', { length: 512 }).notNull(),
    fileName: varchar('file_name', { length: 255 }).notNull(),
    fileSize: bigint('file_size', { mode: 'number' }).default(0).notNull(),
    mimeType: varchar('mime_type', { length: 50 }).notNull(),
    isActive: boolean('is_active').default(false).notNull(),
    uploadedBy: uuid('uploaded_by'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('custom_album_covers_album_id_idx').on(table.albumId),
    index('custom_album_covers_is_active_idx').on(table.isActive),
  ],
);

// Type exports
export type Album = typeof albums.$inferSelect;
export type NewAlbum = typeof albums.$inferInsert;
export type CustomAlbumCover = typeof customAlbumCovers.$inferSelect;
export type NewCustomAlbumCover = typeof customAlbumCovers.$inferInsert;
