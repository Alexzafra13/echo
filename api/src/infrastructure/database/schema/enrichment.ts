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
// EnrichmentLog
// ============================================
export const enrichmentLogs = pgTable(
  'enrichment_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entityId: uuid('entity_id').notNull(),
    entityType: varchar('entity_type', { length: 20 }).notNull(),
    entityName: varchar('entity_name', { length: 255 }).notNull(),
    provider: varchar('provider', { length: 50 }).notNull(),
    metadataType: varchar('metadata_type', { length: 50 }).notNull(),
    status: varchar('status', { length: 20 }).notNull(),
    fieldsUpdated: text('fields_updated').array(),
    errorMessage: text('error_message'),
    previewUrl: varchar('preview_url', { length: 512 }),
    userId: uuid('user_id'),
    processingTime: integer('processing_time'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('enrichment_logs_entity_idx').on(table.entityId, table.entityType),
    index('enrichment_logs_provider_idx').on(table.provider),
    index('enrichment_logs_status_idx').on(table.status),
    index('enrichment_logs_created_idx').on(table.createdAt),
    index('enrichment_logs_user_idx').on(table.userId),
  ],
);

// Type exports
export type EnrichmentLog = typeof enrichmentLogs.$inferSelect;
export type NewEnrichmentLog = typeof enrichmentLogs.$inferInsert;
