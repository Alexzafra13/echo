-- CreateTable: settings
CREATE TABLE "settings" (
  "key" VARCHAR(100) NOT NULL,
  "value" TEXT NOT NULL,
  "category" VARCHAR(50) NOT NULL,
  "type" VARCHAR(20) NOT NULL DEFAULT 'string',
  "description" TEXT,
  "is_public" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "settings_category_idx" ON "settings"("category");
