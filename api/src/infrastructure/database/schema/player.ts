import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
  text,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users';

// ============================================
// Transcoding
// ============================================
export const transcodings = pgTable(
  'transcoding',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    targetFormat: varchar('target_format', { length: 10 }).notNull(),
    defaultBitRate: integer('default_bit_rate'),
    command: text('command').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
);

// ============================================
// Player
// ============================================
export const players = pgTable(
  'players',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    type: varchar('type', { length: 50 }),
    userName: varchar('user_name', { length: 255 }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    client: varchar('client', { length: 255 }),
    ipAddress: varchar('ip_address', { length: 45 }),
    lastSeen: timestamp('last_seen'),
    maxBitRate: integer('max_bit_rate'),
    transcodingId: uuid('transcoding_id').references(() => transcodings.id, { onDelete: 'set null' }),
    scrobbleEnabled: boolean('scrobble_enabled').default(true).notNull(),
  },
  (table) => [
    index('idx_players_user').on(table.userId),
  ],
);

// Type exports
export type Transcoding = typeof transcodings.$inferSelect;
export type NewTranscoding = typeof transcodings.$inferInsert;
export type Player = typeof players.$inferSelect;
export type NewPlayer = typeof players.$inferInsert;
