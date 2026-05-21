/*
  Warnings:

  - Added the required column `username` to the `user_accounts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "user_accounts" ADD COLUMN     "username" VARCHAR(64) NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "username" VARCHAR(64) NOT NULL DEFAULT 'samialjailani';
