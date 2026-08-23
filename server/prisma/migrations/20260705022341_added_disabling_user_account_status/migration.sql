/*
  Warnings:

  - You are about to drop the column `is_active` on the `user_accounts` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[service_id,username]` on the table `user_accounts` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[service_id,user_service_account_id]` on the table `user_accounts` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updated_at` to the `user_accounts` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserAccountStatus" AS ENUM ('provisioning', 'active', 'failed', 'cancelling', 'cancelled', 'expired', 'disabling', 'disabled');

-- DropIndex
DROP INDEX "user_accounts_username_key";

-- AlterTable
ALTER TABLE "user_accounts" DROP COLUMN "is_active",
ADD COLUMN     "cancelled_at" TIMESTAMPTZ(6),
ADD COLUMN     "failed_at" TIMESTAMPTZ(6),
ADD COLUMN     "last_error" TEXT,
ADD COLUMN     "provisioned_at" TIMESTAMPTZ(6),
ADD COLUMN     "retry_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "status" "UserAccountStatus" NOT NULL DEFAULT 'provisioning',
ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL,
ALTER COLUMN "user_service_account_id" DROP NOT NULL,
ALTER COLUMN "expires_at" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "user_accounts_service_id_username_key" ON "user_accounts"("service_id", "username");

-- CreateIndex
CREATE UNIQUE INDEX "user_accounts_service_id_user_service_account_id_key" ON "user_accounts"("service_id", "user_service_account_id");
