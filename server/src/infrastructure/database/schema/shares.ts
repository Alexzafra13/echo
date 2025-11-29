import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
  bigint,
  text,
  unique,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users';

// ============================================
// Share
// ============================================
export const shares = pgTable(
  'shares',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    description: varchar('description', { length: 512 }),
    expiresAt: timestamp('expires_at'),
    lastVisitedAt: timestamp('last_visited_at'),
    resourceIds: text('resource_ids').notNull(),
    resourceType: varchar('resource_type', { length: 50 }).notNull(),
    visitCount: integer('visit_count').default(0).notNull(),
    downloadable: boolean('downloadable').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_shares_user').on(table.userId),
  ],
);

// ============================================
// Bookmark
// ============================================
export const bookmarks = pgTable(
  'bookmarks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    itemId: uuid('item_id').notNull(), // Polymorphic: can reference tracks, albums, etc.
    itemType: varchar('item_type', { length: 50 }).notNull(),
    position: bigint('position', { mode: 'number' }).notNull(),
    comment: varchar('comment', { length: 512 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    unique('bookmarks_user_item_unique').on(table.userId, table.itemId, table.itemType),
  ],
);

// Type exports
export type Share = typeof shares.$inferSelect;
export type NewShare = typeof shares.$inferInsert;
export type Bookmark = typeof bookmarks.$inferSelect;
export type NewBookmark = typeof bookmarks.$inferInsert;
