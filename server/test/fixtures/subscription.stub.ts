import { SubscriptionModel } from '@/types/models/subscription'
import { ExternalUserAccountModel } from '@/types/models/externalUserAccount'
import { AccountType, SubscriptionStatus } from '@/types/enums'
import { SubscriptionResponseDto } from '@/types/dtos/subscriptionsDto'

export function createSubscriptionFixture(overrides: Partial<SubscriptionModel> = {}): SubscriptionModel {
    const now = new Date('2026-07-01T00:00:00Z')
    const expiresAt = new Date('2026-07-31T00:00:00Z')

    return {
        id: 'subscription-uuid-1',
        userId: 'user-uuid-1',
        serviceId: 1,
        status: SubscriptionStatus.active,
        autoRenew: true,
        derivedFromSubscriptionId: null,
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

export function createExternalUserAccountFixture(
    overrides: Partial<ExternalUserAccountModel> = {}
): ExternalUserAccountModel {
    const now = new Date('2026-07-01T00:00:00Z')

    return {
        id: 'external-account-uuid-1',
        subscriptionId: 'subscription-uuid-1',
        userId: 'user-uuid-1',
        serviceId: 1,
        externalAccountId: 'external-id-1',
        username: 'testuser',
        email: null,
        createdAt: now,
        updatedAt: now,
        ...overrides,
    }
}

export function toSubscriptionResponseDto(
    model: SubscriptionModel,
    username: string | null = 'testuser'
): SubscriptionResponseDto {
    return {
        id: model.id,
        userId: model.userId,
        serviceId: model.serviceId,
        username,
        status: model.status,
        autoRenew: model.autoRenew,
        createdAt: model.createdAt,
        updatedAt: model.updatedAt,
        expiresAt: model.expiresAt,
        provisionedAt: model.provisionedAt,
        cancelledAt: model.cancelledAt,
        accountType: AccountType.MANAGED,
        derivedFromSubscriptionId: model.derivedFromSubscriptionId,
        accounts: [],
        accountCap: 1,
    }
}

export function createSubscriptionDtoFixture(
    overrides: Partial<SubscriptionResponseDto> = {}
): SubscriptionResponseDto {
    return { ...toSubscriptionResponseDto(createSubscriptionFixture()), ...overrides }
}
