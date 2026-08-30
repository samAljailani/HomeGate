import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { SubscriptionService } from '@/api/services/subscriptions.service'
import { ISubscriptionRepository, IExternalUserAccountRepository } from '@/data/repositories'
import { IServiceRepository } from '@/data/repositories'
import { UserService } from '@/api/services/user.service'
import { SubscriptionProvisionerResolver } from '@/core/subscriptions/provisioners'
import { SubscriptionCascadeService } from '@/core/subscriptions/subscriptionCascade.service'
import { ServiceAccessService } from '@/api/services/serviceAccess.service'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { AccountType } from '@/types/enums'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { createLoggerMock } from '../../mocks/logger.provider.mock'
import { createExternalUserAccountRepositoryMock } from '../../mocks/subscription.repository.mock'
import { createSubscriptionFixture, createExternalUserAccountFixture, toSubscriptionResponseDto } from '../../fixtures/subscription.stub'

function createSubscriptionRepositoryMock(): jest.Mocked<
    Pick<ISubscriptionRepository, 'find' | 'findById' | 'findMany' | 'update'>
> {
    return {
        find: jest.fn(),
        findById: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
    }
}

function createServiceRepositoryMock(): jest.Mocked<Pick<IServiceRepository, 'findById' | 'findMany'>> {
    return {
        findById: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
    }
}

