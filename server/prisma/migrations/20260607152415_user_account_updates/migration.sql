/*
  Warnings:

  - Added the required column `user_service_account_id` to the `user_accounts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "user_accounts" ADD COLUMN     "user_service_account_id" TEXT NOT NULL;
