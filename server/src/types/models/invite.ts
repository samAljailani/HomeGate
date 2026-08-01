export const InviteRevokedReason = {
    ADMIN: 'ADMIN',
    AUTO_FAILED_ATTEMPTS: 'AUTO_FAILED_ATTEMPTS',
    AUTO_SUPERSEDED: 'AUTO_SUPERSEDED',
} as const

export type InviteRevokedReason = (typeof InviteRevokedReason)[keyof typeof InviteRevokedReason]

export type InviteModel = {
    id: string
    token: string
    email: string | null
    expiresAt: Date
    createdAt: Date
    usedAt: Date | null
    revokedAt: Date | null
    revokedReason: InviteRevokedReason | null
    failedAttempts: number
    createdByUserId: string | null
    usedByUserId: string | null
    revokedByUserId: string | null
}

export type CreateInviteModel = Pick<InviteModel, 'token' | 'email' | 'expiresAt' | 'createdByUserId'>
