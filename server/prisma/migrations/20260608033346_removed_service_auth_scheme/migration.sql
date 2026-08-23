/*
  Warnings:

  - You are about to drop the column `auth_scheme_id` on the `services` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "services" DROP CONSTRAINT "services_auth_scheme_id_fkey";

-- AlterTable
ALTER TABLE "services" DROP COLUMN "auth_scheme_id";
