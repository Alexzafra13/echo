-- Create artist_banners table for multiple banner images per artist
CREATE TABLE "artist_banners" (
    "id" VARCHAR(36) NOT NULL,
    "artist_id" VARCHAR(36) NOT NULL,
    "image_url" VARCHAR(512) NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "artist_banners_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "artist_banners_artist_id_idx" ON "artist_banners"("artist_id");
CREATE INDEX "artist_banners_artist_id_order_idx" ON "artist_banners"("artist_id", "order");

-- Add foreign key constraint
ALTER TABLE "artist_banners" ADD CONSTRAINT "artist_banners_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
