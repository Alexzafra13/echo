import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
  bigint,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { tracks } from './tracks';

// ============================================
// PlayQueue
// ============================================
export const playQueues = pgTable(
  'play_queue',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
    currentTrackId: uuid('current_track_id').references(() => tracks.id, { onDelete: 'set null' }),
    position: bigint('position', { mode: 'number' }).default(0).notNull(),
    changedBy: varchar('changed_by', { length: 255 }),
    // Social feature: track if user is actively listening
    isPlaying: boolean('is_playing').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    // Index for finding active listeners (social "listening now" feature)
    index('idx_play_queue_is_playing').on(table.isPlaying, table.updatedAt),
  ],
);

// ============================================
// PlayQueueTrack
// ============================================
export const playQueueTracks = pgTable(
  'play_queue_tracks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    queueId: uuid('queue_id').notNull().references(() => playQueues.id, { onDelete: 'cascade' }),
    trackId: uuid('track_id').notNull().references(() => tracks.id, { onDelete: 'cascade' }),
    queueOrder: integer('queue_order').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    unique('play_queue_tracks_queue_order_unique').on(table.queueId, table.queueOrder),
    index('idx_play_queue_tracks_queue').on(table.queueId, table.queueOrder),
    index('idx_play_queue_tracks_track').on(table.trackId),
  ],
);

// Type exports
export type PlayQueue = typeof playQueues.$inferSelect;
export type NewPlayQueue = typeof playQueues.$inferInsert;
export type PlayQueueTrack = typeof playQueueTracks.$inferSelect;
export type NewPlayQueueTrack = typeof playQueueTracks.$inferInsert;
