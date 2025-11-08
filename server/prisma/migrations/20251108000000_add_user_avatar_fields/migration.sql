/*
  Warnings:

  - Adds avatar fields to users table for user profile pictures

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN "avatar_path" VARCHAR(512),
                    ADD COLUMN "avatar_mime_type" VARCHAR(50),
                    ADD COLUMN "avatar_size" BIGINT,
                    ADD COLUMN "avatar_updated_at" TIMESTAMP(3);
