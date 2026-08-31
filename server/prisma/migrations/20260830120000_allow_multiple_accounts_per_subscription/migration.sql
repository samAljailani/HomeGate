-- Subscription-level policies now cap how many external accounts a linked subscription may hold.
-- Existing rows default to 1, preserving the previous one-account-per-subscription behavior.
ALTER TABLE "user_service_policies" ADD COLUMN "accounts_per_service" INTEGER NOT NULL DEFAULT 1;

-- A subscription may now own more than one external account. The per-subscription unique index is
-- replaced with a plain index; uniqueness is enforced per account by
-- (service_id, external_account_id) and by the vendor integration, so each account can still only
-- be linked to one subscription at a time.
DROP INDEX "external_user_accounts_subscription_id_key";
CREATE INDEX "external_user_accounts_subscription_id_idx" ON "external_user_accounts"("subscription_id");
CREATE INDEX "external_user_accounts_user_id_idx" ON "external_user_accounts"("user_id");

-- Align schema drift: the unique (service_id, username) index is not part of the Prisma model and
-- would block adding accounts that share a username across a service.
DROP INDEX "external_user_accounts_service_id_username_key";