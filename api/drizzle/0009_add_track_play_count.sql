-- Add play_count field to tracks table for efficient play count queries
ALTER TABLE "tracks" ADD COLUMN "play_count" bigint DEFAULT 0 NOT NULL;

-- Create composite index for top tracks by artist queries
CREATE INDEX "idx_tracks_artist_play_count" ON "tracks" ("artist_id", "play_count" DESC);
