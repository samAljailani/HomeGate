import { UserAccountModel } from '@/types/models/userAccount'
import { UserAccountStatus } from '@/types/enums'
import { SubscriptionResponseDto } from '@/types/dtos/subscriptionsDto'

export function createUserAccountFixture(overrides: Partial<UserAccountModel> = {}): UserAccountModel {
    const now = new Date('2026-07-01T00:00:00Z')
    const expiresAt = new Date('2026-07-31T00:00:00Z')

    return {
        id: 'subscription-uuid-1',
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

export function toSubscriptionResponseDto(model: UserAccountModel): SubscriptionResponseDto {
    return {
        id: model.id,
        userId: model.userId,
        serviceId: model.serviceId,
        username: model.username,
        status: model.status,
        autoRenew: model.autoRenew,
        createdAt: model.createdAt,
        updatedAt: model.updatedAt,
        expiresAt: model.expiresAt,
        provisionedAt: model.provisionedAt,
        cancelledAt: model.cancelledAt,
    }
}
