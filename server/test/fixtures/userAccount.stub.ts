import { UserAccountModel } from '@/types/models/userAccount'
import { UserAccountStatus } from '@/types/enums'

export function createUserAccountFixture(overrides: Partial<UserAccountModel> = {}): UserAccountModel {
    const now = new Date('2026-07-01T00:00:00Z')
    const expiresAt = new Date('2026-07-31T00:00:00Z')

    return {
        userId: 'user-uuid-1',
        serviceId: 1,
        userServiceAccountId: 'external-id-1',
        username: 'testuser',
        status: UserAccountStatus.active,
        autoRenew: true,
        createdAt: now,
        updatedAt: now,
        expiresAt,
        provisionedAt: now,
        failedAt: null,
        cancelledAt: null,
        failedOperation: null,
        lastError: null,
        retryCount: 0,
        ...overrides,
    }
}
