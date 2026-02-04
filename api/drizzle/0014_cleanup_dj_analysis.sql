-- Cleanup DJ Analysis table
-- Remove unused columns and optimize indexes

-- Drop unused columns (were planned for stem separation, never used)
ALTER TABLE "dj_analysis" DROP COLUMN IF EXISTS "beatgrid";
ALTER TABLE "dj_analysis" DROP COLUMN IF EXISTS "intro_end";
ALTER TABLE "dj_analysis" DROP COLUMN IF EXISTS "outro_start";

-- Drop old individual indexes (replaced by composite index)
DROP INDEX IF EXISTS "idx_dj_analysis_bpm";
DROP INDEX IF EXISTS "idx_dj_analysis_key";

-- Add composite index for compatibility queries
-- This index optimizes findCompatibleTracks queries that filter by status, camelot_key, and bpm
CREATE INDEX IF NOT EXISTS "idx_dj_analysis_compatibility"
ON "dj_analysis" ("status", "camelot_key", "bpm");
