-- AlterTable: Add new fields to artists table
ALTER TABLE "artists" ADD COLUMN "biography_source" VARCHAR(50);
ALTER TABLE "artists" ADD COLUMN "metadata_storage_size" BIGINT DEFAULT 0;

-- AlterTable: Add new fields to albums table
ALTER TABLE "albums" ADD COLUMN "external_cover_path" VARCHAR(512);
ALTER TABLE "albums" ADD COLUMN "external_cover_source" VARCHAR(50);
