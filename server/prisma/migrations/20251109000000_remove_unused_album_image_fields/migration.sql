-- Remove unused image fields from albums table
-- These fields were defined but never populated or used in the application

-- ============================================
-- CLEANUP: Remove unused image URL fields
-- ============================================

-- coverArtId was defined but never used in any code
ALTER TABLE "albums" DROP COLUMN IF EXISTS "cover_art_id";

-- small/medium/largeImageUrl were defined but never populated
-- (these fields are only used in artists table, not albums)
ALTER TABLE "albums" DROP COLUMN IF EXISTS "small_image_url";
ALTER TABLE "albums" DROP COLUMN IF EXISTS "medium_image_url";
ALTER TABLE "albums" DROP COLUMN IF EXISTS "large_image_url";

-- ============================================
-- RESULT: Cleaner schema with only used fields
-- ============================================
-- Albums now only have:
-- - coverArtPath: Local cover from disk/embedded in audio
-- - externalCoverPath: External cover downloaded from providers (Fanart, etc.)
-- - externalCoverSource: Provider name (fanart, lastfm, etc.)
--
-- Priority: externalCoverPath > coverArtPath (external images have priority)
