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
  real,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { albums } from './albums';
import { artists } from './artists';

// ============================================
// Track
// ============================================
export const tracks = pgTable(
  'tracks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: varchar('title', { length: 255 }).notNull(),
    albumId: uuid('album_id').references(() => albums.id, { onDelete: 'cascade' }),
    albumArtistId: uuid('album_artist_id').references(() => artists.id, { onDelete: 'set null' }),
    artistId: uuid('artist_id').references(() => artists.id, { onDelete: 'set null' }),
    hasCoverArt: boolean('has_cover_art').default(false).notNull(),
    trackNumber: integer('track_number'),
    discNumber: integer('disc_number').default(1).notNull(),
    discSubtitle: varchar('disc_subtitle', { length: 255 }),
    year: integer('year'),
    date: date('date'),
    originalDate: date('original_date'),
    releaseDate: date('release_date'),
    size: bigint('size', { mode: 'number' }),
    suffix: varchar('suffix', { length: 10 }),
    duration: integer('duration'),
    bitRate: integer('bit_rate'),
    channels: integer('channels'),
    fullText: text('full_text'),
    albumName: varchar('album_name', { length: 255 }),
    artistName: varchar('artist_name', { length: 255 }),
    albumArtistName: varchar('album_artist_name', { length: 255 }),
    compilation: boolean('compilation').default(false).notNull(),
    comment: varchar('comment', { length: 512 }),
    lyrics: text('lyrics'),
    sortTitle: varchar('sort_title', { length: 255 }),
    sortAlbumName: varchar('sort_album_name', { length: 255 }),
    sortArtistName: varchar('sort_artist_name', { length: 255 }),
    sortAlbumArtistName: varchar('sort_album_artist_name', { length: 255 }),
    orderTitle: varchar('order_title', { length: 255 }),
    orderAlbumName: varchar('order_album_name', { length: 255 }),
    orderArtistName: varchar('order_artist_name', { length: 255 }),
    orderAlbumArtistName: varchar('order_album_artist_name', { length: 255 }),
    mbzTrackId: varchar('mbz_track_id', { length: 36 }),
    mbzAlbumId: varchar('mbz_album_id', { length: 36 }),
    mbzArtistId: varchar('mbz_artist_id', { length: 36 }),
    mbzAlbumArtistId: varchar('mbz_album_artist_id', { length: 36 }),
    mbzReleaseTrackId: varchar('mbz_release_track_id', { length: 36 }),
    mbidSearchedAt: timestamp('mbid_searched_at'),
    catalogNum: varchar('catalog_num', { length: 255 }),
    path: varchar('path', { length: 512 }).notNull().unique(),
    bpm: integer('bpm'),
    rgAlbumGain: real('rg_album_gain'),
    rgAlbumPeak: real('rg_album_peak'),
    rgTrackGain: real('rg_track_gain'),
    rgTrackPeak: real('rg_track_peak'),
    lufsAnalyzedAt: timestamp('lufs_analyzed_at'), // null = pendiente, fecha = ya analizado
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    missingAt: timestamp('missing_at'), // null = presente, fecha = marcado como desaparecido
  },
  (table) => [
    index('idx_tracks_album').on(table.albumId),
    index('idx_tracks_artist').on(table.artistId),
    index('idx_tracks_title').on(table.title),
    index('idx_tracks_path').on(table.path),
    index('idx_tracks_album_track').on(table.albumId, table.trackNumber),
    index('idx_tracks_mbid').on(table.mbzTrackId),
    index('idx_tracks_artist_mbid').on(table.mbzArtistId),
    index('idx_tracks_album_mbid').on(table.mbzAlbumId),
    index('idx_tracks_missing').on(table.missingAt), // Para filtrar tracks desaparecidos
    index('idx_tracks_lufs').on(table.lufsAnalyzedAt), // For finding tracks pending LUFS analysis
  ],
);

// ============================================
// TrackArtist (junction table)
// ============================================
export const trackArtists = pgTable(
  'track_artists',
  {
    trackId: uuid('track_id').notNull().references(() => tracks.id, { onDelete: 'cascade' }),
    artistId: uuid('artist_id').notNull().references(() => artists.id, { onDelete: 'cascade' }),
    artistName: varchar('artist_name', { length: 255 }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.trackId, table.artistId] }),
    index('idx_track_artists_artist').on(table.artistId), // For reverse lookups: find all tracks by artist
  ],
);

// Type exports
export type Track = typeof tracks.$inferSelect;
export type NewTrack = typeof tracks.$inferInsert;
export type TrackArtist = typeof trackArtists.$inferSelect;
export type NewTrackArtist = typeof trackArtists.$inferInsert;
