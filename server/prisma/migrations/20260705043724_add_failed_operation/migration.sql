-- CreateEnum
CREATE TYPE "FailedOperation" AS ENUM ('provisioning', 'cancellation', 'expiration', 'sync');

-- AlterTable
ALTER TABLE "user_accounts" ADD COLUMN     "failed_operation" "FailedOperation";
