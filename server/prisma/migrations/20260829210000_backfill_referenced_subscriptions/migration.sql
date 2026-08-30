-- Backfill subscriptions for REFERENCED services, one per user, mirroring the user's active
-- subscription to the parent MANAGED service (the account source). Mirrors the runtime behaviour of
-- SubscriptionCascadeService.onActivated, so a referenced subscription is only created/repaired
-- while its account source subscription is active and unexpired. Idempotent: inserts skip existing
-- (user_id, service_id) rows and updates skip rows already aligned with an active source.

-- 1. Guard: every REFERENCED service must name a MANAGED account source. The API enforces this
--    (ServiceManagementService.resolveAccountSource), so this protects against externally-modified
--    data and chained references, which the entitlement clamp cannot resolve.
DO $$
DECLARE
    n int;
    details text;
BEGIN
    SELECT count(*), string_agg(t.bad, '; ')
      INTO n, details
    FROM (
        SELECT s."id"::text || ' (' || s."slug" || ')' AS bad
        FROM "services" s
        LEFT JOIN "services" src ON src."id" = s."account_source_service_id"
        WHERE s."account_type" = 'REFERENCED'
          AND (s."account_source_service_id" IS NULL
               OR s."account_source_service_id" = s."id"
               OR src."account_type" IS DISTINCT FROM 'MANAGED')
    ) t;

    IF n > 0 THEN
        RAISE EXCEPTION
            'Cannot backfill referenced subscriptions: % REFERENCED service(s) lack a valid MANAGED account source: %.',
            n, details;
    END IF;
END $$;

-- 2. Create a subscription on each enabled REFERENCED service for every user whose account source
--    subscription is active and unexpired, inheriting its expiry and auto-renew setting.
INSERT INTO "subscriptions" (
    "id", "user_id", "service_id", "status", "expires_at", "auto_renew",
    "derived_from_subscription_id", "provisioned_at", "created_at", "updated_at"
)
SELECT
    gen_random_uuid(),
    p."user_id",
    r."id",
    'active',
    p."expires_at",
    p."auto_renew",
    p."id",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "services" r
INNER JOIN "services" src ON src."id" = r."account_source_service_id"
INNER JOIN "subscriptions" p
    ON p."service_id" = src."id"
   AND p."status" = 'active'
   AND (p."expires_at" IS NULL OR p."expires_at" > CURRENT_TIMESTAMP)
WHERE r."account_type" = 'REFERENCED'
  AND r."enabled"
ON CONFLICT ("user_id", "service_id") DO NOTHING;

-- 3. Repair existing referenced subscriptions so they mirror the active account source (re-clamp
--    expiry, re-point the derivation, clear any terminal/paused state) instead of recreating them.
UPDATE "subscriptions" d
SET "status" = 'active',
    "expires_at" = p."expires_at",
    "auto_renew" = p."auto_renew",
    "derived_from_subscription_id" = p."id",
    "provisioned_at" = COALESCE(d."provisioned_at", CURRENT_TIMESTAMP),
    "cancelled_at" = NULL,
    "failed_at" = NULL,
    "failed_operation" = NULL,
    "last_error" = NULL,
    "retry_count" = 0,
    "updated_at" = CURRENT_TIMESTAMP
FROM "services" r
INNER JOIN "services" src ON src."id" = r."account_source_service_id"
INNER JOIN "subscriptions" p
    ON p."service_id" = src."id"
   AND p."status" = 'active'
   AND (p."expires_at" IS NULL OR p."expires_at" > CURRENT_TIMESTAMP)
WHERE d."service_id" = r."id"
  AND r."account_type" = 'REFERENCED'
  AND r."enabled"
  AND d."user_id" = p."user_id"
  AND (
        d."status" IS DISTINCT FROM 'active'
        OR d."expires_at" IS DISTINCT FROM p."expires_at"
        OR d."auto_renew" IS DISTINCT FROM p."auto_renew"
        OR d."derived_from_subscription_id" IS DISTINCT FROM p."id"
        OR d."cancelled_at" IS NOT NULL
        OR d."failed_at" IS NOT NULL
  );