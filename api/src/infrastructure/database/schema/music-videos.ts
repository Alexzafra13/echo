import { pgTable, uuid, varchar, integer, bigint, timestamp, index } from 'drizzle-orm/pg-core';
import { tracks } from './tracks';

// ============================================
// MusicVideo
// ============================================
export const musicVideos = pgTable(
  'music_videos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    trackId: uuid('track_id')
      .references(() => tracks.id, { onDelete: 'set null' })
      .unique(),
    path: varchar('path', { length: 512 }).notNull().unique(),
    title: varchar('title', { length: 255 }),
    artistName: varchar('artist_name', { length: 255 }),
    duration: integer('duration'),
    width: integer('width'),
    height: integer('height'),
    codec: varchar('codec', { length: 50 }),
    bitRate: integer('bit_rate'),
    size: bigint('size', { mode: 'number' }),
    suffix: varchar('suffix', { length: 10 }),
    thumbnailPath: varchar('thumbnail_path', { length: 512 }),
    matchMethod: varchar('match_method', { length: 20 }), // 'filename' | 'metadata' | 'manual' | null
    missingAt: timestamp('missing_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_music_videos_track').on(table.trackId),
    index('idx_music_videos_path').on(table.path),
  ]
);

// Type exports
export type MusicVideo = typeof musicVideos.$inferSelect;
export type NewMusicVideo = typeof musicVideos.$inferInsert;
