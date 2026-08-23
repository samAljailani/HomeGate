-- AlterTable
ALTER TABLE "invites" ADD COLUMN     "is_admin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "invite_accounts" (
    "id" UUID NOT NULL,
    "invite_id" UUID NOT NULL,
    "service_id" INTEGER NOT NULL,
    "username" VARCHAR(64),
    "email" VARCHAR(254),
    "account_id" VARCHAR(255),

    CONSTRAINT "invite_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invite_accounts_invite_id_service_id_key" ON "invite_accounts"("invite_id", "service_id");

-- AddForeignKey
ALTER TABLE "invite_accounts" ADD CONSTRAINT "invite_accounts_invite_id_fkey" FOREIGN KEY ("invite_id") REFERENCES "invites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invite_accounts" ADD CONSTRAINT "invite_accounts_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
