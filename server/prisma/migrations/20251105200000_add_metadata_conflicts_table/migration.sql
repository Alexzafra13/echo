-- CreateTable
CREATE TABLE "metadata_conflicts" (
    "id" VARCHAR(36) NOT NULL,
    "entity_id" VARCHAR(36) NOT NULL,
    "entity_type" VARCHAR(20) NOT NULL,
    "field" VARCHAR(50) NOT NULL,
    "current_value" TEXT,
    "suggested_value" TEXT NOT NULL,
    "source" VARCHAR(50) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "priority" INTEGER NOT NULL DEFAULT 1,
    "metadata" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "resolved_by" VARCHAR(36),

    CONSTRAINT "metadata_conflicts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "metadata_conflicts_entity_id_entity_type_idx" ON "metadata_conflicts"("entity_id", "entity_type");

-- CreateIndex
CREATE INDEX "metadata_conflicts_status_idx" ON "metadata_conflicts"("status");

-- CreateIndex
CREATE INDEX "metadata_conflicts_created_at_idx" ON "metadata_conflicts"("created_at");
