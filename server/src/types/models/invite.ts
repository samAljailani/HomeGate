export type InviteModel = {
    id: string
    token: string
    email: string | null
    expiresAt: Date
    createdAt: Date
    usedAt: Date | null
    revokedAt: Date | null
    createdByUserId: string | null
    usedByUserId: string | null
}

export type CreateInviteModel = Pick<InviteModel, 'token' | 'email' | 'expiresAt' | 'createdByUserId'>
