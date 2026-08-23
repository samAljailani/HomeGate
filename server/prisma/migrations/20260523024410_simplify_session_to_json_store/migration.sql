/*
  Warnings:

  - You are about to drop the column `oauth_sid` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `token` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `sessions` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[sid]` on the table `sessions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `data` to the `sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sid` to the `sessions` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_user_id_fkey";

-- DropIndex
DROP INDEX "sessions_token_key";

-- AlterTable
ALTER TABLE "sessions" DROP COLUMN "oauth_sid",
DROP COLUMN "token",
DROP COLUMN "user_id",
ADD COLUMN     "data" JSONB NOT NULL,
ADD COLUMN     "sid" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sid_key" ON "sessions"("sid");