describe('SubscriptionService — renew / setAutoRenew / listAll / listByUser', () => {
    let service: SubscriptionService
    let userAccountRepositoryMock: ReturnType<typeof createSubscriptionRepositoryMock>
    let loggerMock: ReturnType<typeof createLoggerMock>
    let externalAccountRepoMock: ReturnType<typeof createExternalUserAccountRepositoryMock>

    beforeEach(async () => {
        userAccountRepositoryMock = createSubscriptionRepositoryMock()
        loggerMock = createLoggerMock()
        externalAccountRepoMock = createExternalUserAccountRepositoryMock()

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SubscriptionService,
                { provide: UserService, useValue: { getUserById: jest.fn() } },
                { provide: IServiceRepository, useValue: createServiceRepositoryMock() },
                { provide: ISubscriptionRepository, useValue: userAccountRepositoryMock },
                { provide: IExternalUserAccountRepository, useValue: externalAccountRepoMock },
                { provide: SubscriptionProvisionerResolver, useValue: { resolve: jest.fn() } },
                {
                    provide: SubscriptionCascadeService,
                    useValue: { onActivated: jest.fn(), onDeactivated: jest.fn(), onReactivated: jest.fn(), onExpiryChanged: jest.fn() },
                },
                { provide: ServiceAccessService, useValue: { assertCanSubscribe: jest.fn(), resolveAccess: jest.fn() } },
                { provide: EventEmitter2, useValue: { emit: jest.fn() } },
                { provide: LoggingProvider, useValue: loggerMock },
            ],
        }).compile()

        service = module.get<SubscriptionService>(SubscriptionService)

        externalAccountRepoMock.findBySubscriptionId.mockResolvedValue(createExternalUserAccountFixture())
    })

    // #region renew

    describe('renew', () => {
        const subscriptionId = 'subscription-uuid-1'
        const userId = 'user-uuid-1'
        const serviceId = 1

        it('throws NotFoundException when subscription not found', async () => {
            userAccountRepositoryMock.findById.mockResolvedValue(null)

            await expect(service.renew(subscriptionId)).rejects.toThrow(NotFoundException)
        })

        it('extends expiry from current expiresAt when still in the future', async () => {
            const futureExpiry = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) // 10 days from now
            const account = createSubscriptionFixture({ id: subscriptionId, userId, serviceId, expiresAt: futureExpiry })
            const updated = { ...account, expiresAt: new Date(futureExpiry.getTime() + 30 * 24 * 60 * 60 * 1000) }
            userAccountRepositoryMock.findById.mockResolvedValue(account)
            userAccountRepositoryMock.update.mockResolvedValue(updated)

            const result = await service.renew(subscriptionId)

            const newExpiry = userAccountRepositoryMock.update.mock.calls[0]![0]!.expiresAt!
            expect(newExpiry.getTime()).toBeGreaterThan(futureExpiry.getTime())
            expect(result).toEqual({ ...toSubscriptionResponseDto(updated), accountType: AccountType.NONE })
        })

        it('extends expiry from now when already expired', async () => {
            const pastExpiry = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
            const account = createSubscriptionFixture({ id: subscriptionId, userId, serviceId, expiresAt: pastExpiry })
            const updated = { ...account }
            userAccountRepositoryMock.findById.mockResolvedValue(account)
            userAccountRepositoryMock.update.mockResolvedValue(updated)

            await service.renew(subscriptionId)

            const newExpiry = userAccountRepositoryMock.update.mock.calls[0]![0]!.expiresAt!
            const thirtyDaysFromNow = Date.now() + 30 * 24 * 60 * 60 * 1000
            expect(newExpiry.getTime()).toBeGreaterThan(Date.now())
            expect(newExpiry.getTime()).toBeLessThanOrEqual(thirtyDaysFromNow + 1000)
        })

        it('throws BadRequestException when update returns null', async () => {
            const account = createSubscriptionFixture({ id: subscriptionId, userId, serviceId })
            userAccountRepositoryMock.findById.mockResolvedValue(account)
            userAccountRepositoryMock.update.mockResolvedValue(null)

            await expect(service.renew(subscriptionId)).rejects.toThrow(BadRequestException)
        })
    })

    // #endregion renew

    // #region update (autoRenew)

    describe('update — autoRenew', () => {
        const subscriptionId = 'subscription-uuid-1'
        const userId = 'user-uuid-1'
        const serviceId = 1

        it('throws BadRequestException when no fields are provided', async () => {
            await expect(service.update(subscriptionId, {})).rejects.toThrow(BadRequestException)
        })

        it('throws NotFoundException when subscription not found', async () => {
            userAccountRepositoryMock.findById.mockResolvedValue(null)

            await expect(service.update(subscriptionId, { autoRenew: true })).rejects.toThrow(NotFoundException)
        })

        it('sets autoRenew to true', async () => {
            const account = createSubscriptionFixture({ id: subscriptionId, userId, serviceId, autoRenew: false })
            const updated = { ...account, autoRenew: true }
            userAccountRepositoryMock.findById.mockResolvedValueOnce(account).mockResolvedValueOnce(updated)
            userAccountRepositoryMock.update.mockResolvedValue(updated)

            const result = await service.update(subscriptionId, { autoRenew: true })

            expect(userAccountRepositoryMock.update).toHaveBeenCalledWith(
                expect.objectContaining({ userId, serviceId, autoRenew: true })
            )
            expect(result.autoRenew).toBe(true)
        })

        it('sets autoRenew to false', async () => {
            const account = createSubscriptionFixture({ id: subscriptionId, userId, serviceId, autoRenew: true })
            const updated = { ...account, autoRenew: false }
            userAccountRepositoryMock.findById.mockResolvedValueOnce(account).mockResolvedValueOnce(updated)
            userAccountRepositoryMock.update.mockResolvedValue(updated)

            const result = await service.update(subscriptionId, { autoRenew: false })

            expect(userAccountRepositoryMock.update).toHaveBeenCalledWith(
                expect.objectContaining({ userId, serviceId, autoRenew: false })
            )
            expect(result.autoRenew).toBe(false)
        })

        it('throws BadRequestException when update returns null', async () => {
            const account = createSubscriptionFixture({ id: subscriptionId, userId, serviceId })
            userAccountRepositoryMock.findById.mockResolvedValue(account)
            userAccountRepositoryMock.update.mockResolvedValue(null)

            await expect(service.update(subscriptionId, { autoRenew: true })).rejects.toThrow(BadRequestException)
        })
    })

    // #endregion update (autoRenew)

    // #region listAll

    describe('listAll', () => {
        it('returns all subscriptions', async () => {
            const accounts = [
                createSubscriptionFixture({ userId: 'a', serviceId: 1 }),
                createSubscriptionFixture({ userId: 'b', serviceId: 2 }),
            ]
            userAccountRepositoryMock.findMany.mockResolvedValue(accounts)

            const result = await service.listAll()

            expect(userAccountRepositoryMock.findMany).toHaveBeenCalledWith({}, undefined, undefined)
            expect(result).toHaveLength(2)
        })

        it('returns empty array when no subscriptions exist', async () => {
            userAccountRepositoryMock.findMany.mockResolvedValue([])

            const result = await service.listAll()

            expect(result).toEqual([])
        })
    })

    // #endregion listAll

    // #region listByUser

    describe('listByUser', () => {
        const userId = 'user-uuid-1'

        it('returns subscriptions filtered by userId', async () => {
            const accounts = [
                createSubscriptionFixture({ userId, serviceId: 1 }),
                createSubscriptionFixture({ userId, serviceId: 2 }),
            ]
            userAccountRepositoryMock.findMany.mockResolvedValue(accounts)

            const result = await service.listByUser(userId)

            expect(userAccountRepositoryMock.findMany).toHaveBeenCalledWith({ userId }, undefined, undefined)
            expect(result).toHaveLength(2)
        })

        it('returns empty array when user has no subscriptions', async () => {
            userAccountRepositoryMock.findMany.mockResolvedValue([])

            const result = await service.listByUser(userId)

            expect(result).toEqual([])
        })
    })

    // #endregion listByUser
})
