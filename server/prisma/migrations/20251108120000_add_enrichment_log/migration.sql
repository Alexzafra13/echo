-- CreateTable
CREATE TABLE "enrichment_logs" (
    "id" VARCHAR(36) NOT NULL,
    "entity_id" VARCHAR(36) NOT NULL,
    "entity_type" VARCHAR(20) NOT NULL,
    "entity_name" VARCHAR(255) NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "metadata_type" VARCHAR(50) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "fields_updated" TEXT[],
    "error_message" TEXT,
    "user_id" VARCHAR(36),
    "processing_time" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enrichment_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "enrichment_logs_entity_id_entity_type_idx" ON "enrichment_logs"("entity_id", "entity_type");

-- CreateIndex
CREATE INDEX "enrichment_logs_provider_idx" ON "enrichment_logs"("provider");

-- CreateIndex
CREATE INDEX "enrichment_logs_status_idx" ON "enrichment_logs"("status");

-- CreateIndex
CREATE INDEX "enrichment_logs_created_at_idx" ON "enrichment_logs"("created_at");

-- CreateIndex
CREATE INDEX "enrichment_logs_user_id_idx" ON "enrichment_logs"("user_id");
