/*
  Warnings:

  - The primary key for the `user_accounts` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[user_id,service_id]` on the table `user_accounts` will be added. If there are existing duplicate values, this will fail.
  - The required column `id` was added to the `user_accounts` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "user_accounts" DROP CONSTRAINT "user_accounts_pkey",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "user_accounts_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "user_accounts_user_id_service_id_key" ON "user_accounts"("user_id", "service_id");
