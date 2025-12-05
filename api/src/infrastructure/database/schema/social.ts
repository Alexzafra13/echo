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

// ============================================
// Friendships
// ============================================
// Stores friend relationships between users
// Status: pending (request sent), accepted (friends), blocked
export const friendships = pgTable(
  'friendships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    requesterId: uuid('requester_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    addresseeId: uuid('addressee_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    // Indexes
    index('idx_friendships_requester').on(table.requesterId),
    index('idx_friendships_addressee').on(table.addresseeId),
    index('idx_friendships_status').on(table.status),
    // Unique constraint
    unique('unique_friendship').on(table.requesterId, table.addresseeId),
    // Check constraints
    check('no_self_friendship', sql`${table.requesterId} != ${table.addresseeId}`),
    check('valid_status', sql`${table.status} IN ('pending', 'accepted', 'blocked')`),
  ],
);

// Type exports
export type Friendship = typeof friendships.$inferSelect;
export type NewFriendship = typeof friendships.$inferInsert;
export type FriendshipStatus = 'pending' | 'accepted' | 'blocked';
