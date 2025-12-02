-- Add lufs_analyzed_at field to track when LUFS analysis was performed
-- This allows distinguishing between:
--   null = never analyzed (will be queued for analysis)
--   date = already analyzed (won't retry, even if rgTrackGain is null)
ALTER TABLE "tracks" ADD COLUMN "lufs_analyzed_at" timestamp;
