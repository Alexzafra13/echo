import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  bigint,
  text,
  index,
  jsonb,
} from 'drizzle-orm/pg-core';
import {
  HomeSectionConfig,
  DEFAULT_HOME_SECTIONS,
} from '@shared/types/home-section.types';

// Re-export for backwards compatibility
export type { HomeSectionConfig } from '@shared/types/home-section.types';

// ============================================
// User
// ============================================
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    username: varchar('username', { length: 50 }).notNull().unique(),
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
    avatarSize: bigint('avatar_size', { mode: 'number' }),
    avatarUpdatedAt: timestamp('avatar_updated_at'),
    // Profile privacy settings
    isPublicProfile: boolean('is_public_profile').default(false).notNull(),
    showTopTracks: boolean('show_top_tracks').default(true).notNull(),
    showTopArtists: boolean('show_top_artists').default(true).notNull(),
    showTopAlbums: boolean('show_top_albums').default(true).notNull(),
    showPlaylists: boolean('show_playlists').default(true).notNull(),
    bio: text('bio'),
    // Home page customization
    homeSections: jsonb('home_sections').$type<HomeSectionConfig[]>().default(DEFAULT_HOME_SECTIONS).notNull(),
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
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
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
