import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  bigint,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// ============================================
// User
// ============================================
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    username: varchar('username', { length: 50 }).notNull().unique(),
    email: varchar('email', { length: 255 }).unique(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    name: varchar('name', { length: 100 }),
    isAdmin: boolean('is_admin').default(false).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    theme: varchar('theme', { length: 20 }).default('dark').notNull(),
    language: varchar('language', { length: 10 }).default('es').notNull(),
    mustChangePassword: boolean('must_change_password').default(true).notNull(),
    lastLoginAt: timestamp('last_login_at'),
    lastAccessAt: timestamp('last_access_at'),
    avatarPath: varchar('avatar_path', { length: 512 }),
    avatarMimeType: varchar('avatar_mime_type', { length: 50 }),
    avatarSize: bigint('avatar_size', { mode: 'bigint' }),
    avatarUpdatedAt: timestamp('avatar_updated_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
);

// ============================================
// StreamToken
// ============================================
export const streamTokens = pgTable(
  'stream_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: varchar('user_id', { length: 36 }).notNull(),
    token: varchar('token', { length: 255 }).notNull().unique(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    lastUsedAt: timestamp('last_used_at'),
  },
  (table) => [
    index('stream_tokens_token_idx').on(table.token),
    index('stream_tokens_user_id_idx').on(table.userId),
    index('stream_tokens_expires_at_idx').on(table.expiresAt),
  ],
);

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type StreamToken = typeof streamTokens.$inferSelect;
export type NewStreamToken = typeof streamTokens.$inferInsert;
