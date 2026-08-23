/*
  Warnings:

  - A unique constraint covering the columns `[user_id,provider_id]` on the table `user_oauth_identities` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_enabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE UNIQUE INDEX "user_oauth_identities_user_id_provider_id_key" ON "user_oauth_identities"("user_id", "provider_id");
