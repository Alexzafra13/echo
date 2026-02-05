import {
  pgTable,
  uuid,
  varchar,
  integer,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core';
import { artists } from './artists';
import { albums } from './albums';
import { tracks } from './tracks';

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
  (table) => [
    index('idx_genres_name').on(table.name),
  ],
);

// ============================================
// ArtistGenre (junction table)
// ============================================
export const artistGenres = pgTable(
  'artist_genres',
  {
    artistId: uuid('artist_id').notNull().references(() => artists.id, { onDelete: 'cascade' }),
    genreId: uuid('genre_id').notNull().references(() => genres.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.artistId, table.genreId] }),
    index('idx_artist_genres_genre').on(table.genreId),
    index('idx_artist_genres_artist').on(table.artistId),
  ],
);

// ============================================
// AlbumGenre (junction table)
// ============================================
export const albumGenres = pgTable(
  'album_genres',
  {
    albumId: uuid('album_id').notNull().references(() => albums.id, { onDelete: 'cascade' }),
    genreId: uuid('genre_id').notNull().references(() => genres.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.albumId, table.genreId] }),
    index('idx_album_genres_genre').on(table.genreId),
    index('idx_album_genres_album').on(table.albumId),
  ],
);

// ============================================
// TrackGenre (junction table)
// ============================================
export const trackGenres = pgTable(
  'track_genres',
  {
    trackId: uuid('track_id').notNull().references(() => tracks.id, { onDelete: 'cascade' }),
    genreId: uuid('genre_id').notNull().references(() => genres.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.trackId, table.genreId] }),
    index('idx_track_genres_genre').on(table.genreId),
    index('idx_track_genres_track').on(table.trackId),
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
