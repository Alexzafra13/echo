import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  bigint,
  index,
  unique,
} from 'drizzle-orm/pg-core';

// ============================================
// PlayQueue
// ============================================
export const playQueues = pgTable(
  'play_queue',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().unique(),
    currentTrackId: uuid('current_track_id'),
    position: bigint('position', { mode: 'number' }).default(0).notNull(),
    changedBy: varchar('changed_by', { length: 255 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
);

// ============================================
// PlayQueueTrack
// ============================================
export const playQueueTracks = pgTable(
  'play_queue_tracks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    queueId: uuid('queue_id').notNull(),
    trackId: uuid('track_id').notNull(),
    queueOrder: integer('queue_order').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    unique('play_queue_tracks_queue_order_unique').on(table.queueId, table.queueOrder),
    index('idx_play_queue_tracks_queue').on(table.queueId, table.queueOrder),
  ],
);

// Type exports
export type PlayQueue = typeof playQueues.$inferSelect;
export type NewPlayQueue = typeof playQueues.$inferInsert;
export type PlayQueueTrack = typeof playQueueTracks.$inferSelect;
export type NewPlayQueueTrack = typeof playQueueTracks.$inferInsert;
