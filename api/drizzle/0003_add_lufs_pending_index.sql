-- Add partial index for efficient queries on tracks pending LUFS analysis
-- This significantly speeds up: SELECT ... FROM tracks WHERE lufs_analyzed_at IS NULL
-- Note: Cannot use CONCURRENTLY as Drizzle runs migrations in transactions
CREATE INDEX IF NOT EXISTS idx_tracks_lufs_pending
ON tracks (id)
WHERE lufs_analyzed_at IS NULL;
