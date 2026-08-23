/*
  Warnings:

  - You are about to drop the column `autoRenew` on the `user_accounts` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "user_accounts" DROP COLUMN "autoRenew",
ADD COLUMN     "auto_renew" BOOLEAN NOT NULL DEFAULT false;
