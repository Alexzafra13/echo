-- CreateTable: mbid_search_cache
CREATE TABLE "mbid_search_cache" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "query_text" TEXT NOT NULL,
    "query_type" VARCHAR(20) NOT NULL,
    "query_params" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "results" JSONB NOT NULL,
    "result_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "hit_count" INTEGER NOT NULL DEFAULT 0,
    "last_hit_at" TIMESTAMP(3),

    CONSTRAINT "mbid_search_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Unique constraint for query deduplication
CREATE UNIQUE INDEX "unique_mbid_search" ON "mbid_search_cache"("query_text", "query_type", "query_params");

-- CreateIndex: Lookup index for fast cache retrieval
CREATE INDEX "idx_mbid_search_lookup" ON "mbid_search_cache"("query_text", "query_type");

-- CreateIndex: Expiration index for cleanup
CREATE INDEX "idx_mbid_search_expires" ON "mbid_search_cache"("expires_at");

-- AlterTable: metadata_conflicts - Change metadata column from TEXT to JSONB
ALTER TABLE "metadata_conflicts"
  ALTER COLUMN "metadata" TYPE JSONB USING
    CASE
      WHEN "metadata" IS NULL THEN NULL
      WHEN "metadata" = '' THEN NULL
      ELSE "metadata"::jsonb
    END;

-- CreateIndex: MBID indexes for Artist table (partial index for better performance)
CREATE INDEX "idx_artists_mbid" ON "artists"("mbz_artist_id") WHERE "mbz_artist_id" IS NOT NULL;

-- CreateIndex: MBID indexes for Album table
CREATE INDEX "idx_albums_mbid" ON "albums"("mbz_album_id") WHERE "mbz_album_id" IS NOT NULL;
CREATE INDEX "idx_albums_artist_mbid" ON "albums"("mbz_album_artist_id") WHERE "mbz_album_artist_id" IS NOT NULL;

-- CreateIndex: MBID indexes for Track table
CREATE INDEX "idx_tracks_mbid" ON "tracks"("mbz_track_id") WHERE "mbz_track_id" IS NOT NULL;
CREATE INDEX "idx_tracks_artist_mbid" ON "tracks"("mbz_artist_id") WHERE "mbz_artist_id" IS NOT NULL;
CREATE INDEX "idx_tracks_album_mbid" ON "tracks"("mbz_album_id") WHERE "mbz_album_id" IS NOT NULL;

-- CreateFunction: Cleanup expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_mbid_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM "mbid_search_cache" WHERE "expires_at" < NOW();
  DELETE FROM "metadata_cache" WHERE "expires_at" < NOW();
END;
$$ LANGUAGE plpgsql;

-- Comment: Add helpful comments
COMMENT ON TABLE "mbid_search_cache" IS 'Cache for MusicBrainz API search queries to avoid repeated API calls and rate limiting';
COMMENT ON COLUMN "mbid_search_cache"."query_params" IS 'Additional parameters for cache key (artist, album, duration, etc.)';
COMMENT ON COLUMN "mbid_search_cache"."hit_count" IS 'Number of times this cached result has been used';
COMMENT ON COLUMN "metadata_conflicts"."metadata" IS 'JSONB for efficient queries on suggestions array and scores';
