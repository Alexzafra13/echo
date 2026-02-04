import {
  pgTable,
  uuid,
  varchar,
  real,
  timestamp,
  jsonb,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { tracks } from './tracks';

// ============================================
// DJ Analysis - Audio analysis for harmonic mixing
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

// Type exports
export type DjAnalysis = typeof djAnalysis.$inferSelect;
export type NewDjAnalysis = typeof djAnalysis.$inferInsert;
