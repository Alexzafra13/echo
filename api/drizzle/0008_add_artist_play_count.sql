-- Add play_count field to artists table for efficient play count queries
ALTER TABLE "artists" ADD COLUMN "play_count" bigint DEFAULT 0 NOT NULL;

-- Create index for sorting by play count (top artists)
CREATE INDEX "idx_artists_play_count" ON "artists" ("play_count" DESC);

-- Backfill existing play counts from user_play_stats
UPDATE artists a
SET play_count = COALESCE((
  SELECT SUM(play_count)
  FROM user_play_stats ups
  WHERE ups.item_id = a.id::text
    AND ups.item_type = 'artist'
), 0);
