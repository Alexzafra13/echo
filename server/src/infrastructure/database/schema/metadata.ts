import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  text,
  json,
  index,
  primaryKey,
  unique,
} from 'drizzle-orm/pg-core';

// ============================================
// MetadataCache
// ============================================
export const metadataCache = pgTable(
  'metadata_cache',
  {
    entityId: varchar('entity_id', { length: 36 }).notNull(),
    entityType: varchar('entity_type', { length: 50 }).notNull(),
    provider: varchar('provider', { length: 50 }).notNull(),
    data: text('data').notNull(),
    fetchedAt: timestamp('fetched_at').defaultNow().notNull(),
    expiresAt: timestamp('expires_at'),
  },
  (table) => [
    primaryKey({ columns: [table.entityId, table.entityType, table.provider] }),
    index('idx_metadata_cache_expires').on(table.expiresAt),
  ],
);

// ============================================
// MbidSearchCache
// ============================================
export const mbidSearchCache = pgTable(
  'mbid_search_cache',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    queryText: text('query_text').notNull(),
    queryType: varchar('query_type', { length: 20 }).notNull(),
    queryParams: json('query_params').default({}).notNull(),
    results: json('results').notNull(),
    resultCount: integer('result_count').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    hitCount: integer('hit_count').default(0).notNull(),
    lastHitAt: timestamp('last_hit_at'),
  },
  (table) => [
    unique('unique_mbid_search').on(table.queryText, table.queryType),
    index('idx_mbid_search_lookup').on(table.queryText, table.queryType),
    index('idx_mbid_search_expires').on(table.expiresAt),
  ],
);

// ============================================
// MetadataConflict
// ============================================
export const metadataConflicts = pgTable(
  'metadata_conflicts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entityId: varchar('entity_id', { length: 36 }).notNull(),
    entityType: varchar('entity_type', { length: 20 }).notNull(),
    field: varchar('field', { length: 50 }).notNull(),
    currentValue: text('current_value'),
    suggestedValue: text('suggested_value').notNull(),
    source: varchar('source', { length: 50 }).notNull(),
    status: varchar('status', { length: 20 }).default('pending').notNull(),
    priority: integer('priority').default(1).notNull(),
    metadata: json('metadata'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    resolvedAt: timestamp('resolved_at'),
    resolvedBy: varchar('resolved_by', { length: 36 }),
  },
  (table) => [
    index('metadata_conflicts_entity_idx').on(table.entityId, table.entityType),
    index('metadata_conflicts_status_idx').on(table.status),
    index('metadata_conflicts_created_idx').on(table.createdAt),
  ],
);

// Type exports
export type MetadataCache = typeof metadataCache.$inferSelect;
export type NewMetadataCache = typeof metadataCache.$inferInsert;
export type MbidSearchCache = typeof mbidSearchCache.$inferSelect;
export type NewMbidSearchCache = typeof mbidSearchCache.$inferInsert;
export type MetadataConflict = typeof metadataConflicts.$inferSelect;
export type NewMetadataConflict = typeof metadataConflicts.$inferInsert;
