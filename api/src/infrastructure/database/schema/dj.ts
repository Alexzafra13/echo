import {
  pgTable,
  uuid,
  varchar,
  real,
  boolean,
  timestamp,
  jsonb,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { tracks } from './tracks';

// ============================================
// DJ Analysis - Audio analysis for DJ features
// ============================================

export const djAnalysisStatusEnum = pgEnum('dj_analysis_status', [
  'pending',
  'analyzing',
  'completed',
  'failed',
]);

export const djAnalysis = pgTable(
  'dj_analysis',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    trackId: uuid('track_id')
      .notNull()
      .references(() => tracks.id, { onDelete: 'cascade' })
      .unique(),

    // Audio analysis results
    bpm: real('bpm'), // Detected BPM (e.g., 128.5)
    key: varchar('key', { length: 10 }), // Musical key (e.g., "Am", "C#m")
    camelotKey: varchar('camelot_key', { length: 5 }), // Camelot notation (e.g., "8A", "11B")
    energy: real('energy'), // Energy level 0.0 - 1.0
    danceability: real('danceability'), // Danceability 0.0 - 1.0

    // Beat detection
    beatgrid: jsonb('beatgrid'), // Array of beat positions in seconds

    // Intro/outro detection for smart transitions
    introEnd: real('intro_end'), // Seconds where intro ends
    outroStart: real('outro_start'), // Seconds where outro begins

    // Analysis status
    status: djAnalysisStatusEnum('status').default('pending').notNull(),
    analysisError: varchar('analysis_error', { length: 512 }),

    // Timestamps
    analyzedAt: timestamp('analyzed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_dj_analysis_track').on(table.trackId),
    index('idx_dj_analysis_bpm').on(table.bpm),
    index('idx_dj_analysis_key').on(table.camelotKey),
    index('idx_dj_analysis_status').on(table.status),
  ],
);

// ============================================
// DJ Stems - Separated audio stems for mashups
// ============================================

export const stemStatusEnum = pgEnum('stem_status', [
  'pending',
  'processing',
  'completed',
  'failed',
]);

export const djStems = pgTable(
  'dj_stems',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    trackId: uuid('track_id')
      .notNull()
      .references(() => tracks.id, { onDelete: 'cascade' })
      .unique(),

    // Stem file paths (relative to stems directory)
    vocalsPath: varchar('vocals_path', { length: 512 }),
    drumsPath: varchar('drums_path', { length: 512 }),
    bassPath: varchar('bass_path', { length: 512 }),
    otherPath: varchar('other_path', { length: 512 }),

    // Processing info
    status: stemStatusEnum('status').default('pending').notNull(),
    processingError: varchar('processing_error', { length: 512 }),
    modelUsed: varchar('model_used', { length: 50 }), // 'demucs-onnx', 'spleeter', etc.

    // File sizes for storage management
    totalSizeBytes: real('total_size_bytes'),

    // Timestamps
    processedAt: timestamp('processed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_dj_stems_track').on(table.trackId),
    index('idx_dj_stems_status').on(table.status),
  ],
);

// ============================================
// DJ Sessions - Saved DJ mix sessions
// ============================================

export const djSessions = pgTable(
  'dj_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),

    // Session configuration
    transitionType: varchar('transition_type', { length: 50 }).default('crossfade').notNull(), // 'crossfade', 'mashup', 'cut'
    transitionDuration: real('transition_duration').default(8).notNull(), // seconds

    // Track list with order
    trackList: jsonb('track_list').notNull(), // Array of { trackId, order, customTransition? }

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_dj_sessions_user').on(table.userId),
  ],
);

// Type exports
export type DjAnalysis = typeof djAnalysis.$inferSelect;
export type NewDjAnalysis = typeof djAnalysis.$inferInsert;
export type DjStems = typeof djStems.$inferSelect;
export type NewDjStems = typeof djStems.$inferInsert;
export type DjSession = typeof djSessions.$inferSelect;
export type NewDjSession = typeof djSessions.$inferInsert;
