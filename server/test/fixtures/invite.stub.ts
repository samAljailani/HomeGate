import { InviteModel } from '@/types/models/invite'

export function createInviteFixture(overrides: Partial<InviteModel> = {}): InviteModel {
    return {
        id: 'invite-id-123',
        token: 'a'.repeat(64),
        email: null,
        isAdmin: false,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date('2026-01-01T00:00:00Z'),
        usedAt: null,
        revokedAt: null,
        revokedReason: null,
        failedAttempts: 0,
        createdByUserId: null,
        usedByUserId: null,
        revokedByUserId: null,
        createdByUsername: null,
        usedByUsername: null,
        revokedByUsername: null,
        accounts: [],
        ...overrides,
    }
}
