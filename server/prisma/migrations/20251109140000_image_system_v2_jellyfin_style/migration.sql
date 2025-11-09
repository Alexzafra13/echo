-- Image System V2: Jellyfin-style Local + External separation
-- This migration adds new columns for local and external images with per-image timestamps

-- ============================================
-- STEP 1: Add new columns
-- ============================================

-- Profile/Thumb Images
ALTER TABLE "artists" ADD COLUMN IF NOT EXISTS "profile_image_path" VARCHAR(512);
ALTER TABLE "artists" ADD COLUMN IF NOT EXISTS "profile_image_updated_at" TIMESTAMP;
ALTER TABLE "artists" ADD COLUMN IF NOT EXISTS "external_profile_path" VARCHAR(512);
ALTER TABLE "artists" ADD COLUMN IF NOT EXISTS "external_profile_source" VARCHAR(50);
ALTER TABLE "artists" ADD COLUMN IF NOT EXISTS "external_profile_updated_at" TIMESTAMP;

-- Background Images
ALTER TABLE "artists" ADD COLUMN IF NOT EXISTS "background_image_path" VARCHAR(512);
ALTER TABLE "artists" ADD COLUMN IF NOT EXISTS "background_updated_at" TIMESTAMP;
ALTER TABLE "artists" ADD COLUMN IF NOT EXISTS "external_background_path" VARCHAR(512);
ALTER TABLE "artists" ADD COLUMN IF NOT EXISTS "external_background_source" VARCHAR(50);
ALTER TABLE "artists" ADD COLUMN IF NOT EXISTS "external_background_updated_at" TIMESTAMP;

-- Banner Images
ALTER TABLE "artists" ADD COLUMN IF NOT EXISTS "banner_image_path" VARCHAR(512);
ALTER TABLE "artists" ADD COLUMN IF NOT EXISTS "banner_updated_at" TIMESTAMP;
ALTER TABLE "artists" ADD COLUMN IF NOT EXISTS "external_banner_path" VARCHAR(512);
ALTER TABLE "artists" ADD COLUMN IF NOT EXISTS "external_banner_source" VARCHAR(50);
ALTER TABLE "artists" ADD COLUMN IF NOT EXISTS "external_banner_updated_at" TIMESTAMP;

-- Logo Images
ALTER TABLE "artists" ADD COLUMN IF NOT EXISTS "logo_image_path" VARCHAR(512);
ALTER TABLE "artists" ADD COLUMN IF NOT EXISTS "logo_updated_at" TIMESTAMP;
ALTER TABLE "artists" ADD COLUMN IF NOT EXISTS "external_logo_path" VARCHAR(512);
ALTER TABLE "artists" ADD COLUMN IF NOT EXISTS "external_logo_source" VARCHAR(50);
ALTER TABLE "artists" ADD COLUMN IF NOT EXISTS "external_logo_updated_at" TIMESTAMP;

-- ============================================
-- STEP 2: Migrate existing data
-- ============================================

-- Migrate profile images (prioritize large > medium > small)
UPDATE "artists"
SET
  "external_profile_path" = COALESCE("large_image_url", "medium_image_url", "small_image_url"),
  "external_profile_updated_at" = "external_info_updated_at"
WHERE
  "large_image_url" IS NOT NULL
  OR "medium_image_url" IS NOT NULL
  OR "small_image_url" IS NOT NULL;

-- Migrate background images
UPDATE "artists"
SET
  "external_background_path" = "background_image_url",
  "external_background_updated_at" = "external_info_updated_at"
WHERE
  "background_image_url" IS NOT NULL;

-- Migrate banner images
UPDATE "artists"
SET
  "external_banner_path" = "banner_image_url",
  "external_banner_updated_at" = "external_info_updated_at"
WHERE
  "banner_image_url" IS NOT NULL;

-- Migrate logo images
UPDATE "artists"
SET
  "external_logo_path" = "logo_image_url",
  "external_logo_updated_at" = "external_info_updated_at"
WHERE
  "logo_image_url" IS NOT NULL;

-- ============================================
-- STEP 3: Drop old columns
-- ============================================

ALTER TABLE "artists" DROP COLUMN IF EXISTS "small_image_url";
ALTER TABLE "artists" DROP COLUMN IF EXISTS "medium_image_url";
ALTER TABLE "artists" DROP COLUMN IF EXISTS "large_image_url";
ALTER TABLE "artists" DROP COLUMN IF EXISTS "background_image_url";
ALTER TABLE "artists" DROP COLUMN IF EXISTS "banner_image_url";
ALTER TABLE "artists" DROP COLUMN IF EXISTS "logo_image_url";
ALTER TABLE "artists" DROP COLUMN IF EXISTS "external_info_updated_at";
