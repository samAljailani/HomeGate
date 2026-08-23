-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "auth_provider_id" INTEGER;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_auth_provider_id_fkey" FOREIGN KEY ("auth_provider_id") REFERENCES "oauth_providers"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
