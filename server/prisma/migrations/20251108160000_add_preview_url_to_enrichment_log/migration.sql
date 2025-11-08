-- Add preview_url column to enrichment_logs table
ALTER TABLE "enrichment_logs" ADD COLUMN "preview_url" VARCHAR(512);
