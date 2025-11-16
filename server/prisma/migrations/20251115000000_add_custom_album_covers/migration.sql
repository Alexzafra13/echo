-- CreateTable
CREATE TABLE "custom_album_covers" (
    "id" TEXT NOT NULL,
    "album_id" VARCHAR(36) NOT NULL,
    "file_path" VARCHAR(512) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_size" BIGINT NOT NULL DEFAULT 0,
    "mime_type" VARCHAR(50) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "uploaded_by" VARCHAR(36),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_album_covers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "custom_album_covers_album_id_idx" ON "custom_album_covers"("album_id");

-- CreateIndex
CREATE INDEX "custom_album_covers_is_active_idx" ON "custom_album_covers"("is_active");

-- AddForeignKey
ALTER TABLE "custom_album_covers" ADD CONSTRAINT "custom_album_covers_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;
