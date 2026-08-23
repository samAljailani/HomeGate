/*
  Warnings:

  - Added the required column `expires_at` to the `user_accounts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "user_accounts" ADD COLUMN     "autoRenew" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "expires_at" TIMESTAMPTZ(6) NOT NULL;
