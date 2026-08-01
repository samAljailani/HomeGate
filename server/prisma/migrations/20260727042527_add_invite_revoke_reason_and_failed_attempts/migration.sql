-- CreateEnum
CREATE TYPE "InviteRevokedReason" AS ENUM ('ADMIN', 'AUTO_FAILED_ATTEMPTS', 'AUTO_SUPERSEDED');

-- AlterTable
ALTER TABLE "invites" ADD COLUMN     "failed_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "revoked_by_user_id" UUID,
ADD COLUMN     "revoked_reason" "InviteRevokedReason";

-- AddForeignKey
ALTER TABLE "invites" ADD CONSTRAINT "invites_revoked_by_user_id_fkey" FOREIGN KEY ("revoked_by_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
