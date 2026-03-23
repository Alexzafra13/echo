import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
  index,
  unique,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { tracks } from './tracks';

// ============================================
// Listening Sessions
// ============================================
// Ephemeral shared listening sessions where participants can collaborate on a queue
export const listeningSessions = pgTable(
  'listening_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    hostId: uuid('host_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    inviteCode: varchar('invite_code', { length: 8 }).notNull().unique(),
    isActive: boolean('is_active').default(true).notNull(),
    currentTrackId: uuid('current_track_id').references(() => tracks.id, { onDelete: 'set null' }),
    currentPosition: integer('current_position').default(0).notNull(),
    guestsCanControl: boolean('guests_can_control').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_listening_sessions_host').on(table.hostId),
    index('idx_listening_sessions_invite_code').on(table.inviteCode),
    index('idx_listening_sessions_active').on(table.isActive),
  ],
);

// ============================================
// Listening Session Participants
// ============================================
// Users currently in a listening session
// Role: host (full control), dj (can add to queue, skip), listener (read-only)
export const listeningSessionParticipants = pgTable(
  'listening_session_participants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => listeningSessions.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 20 }).notNull().default('listener'),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
  },
  (table) => [
    unique('unique_session_participant').on(table.sessionId, table.userId),
    index('idx_session_participants_session').on(table.sessionId),
    index('idx_session_participants_user').on(table.userId),
    check('valid_participant_role', sql`${table.role} IN ('host', 'dj', 'listener')`),
  ],
);

// ============================================
// Listening Session Queue
// ============================================
// Shared queue of tracks for a listening session
export const listeningSessionQueue = pgTable(
  'listening_session_queue',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => listeningSessions.id, { onDelete: 'cascade' }),
    trackId: uuid('track_id')
      .notNull()
      .references(() => tracks.id, { onDelete: 'cascade' }),
    addedBy: uuid('added_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    played: boolean('played').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_session_queue_session').on(table.sessionId, table.position),
    unique('unique_session_queue_position').on(table.sessionId, table.position),
  ],
);

// Type exports
export type ListeningSessionRow = typeof listeningSessions.$inferSelect;
export type NewListeningSession = typeof listeningSessions.$inferInsert;
export type ListeningSessionParticipantRow = typeof listeningSessionParticipants.$inferSelect;
export type NewListeningSessionParticipant = typeof listeningSessionParticipants.$inferInsert;
export type ListeningSessionQueueRow = typeof listeningSessionQueue.$inferSelect;
export type NewListeningSessionQueueItem = typeof listeningSessionQueue.$inferInsert;
export type ParticipantRole = 'host' | 'dj' | 'listener';
