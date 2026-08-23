/**
 * Minutes a user has to complete an invite sign-up after being redirected to the sign-in page.
 *
 * This is a UX / defense-in-depth window, not the security gate — the invite's own `expiresAt`
 * (re-checked during redemption) is the real expiry. It also bounds how long a provisional
 * (PENDING) account may sit before it is reaped by scheduled cleanup.
 */
export const SIGNUP_COMPLETION_WINDOW_MINUTES = 10
