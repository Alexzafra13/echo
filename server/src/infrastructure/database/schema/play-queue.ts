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
    userId: varchar('user_id', { length: 36 }).notNull().unique(),
    currentTrackId: varchar('current_track_id', { length: 36 }),
    position: bigint('position', { mode: 'bigint' }).default(BigInt(0)).notNull(),
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
    queueId: varchar('queue_id', { length: 36 }).notNull(),
    trackId: varchar('track_id', { length: 36 }).notNull(),
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
