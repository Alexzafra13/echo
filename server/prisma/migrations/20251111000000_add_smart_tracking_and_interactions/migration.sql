/*
  Warnings:

  - Adds smart tracking fields to play_history table for intelligent recommendations
  - Adds sentiment field to user_starred table for like/dislike functionality
  - Adds weighted statistics to user_play_stats table for better scoring
  - Adds updated_at to user_starred for tracking changes

*/

-- AlterTable user_starred: Add sentiment field and updated_at
ALTER TABLE "user_starred" ADD COLUMN "sentiment" VARCHAR(20) NOT NULL DEFAULT 'like',
                           ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex for sentiment searches
CREATE INDEX "idx_user_starred_sentiment" ON "user_starred"("user_id", "sentiment");

-- AlterTable play_history: Add smart tracking fields
ALTER TABLE "play_history" ADD COLUMN "play_context" VARCHAR(50) NOT NULL DEFAULT 'direct',
                           ADD COLUMN "completion_rate" DOUBLE PRECISION,
                           ADD COLUMN "skipped" BOOLEAN NOT NULL DEFAULT false,
                           ADD COLUMN "source_id" VARCHAR(36),
                           ADD COLUMN "source_type" VARCHAR(50);

-- CreateIndex for play context
CREATE INDEX "idx_play_history_context" ON "play_history"("user_id", "play_context");

-- CreateIndex for source tracking
CREATE INDEX "idx_play_history_source" ON "play_history"("source_id", "source_type");

-- AlterTable user_play_stats: Add weighted and calculated fields
ALTER TABLE "user_play_stats" ADD COLUMN "weighted_play_count" DOUBLE PRECISION NOT NULL DEFAULT 0,
                              ADD COLUMN "avg_completion_rate" DOUBLE PRECISION,
                              ADD COLUMN "skip_count" BIGINT NOT NULL DEFAULT 0;

-- CreateIndex for weighted play count
CREATE INDEX "idx_user_play_stats_weighted" ON "user_play_stats"("user_id", "weighted_play_count" DESC);

-- CreateIndex for user_ratings item lookup
CREATE INDEX "idx_ratings_item" ON "user_ratings"("item_id", "item_type");
