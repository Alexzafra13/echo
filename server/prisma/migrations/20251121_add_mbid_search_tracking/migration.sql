-- Add mbid_searched_at field to Artist, Album, and Track tables
-- This field tracks when we last attempted to search for a MusicBrainz ID
-- Prevents redundant searches for entities without MBIDs

-- Add to artists table
ALTER TABLE "artists" ADD COLUMN "mbid_searched_at" TIMESTAMP(3);

-- Add to albums table
ALTER TABLE "albums" ADD COLUMN "mbid_searched_at" TIMESTAMP(3);

-- Add to tracks table
ALTER TABLE "tracks" ADD COLUMN "mbid_searched_at" TIMESTAMP(3);
