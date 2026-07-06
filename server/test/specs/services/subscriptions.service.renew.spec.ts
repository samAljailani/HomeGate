import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException } from '@nestjs/common'
import { SubscriptionService } from '@/api/services/subscriptions.service'
import { IUserAccountRepository } from '@/data/repositories'
import { IServiceRepository } from '@/data/repositories'
import { UserService } from '@/api/services/user.service'
import { ApplicationClientRegistry } from '@/core/clients/applicationClientRegistry'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { createLoggerMock } from '../../mocks/logger.provider.mock'
import { createUserAccountFixture } from '../../fixtures/userAccount.stub'

function createUserAccountRepositoryMock(): jest.Mocked<Pick<IUserAccountRepository, 'find' | 'findMany' | 'update'>> {
    return {
        find: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
    }
}

function createServiceRepositoryMock(): jest.Mocked<Pick<IServiceRepository, 'findById' | 'findMany'>> {
    return {
        findById: jest.fn(),
        findMany: jest.fn(),
    }
}

describe('SubscriptionService — renew / setAutoRenew / listAll / listByUser', () => {
    let service: SubscriptionService
    let userAccountRepositoryMock: ReturnType<typeof createUserAccountRepositoryMock>
    let loggerMock: ReturnType<typeof createLoggerMock>

    beforeEach(async () => {
        userAccountRepositoryMock = createUserAccountRepositoryMock()
        loggerMock = createLoggerMock()

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SubscriptionService,
                { provide: UserService, useValue: { getUserById: jest.fn() } },
                { provide: IServiceRepository, useValue: createServiceRepositoryMock() },
                { provide: IUserAccountRepository, useValue: userAccountRepositoryMock },
                { provide: ApplicationClientRegistry, useValue: { getEnabled: jest.fn().mockResolvedValue([]) } },
                { provide: LoggingProvider, useValue: loggerMock },
            ],
        }).compile()

        service = module.get<SubscriptionService>(SubscriptionService)
    })

    // #region renew

    describe('renew', () => {
        const userId = 'user-uuid-1'
        const serviceId = 1

        it('throws BadRequestException when subscription not found', async () => {
            userAccountRepositoryMock.find.mockResolvedValue(null)

            await expect(service.renew(userId, serviceId)).rejects.toThrow(BadRequestException)
        })

        it('extends expiry from current expiresAt when still in the future', async () => {
            const futureExpiry = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) // 10 days from now
            const account = createUserAccountFixture({ userId, serviceId, expiresAt: futureExpiry })
            const updated = { ...account, expiresAt: new Date(futureExpiry.getTime() + 30 * 24 * 60 * 60 * 1000) }
            userAccountRepositoryMock.find.mockResolvedValue(account)
            userAccountRepositoryMock.update.mockResolvedValue(updated)

            const result = await service.renew(userId, serviceId)

            const newExpiry = userAccountRepositoryMock.update.mock.calls[0]![0]!.expiresAt!
            expect(newExpiry.getTime()).toBeGreaterThan(futureExpiry.getTime())
            expect(result).toBe(updated)
        })

        it('extends expiry from now when already expired', async () => {
            const pastExpiry = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
            const account = createUserAccountFixture({ userId, serviceId, expiresAt: pastExpiry })
            const updated = { ...account }
            userAccountRepositoryMock.find.mockResolvedValue(account)
            userAccountRepositoryMock.update.mockResolvedValue(updated)

            await service.renew(userId, serviceId)

            const newExpiry = userAccountRepositoryMock.update.mock.calls[0]![0]!.expiresAt!
            const thirtyDaysFromNow = Date.now() + 30 * 24 * 60 * 60 * 1000
            expect(newExpiry.getTime()).toBeGreaterThan(Date.now())
            expect(newExpiry.getTime()).toBeLessThanOrEqual(thirtyDaysFromNow + 1000)
        })

        it('throws BadRequestException when update returns null', async () => {
            const account = createUserAccountFixture({ userId, serviceId })
            userAccountRepositoryMock.find.mockResolvedValue(account)
            userAccountRepositoryMock.update.mockResolvedValue(null)

            await expect(service.renew(userId, serviceId)).rejects.toThrow(BadRequestException)
        })
    })

    // #endregion renew

    // #region setAutoRenew

    describe('setAutoRenew', () => {
        const userId = 'user-uuid-1'
        const serviceId = 1

        it('throws BadRequestException when subscription not found', async () => {
            userAccountRepositoryMock.find.mockResolvedValue(null)

            await expect(service.setAutoRenew(userId, serviceId, true)).rejects.toThrow(BadRequestException)
        })

        it('sets autoRenew to true', async () => {
            const account = createUserAccountFixture({ userId, serviceId, autoRenew: false })
            const updated = { ...account, autoRenew: true }
            userAccountRepositoryMock.find.mockResolvedValue(account)
            userAccountRepositoryMock.update.mockResolvedValue(updated)

            const result = await service.setAutoRenew(userId, serviceId, true)

            expect(userAccountRepositoryMock.update).toHaveBeenCalledWith(
                expect.objectContaining({ userId, serviceId, autoRenew: true })
            )
            expect(result.autoRenew).toBe(true)
        })

        it('sets autoRenew to false', async () => {
            const account = createUserAccountFixture({ userId, serviceId, autoRenew: true })
            const updated = { ...account, autoRenew: false }
            userAccountRepositoryMock.find.mockResolvedValue(account)
            userAccountRepositoryMock.update.mockResolvedValue(updated)

            const result = await service.setAutoRenew(userId, serviceId, false)

            expect(userAccountRepositoryMock.update).toHaveBeenCalledWith(
                expect.objectContaining({ userId, serviceId, autoRenew: false })
            )
            expect(result.autoRenew).toBe(false)
        })

        it('throws BadRequestException when update returns null', async () => {
            const account = createUserAccountFixture({ userId, serviceId })
            userAccountRepositoryMock.find.mockResolvedValue(account)
            userAccountRepositoryMock.update.mockResolvedValue(null)

            await expect(service.setAutoRenew(userId, serviceId, true)).rejects.toThrow(BadRequestException)
        })
    })

    // #endregion setAutoRenew

    // #region listAll

    describe('listAll', () => {
        it('returns all subscriptions', async () => {
            const accounts = [
                createUserAccountFixture({ userId: 'a', serviceId: 1 }),
                createUserAccountFixture({ userId: 'b', serviceId: 2 }),
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
                createUserAccountFixture({ userId, serviceId: 1 }),
                createUserAccountFixture({ userId, serviceId: 2 }),
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
