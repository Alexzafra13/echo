import {
  pgTable,
  varchar,
  boolean,
  timestamp,
  text,
  index,
} from 'drizzle-orm/pg-core';

// ============================================
// Setting
// ============================================
export const settings = pgTable(
  'settings',
  {
    key: varchar('key', { length: 100 }).primaryKey(),
    value: text('value').notNull(),
    category: varchar('category', { length: 50 }).notNull(),
    type: varchar('type', { length: 20 }).default('string').notNull(),
    description: text('description'),
    isPublic: boolean('is_public').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('settings_category_idx').on(table.category),
  ],
);

// Type exports
export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;
