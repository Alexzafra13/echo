import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  text,
  index,
} from 'drizzle-orm/pg-core';

// ============================================
// LibraryScan
// ============================================
export const libraryScans = pgTable(
  'library_scans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    status: varchar('status', { length: 50 }).notNull(),
    startedAt: timestamp('started_at').defaultNow().notNull(),
    finishedAt: timestamp('finished_at'),
    tracksAdded: integer('tracks_added').default(0).notNull(),
    tracksUpdated: integer('tracks_updated').default(0).notNull(),
    tracksDeleted: integer('tracks_deleted').default(0).notNull(),
    errorMessage: text('error_message'),
  },
  (table) => [
    index('idx_library_scans_status').on(table.status), // For finding active/pending scans
    index('idx_library_scans_started').on(table.startedAt), // For sorting by date
  ],
);

// ============================================
// SystemLog
// ============================================
export const systemLogs = pgTable(
  'system_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    level: varchar('level', { length: 20 }).notNull(),
    category: varchar('category', { length: 50 }).notNull(),
    message: text('message').notNull(),
    details: text('details'),
    userId: uuid('user_id'),
    entityId: uuid('entity_id'),
    entityType: varchar('entity_type', { length: 20 }),
    stackTrace: text('stack_trace'),
    requestId: uuid('request_id'),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: varchar('user_agent', { length: 512 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('system_logs_level_created_idx').on(table.level, table.createdAt),
    index('system_logs_category_created_idx').on(table.category, table.createdAt),
    index('system_logs_user_idx').on(table.userId),
    index('system_logs_request_idx').on(table.requestId),
    index('system_logs_created_idx').on(table.createdAt),
  ],
);

// Type exports
export type LibraryScan = typeof libraryScans.$inferSelect;
export type NewLibraryScan = typeof libraryScans.$inferInsert;
export type SystemLog = typeof systemLogs.$inferSelect;
export type NewSystemLog = typeof systemLogs.$inferInsert;
