/*
  Warnings:

  - The values [DEBUG,INFO,WARN,ERROR,FATAL] on the enum `LogLevel` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "LogLevel_new" AS ENUM ('Debug', 'Log', 'Warn', 'Error', 'Fatal');
ALTER TABLE "logs" ALTER COLUMN "log_level" TYPE "LogLevel_new" USING ("log_level"::text::"LogLevel_new");
ALTER TYPE "LogLevel" RENAME TO "LogLevel_old";
ALTER TYPE "LogLevel_new" RENAME TO "LogLevel";
DROP TYPE "public"."LogLevel_old";
COMMIT;
