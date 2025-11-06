/*
  Warnings:

  - The primary key for the `metadata_conflicts` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "metadata_conflicts" DROP CONSTRAINT "metadata_conflicts_pkey",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "metadata_conflicts_pkey" PRIMARY KEY ("id");
