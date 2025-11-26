import {
  pgTable,
  uuid,
  varchar,
  integer,
  primaryKey,
} from 'drizzle-orm/pg-core';

// ============================================
// Genre
// ============================================
export const genres = pgTable(
  'genres',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull().unique(),
    albumCount: integer('album_count').default(0).notNull(),
    songCount: integer('song_count').default(0).notNull(),
  },
);

// ============================================
// ArtistGenre (junction table)
// ============================================
export const artistGenres = pgTable(
  'artist_genres',
  {
    artistId: uuid('artist_id').notNull(),
    genreId: uuid('genre_id').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.artistId, table.genreId] }),
  ],
);

// ============================================
// AlbumGenre (junction table)
// ============================================
export const albumGenres = pgTable(
  'album_genres',
  {
    albumId: uuid('album_id').notNull(),
    genreId: uuid('genre_id').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.albumId, table.genreId] }),
  ],
);

// ============================================
// TrackGenre (junction table)
// ============================================
export const trackGenres = pgTable(
  'track_genres',
  {
    trackId: uuid('track_id').notNull(),
    genreId: uuid('genre_id').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.trackId, table.genreId] }),
  ],
);

// Type exports
export type Genre = typeof genres.$inferSelect;
export type NewGenre = typeof genres.$inferInsert;
export type ArtistGenre = typeof artistGenres.$inferSelect;
export type NewArtistGenre = typeof artistGenres.$inferInsert;
export type AlbumGenre = typeof albumGenres.$inferSelect;
export type NewAlbumGenre = typeof albumGenres.$inferInsert;
export type TrackGenre = typeof trackGenres.$inferSelect;
export type NewTrackGenre = typeof trackGenres.$inferInsert;
