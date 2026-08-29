-- Split user_accounts into subscriptions + external_user_accounts, and introduce service account types.

-- 0. Guards. Prisma runs this file in a transaction on PostgreSQL, so raising here aborts
--    the whole migration and leaves the database untouched, with a readable reason.
DO $$
DECLARE
    n int;
    details text;
BEGIN
    -- slug is derived as lower(name); names unique only by case would collide on services_slug_key.
    SELECT count(*), string_agg(lower_name, ', ')
      INTO n, details
    FROM (
        SELECT lower("name") AS lower_name FROM "services"
        GROUP BY lower("name") HAVING count(*) > 1
    ) d;

    IF n > 0 THEN
        RAISE EXCEPTION 'Cannot split user_accounts: % service name(s) collide when lowercased into a slug: %. Rename them, then redeploy.', n, details;
    END IF;

    -- A blank username produces an external account that cannot be matched back to the vendor.
    SELECT count(*) INTO n FROM "user_accounts" WHERE trim(coalesce("username", '')) = '';
    IF n > 0 THEN
        RAISE EXCEPTION 'Cannot split user_accounts: % row(s) have a blank username. Fix or delete them, then redeploy.', n;
    END IF;
END $$;

-- 1. New enums, and rename the status enum to match its new owner.
CREATE TYPE "AccountType" AS ENUM ('MANAGED', 'REFERENCED', 'NONE');
CREATE TYPE "IntegrationProvider" AS ENUM ('jellyfin', 'immich');
ALTER TYPE "UserAccountStatus" RENAME TO "SubscriptionStatus";

-- 2. Service gains slug, account type, integration provider and the account-source self reference.
ALTER TABLE "services" ADD COLUMN "slug" VARCHAR(64);
ALTER TABLE "services" ADD COLUMN "account_type" "AccountType" NOT NULL DEFAULT 'MANAGED';
ALTER TABLE "services" ADD COLUMN "integration_provider" "IntegrationProvider";
ALTER TABLE "services" ADD COLUMN "account_source_service_id" INTEGER;
ALTER TABLE "services" ADD COLUMN "default_allowed" BOOLEAN NOT NULL DEFAULT true;

-- Every pre-existing service is vendor-integrated and managed; name was the integration key.
UPDATE "services" SET "slug" = lower("name");
UPDATE "services" SET "integration_provider" = lower("name")::"IntegrationProvider"
    WHERE lower("name") IN ('jellyfin', 'immich');

-- A service HomeGate has no integration for cannot be provisioning accounts; an admin can reclassify it.
UPDATE "services" SET "account_type" = 'NONE' WHERE "integration_provider" IS NULL;

ALTER TABLE "services" ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX "services_slug_key" ON "services"("slug");
CREATE UNIQUE INDEX "services_integration_provider_key" ON "services"("integration_provider");
ALTER TABLE "services" ADD CONSTRAINT "services_account_source_service_id_fkey"
    FOREIGN KEY ("account_source_service_id") REFERENCES "services"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- 3. Subscriptions. Ids are carried over from user_accounts so existing references stay valid.
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "service_id" INTEGER NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'provisioning',
    "expires_at" TIMESTAMPTZ(6),
    "auto_renew" BOOLEAN NOT NULL DEFAULT false,
    "derived_from_subscription_id" UUID,
    "provisioned_at" TIMESTAMPTZ(6),
    "failed_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),
    "failed_operation" "FailedOperation",
    "last_error" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

INSERT INTO "subscriptions" (
    "id", "user_id", "service_id", "status", "expires_at", "auto_renew",
    "provisioned_at", "failed_at", "cancelled_at", "failed_operation",
    "last_error", "retry_count", "created_at", "updated_at"
)
SELECT
    "id", "user_id", "service_id", "status", "expires_at", "auto_renew",
    "provisioned_at", "failed_at", "cancelled_at", "failed_operation",
    "last_error", "retry_count", "created_at", "updated_at"
FROM "user_accounts";

CREATE UNIQUE INDEX "subscriptions_user_id_service_id_key" ON "subscriptions"("user_id", "service_id");
CREATE INDEX "subscriptions_derived_from_subscription_id_idx" ON "subscriptions"("derived_from_subscription_id");

ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_service_id_fkey"
    FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_derived_from_subscription_id_fkey"
    FOREIGN KEY ("derived_from_subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. External accounts, one per subscription that actually has credentials.
CREATE TABLE "external_user_accounts" (
    "id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "service_id" INTEGER NOT NULL,
    "external_account_id" TEXT,
    "username" VARCHAR(64),
    "email" VARCHAR(254),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "external_user_accounts_pkey" PRIMARY KEY ("id")
);

INSERT INTO "external_user_accounts" (
    "id", "subscription_id", "user_id", "service_id",
    "external_account_id", "username", "created_at", "updated_at"
)
SELECT
    gen_random_uuid(), "id", "user_id", "service_id",
    "user_service_account_id", "username", "created_at", "updated_at"
FROM "user_accounts"
WHERE "user_service_account_id" IS NOT NULL OR "username" <> '';

CREATE UNIQUE INDEX "external_user_accounts_subscription_id_key" ON "external_user_accounts"("subscription_id");
CREATE UNIQUE INDEX "external_user_accounts_service_id_username_key" ON "external_user_accounts"("service_id", "username");
CREATE UNIQUE INDEX "external_user_accounts_service_id_external_account_id_key" ON "external_user_accounts"("service_id", "external_account_id");

ALTER TABLE "external_user_accounts" ADD CONSTRAINT "external_user_accounts_subscription_id_fkey"
    FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "external_user_accounts" ADD CONSTRAINT "external_user_accounts_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "external_user_accounts" ADD CONSTRAINT "external_user_accounts_service_id_fkey"
    FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- 5. invite_accounts becomes invite_subscriptions.
ALTER TABLE "invite_accounts" RENAME TO "invite_subscriptions";
ALTER TABLE "invite_subscriptions" RENAME CONSTRAINT "invite_accounts_pkey" TO "invite_subscriptions_pkey";
ALTER TABLE "invite_subscriptions" RENAME CONSTRAINT "invite_accounts_invite_id_fkey" TO "invite_subscriptions_invite_id_fkey";
ALTER TABLE "invite_subscriptions" RENAME CONSTRAINT "invite_accounts_service_id_fkey" TO "invite_subscriptions_service_id_fkey";
ALTER INDEX "invite_accounts_invite_id_service_id_key" RENAME TO "invite_subscriptions_invite_id_service_id_key";

-- 6. user_accounts is now fully superseded.
DROP TABLE "user_accounts";

-- 7. The scheduled task rename is persisted in config and in the run history.
UPDATE "system_metadata"
SET "value" = ("value" - 'sync_client_accounts')
              || jsonb_build_object('sync_integration_accounts', "value"->'sync_client_accounts')
WHERE "key" = 'tasks' AND "value" ? 'sync_client_accounts';

UPDATE "task_runs" SET "task_name" = 'sync_integration_accounts' WHERE "task_name" = 'sync_client_accounts';
