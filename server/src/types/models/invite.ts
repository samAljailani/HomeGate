import { InviteRevokedReason } from '@prisma/generated'

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
