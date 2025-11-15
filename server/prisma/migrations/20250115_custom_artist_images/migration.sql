-- CreateTable
CREATE TABLE "custom_artist_images" (
    "id" VARCHAR(36) NOT NULL,
    "artist_id" VARCHAR(36) NOT NULL,
    "image_type" VARCHAR(20) NOT NULL,
    "file_path" VARCHAR(512) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_size" BIGINT NOT NULL DEFAULT 0,
    "mime_type" VARCHAR(50) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "uploaded_by" VARCHAR(36),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_artist_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "custom_artist_images_artist_id_idx" ON "custom_artist_images"("artist_id");

-- CreateIndex
CREATE INDEX "custom_artist_images_artist_id_image_type_idx" ON "custom_artist_images"("artist_id", "image_type");

-- CreateIndex
CREATE INDEX "custom_artist_images_is_active_idx" ON "custom_artist_images"("is_active");

-- AddForeignKey
ALTER TABLE "custom_artist_images" ADD CONSTRAINT "custom_artist_images_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
