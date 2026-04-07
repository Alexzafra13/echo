import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
  bigint,
  real,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { tracks } from './tracks';

// ============================================
// UserRating
// ============================================
export const userRatings = pgTable(
  'user_ratings',
  {
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    itemId: uuid('item_id').notNull(), // Polymorphic: can reference tracks, albums, artists
    itemType: varchar('item_type', { length: 50 }).notNull(),
    rating: integer('rating').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.itemId, table.itemType] }),
    index('idx_user_ratings_user').on(table.userId),
    index('idx_ratings_item').on(table.itemId, table.itemType),
  ],
);

// ============================================
// PlayHistory
// ============================================
export const playHistory = pgTable(
  'play_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    trackId: uuid('track_id').notNull().references(() => tracks.id, { onDelete: 'cascade' }),
    playedAt: timestamp('played_at').notNull(),
    client: varchar('client', { length: 255 }),
    playContext: varchar('play_context', { length: 50 }).default('direct').notNull(),
    completionRate: real('completion_rate'),
    skipped: boolean('skipped').default(false).notNull(),
    sourceId: uuid('source_id'),
    sourceType: varchar('source_type', { length: 50 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_play_history_user_date').on(table.userId, table.playedAt),
    index('idx_play_history_track').on(table.trackId),
    index('idx_play_history_played_at').on(table.playedAt),
    index('idx_play_history_context').on(table.userId, table.playContext),
    index('idx_play_history_source').on(table.sourceId, table.sourceType),
  ],
);

// ============================================
// UserPlayStats
// ============================================
export const userPlayStats = pgTable(
  'user_play_stats',
  {
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    itemId: uuid('item_id').notNull(), // Polymorphic: can reference tracks, albums, artists
    itemType: varchar('item_type', { length: 50 }).notNull(),
    playCount: bigint('play_count', { mode: 'number' }).default(0).notNull(),
    weightedPlayCount: real('weighted_play_count').default(0).notNull(),
    lastPlayedAt: timestamp('last_played_at'),
    avgCompletionRate: real('avg_completion_rate'),
    skipCount: bigint('skip_count', { mode: 'number' }).default(0).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.itemId, table.itemType] }),
    index('idx_user_play_stats_user').on(table.userId, table.playCount),
    index('idx_user_play_stats_weighted').on(table.userId, table.weightedPlayCount),
    index('idx_user_play_stats_item').on(table.itemId, table.itemType),
  ],
);

// Type exports
export type UserRating = typeof userRatings.$inferSelect;
export type NewUserRating = typeof userRatings.$inferInsert;
export type PlayHistory = typeof playHistory.$inferSelect;
export type NewPlayHistory = typeof playHistory.$inferInsert;
export type UserPlayStats = typeof userPlayStats.$inferSelect;
export type NewUserPlayStats = typeof userPlayStats.$inferInsert;
