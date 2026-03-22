import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  index,
  unique,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { playlists } from './playlists';

// ============================================
// Playlist Collaborators
// ============================================
// Stores collaboration relationships between users and playlists
// Role: editor (can add/remove/reorder tracks), viewer (read-only access)
// Status: pending (invitation sent), accepted (active collaborator)
export const playlistCollaborators = pgTable(
  'playlist_collaborators',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    playlistId: uuid('playlist_id')
      .notNull()
      .references(() => playlists.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 20 }).notNull().default('editor'),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    invitedBy: uuid('invited_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_playlist_collaborators_playlist').on(table.playlistId),
    index('idx_playlist_collaborators_user').on(table.userId),
    index('idx_playlist_collaborators_status').on(table.status),
    unique('unique_playlist_collaborator').on(table.playlistId, table.userId),
    check('valid_collaborator_role', sql`${table.role} IN ('editor', 'viewer')`),
    check('valid_collaborator_status', sql`${table.status} IN ('pending', 'accepted')`),
  ],
);

// Type exports
export type PlaylistCollaboratorRow = typeof playlistCollaborators.$inferSelect;
export type NewPlaylistCollaborator = typeof playlistCollaborators.$inferInsert;
export type CollaboratorRole = 'editor' | 'viewer';
export type CollaboratorStatus = 'pending' | 'accepted';
