import { pgTable, uuid, text, timestamp, boolean, index, unique } from 'drizzle-orm/pg-core';
import { users } from './users';

// ============================================
// Private Conversations (Hidden Chat)
// ============================================
// Direct message threads between two users.
// Hidden by design: no UI entry point, no notifications.
export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userOneId: uuid('user_one_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    userTwoId: uuid('user_two_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    lastMessageAt: timestamp('last_message_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    unique('unique_conversation').on(table.userOneId, table.userTwoId),
    index('idx_conversations_user_one').on(table.userOneId),
    index('idx_conversations_user_two').on(table.userTwoId),
    index('idx_conversations_last_msg').on(table.lastMessageAt),
  ]
);

// ============================================
// Messages
// ============================================
export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    senderId: uuid('sender_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    readAt: timestamp('read_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_messages_conversation').on(table.conversationId),
    index('idx_messages_sender').on(table.senderId),
    index('idx_messages_created').on(table.createdAt),
  ]
);

// Type exports
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
