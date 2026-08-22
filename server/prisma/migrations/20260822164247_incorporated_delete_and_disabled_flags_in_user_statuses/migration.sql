/*
  Warnings:

  - You are about to drop the column `is_deleted` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `is_enabled` on the `users` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "UserStatus" ADD VALUE 'DELETED';

-- AlterTable
ALTER TABLE "users" DROP COLUMN "is_deleted",
DROP COLUMN "is_enabled";
