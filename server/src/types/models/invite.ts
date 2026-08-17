export const InviteRevokedReason = {
    ADMIN: 'ADMIN',
    AUTO_FAILED_ATTEMPTS: 'AUTO_FAILED_ATTEMPTS',
    AUTO_SUPERSEDED: 'AUTO_SUPERSEDED',
} as const

export type InviteRevokedReason = (typeof InviteRevokedReason)[keyof typeof InviteRevokedReason]

export type InviteAccountModel = {
    id: string
    inviteId: string
    serviceId: number
    serviceName: string
    username: string | null
    email: string | null
    accountId: string | null
}

export type InviteModel = {
    id: string
    token: string
    email: string | null
    isAdmin: boolean
    expiresAt: Date
    createdAt: Date
    usedAt: Date | null
    revokedAt: Date | null
    revokedReason: InviteRevokedReason | null
    failedAttempts: number
    createdByUserId: string | null
    usedByUserId: string | null
    revokedByUserId: string | null
    createdByUsername: string | null
    usedByUsername: string | null
    revokedByUsername: string | null
    accounts: InviteAccountModel[]
}

export type CreateInviteModel = Pick<InviteModel, 'token' | 'email' | 'isAdmin' | 'expiresAt' | 'createdByUserId'>

export type UpdateInviteModel = Partial<Pick<InviteModel, 'email' | 'expiresAt' | 'isAdmin' | 'revokedAt' | 'revokedReason' | 'revokedByUserId'>>

export type CreateInviteAccountModel = {
    serviceId: number
    username?: string
    email?: string
    accountId?: string
}
