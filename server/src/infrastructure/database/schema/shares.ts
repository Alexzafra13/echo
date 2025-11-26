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
} from 'drizzle-orm/pg-core';

// ============================================
// Share
// ============================================
export const shares = pgTable(
  'shares',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: varchar('user_id', { length: 36 }).notNull(),
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
);

// ============================================
// Bookmark
// ============================================
export const bookmarks = pgTable(
  'bookmarks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: varchar('user_id', { length: 36 }).notNull(),
    itemId: varchar('item_id', { length: 36 }).notNull(),
    itemType: varchar('item_type', { length: 50 }).notNull(),
    position: bigint('position', { mode: 'bigint' }).notNull(),
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
