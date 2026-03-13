import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  jsonb,
  index,
  unique,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

// ============================================
// Notifications
// ============================================
// Persistent notifications for all users
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 50 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    message: text('message').notNull(),
    data: jsonb('data'),
    isRead: boolean('is_read').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_notifications_user_read').on(table.userId, table.isRead),
    index('idx_notifications_user_created').on(table.userId, table.createdAt),
    index('idx_notifications_created').on(table.createdAt),
    check(
      'valid_notification_type',
      sql`${table.type} IN ('friend_request_received', 'friend_request_accepted', 'enrichment_completed', 'system_alert', 'scan_completed', 'new_content')`,
    ),
  ],
);

// Type exports
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

// ============================================
// Notification Preferences
// ============================================
// Per-user settings for which notification types to receive
export const notificationPreferences = pgTable(
  'notification_preferences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    notificationType: varchar('notification_type', { length: 50 }).notNull(),
    enabled: boolean('enabled').default(true).notNull(),
  },
  (table) => [
    unique('unique_user_notification_type').on(table.userId, table.notificationType),
    index('idx_notification_prefs_user').on(table.userId),
  ],
);

// Type exports
export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type NewNotificationPreference = typeof notificationPreferences.$inferInsert;

// Notification type constants
export const NOTIFICATION_TYPES = [
  'friend_request_received',
  'friend_request_accepted',
  'enrichment_completed',
  'system_alert',
  'scan_completed',
  'new_content',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

// Admin-only notification types
export const ADMIN_NOTIFICATION_TYPES: NotificationType[] = [
  'enrichment_completed',
  'system_alert',
];
