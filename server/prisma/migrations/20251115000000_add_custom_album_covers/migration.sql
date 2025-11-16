-- CreateTable
CREATE TABLE `custom_album_covers` (
    `id` VARCHAR(191) NOT NULL,
    `album_id` VARCHAR(36) NOT NULL,
    `file_path` VARCHAR(512) NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `file_size` BIGINT NOT NULL DEFAULT 0,
    `mime_type` VARCHAR(50) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT false,
    `uploaded_by` VARCHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `custom_album_covers_album_id_idx`(`album_id`),
    INDEX `custom_album_covers_is_active_idx`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `custom_album_covers` ADD CONSTRAINT `custom_album_covers_album_id_fkey` FOREIGN KEY (`album_id`) REFERENCES `albums`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
