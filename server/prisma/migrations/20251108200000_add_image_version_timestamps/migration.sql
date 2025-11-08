-- AlterTable
ALTER TABLE "albums" ADD COLUMN "cover_updated_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "artists" ADD COLUMN "images_updated_at" TIMESTAMP(3);

-- Set initial values to current timestamp for existing records
UPDATE "albums" SET "cover_updated_at" = CURRENT_TIMESTAMP WHERE "cover_art_path" IS NOT NULL;
UPDATE "artists" SET "images_updated_at" = CURRENT_TIMESTAMP WHERE "small_image_url" IS NOT NULL;
