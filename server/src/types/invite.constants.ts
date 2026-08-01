/** Maximum number of days an invite may be valid for (upper bound on `expiresInDays`). */
export const MAX_INVITE_EXPIRY_DAYS = 30

/**
 * Number of failed redemption attempts (wrong recipient on a bound invite) after which
 * the invite is auto-revoked as blast-radius containment for a leaked link.
 */
export const MAX_INVITE_FAILED_ATTEMPTS = 3
