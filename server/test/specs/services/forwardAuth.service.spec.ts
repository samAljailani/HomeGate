import { Test, TestingModule } from '@nestjs/testing'
import { ForwardAuthService } from '@/api/services/forwardAuth.service'
import { IServiceRepository, ISubscriptionRepository } from '@/data/repositories'
import { ServiceAccessService } from '@/api/services/serviceAccess.service'
import { SubscriptionCascadeService } from '@/core/subscriptions/subscriptionCascade.service'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { createLoggerMock } from '../../mocks/logger.provider.mock'
import { createServiceFixture, createNoAccountServiceFixture } from '../../fixtures/service.stub'
import { createSubscriptionFixture } from '../../fixtures/subscription.stub'
import { SubscriptionStatus } from '@/types/enums'

function createServiceRepoMock() {
    return { findEnabled: jest.fn().mockResolvedValue([]) }
}

function createSubscriptionRepoMock() {
    return { find: jest.fn().mockResolvedValue(null) }
}

function createAccessServiceMock() {
    return { canSubscribe: jest.fn().mockResolvedValue(true) }
}

function createCascadeMock() {
    return { resolveEffectiveEntitlement: jest.fn().mockResolvedValue({ active: true, expiresAt: null }) }
}

describe('ForwardAuthService', () => {
    let service: ForwardAuthService
    let serviceRepo: ReturnType<typeof createServiceRepoMock>
    let subscriptionRepo: ReturnType<typeof createSubscriptionRepoMock>
    let accessService: ReturnType<typeof createAccessServiceMock>
    let cascade: ReturnType<typeof createCascadeMock>
    let loggerMock: ReturnType<typeof createLoggerMock>

    beforeEach(async () => {
        serviceRepo = createServiceRepoMock()
        subscriptionRepo = createSubscriptionRepoMock()
        accessService = createAccessServiceMock()
        cascade = createCascadeMock()
        loggerMock = createLoggerMock()

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ForwardAuthService,
                { provide: IServiceRepository, useValue: serviceRepo },
                { provide: ISubscriptionRepository, useValue: subscriptionRepo },
                { provide: ServiceAccessService, useValue: accessService },
                { provide: SubscriptionCascadeService, useValue: cascade },
                { provide: LoggingProvider, useValue: loggerMock },
            ],
        }).compile()

        service = module.get(ForwardAuthService)
    })

    // #region resolveService

    describe('resolveService', () => {
        it('matches hostname from service url', async () => {
            const svc = createNoAccountServiceFixture({ url: 'https://wiki.example.com' })
            serviceRepo.findEnabled.mockResolvedValue([svc])

            const result = await service.resolveService('wiki.example.com')
            expect(result).toBe(svc)
        })

        it('returns null when no service matches', async () => {
            serviceRepo.findEnabled.mockResolvedValue([
                createServiceFixture({ url: 'https://jellyfin.example.com' }),
            ])

            const result = await service.resolveService('unknown.example.com')
            expect(result).toBeNull()
        })

        it('skips services with no url', async () => {
            serviceRepo.findEnabled.mockResolvedValue([createServiceFixture({ url: null })])

            const result = await service.resolveService('anything.example.com')
            expect(result).toBeNull()
        })
    })

    // #endregion resolveService

    // #region isAuthorized

    describe('isAuthorized', () => {
        const svc = createServiceFixture({ id: 1, url: 'https://jellyfin.example.com' })
        const userId = 'user-1'

        it('returns true when user has an active entitled subscription and passes policy', async () => {
            subscriptionRepo.find.mockResolvedValue(createSubscriptionFixture({ status: SubscriptionStatus.active }))

            const result = await service.isAuthorized(userId, svc)
            expect(result).toBe(true)
        })

        it('returns false when policy denies access', async () => {
            accessService.canSubscribe.mockResolvedValue(false)

            const result = await service.isAuthorized(userId, svc)
            expect(result).toBe(false)
            expect(loggerMock.log).toHaveBeenCalledWith(
                expect.stringContaining(`Forward-auth denied for user '${userId}' on service '${svc.slug}': not allowed by policy`)
            )
        })

        it('returns false when no subscription exists', async () => {
            const result = await service.isAuthorized(userId, svc)
            expect(result).toBe(false)
            expect(loggerMock.log).toHaveBeenCalledWith(
                expect.stringContaining(`Forward-auth denied for user '${userId}' on service '${svc.slug}': no subscription`)
            )
        })

        it('returns false when entitlement is not active', async () => {
            subscriptionRepo.find.mockResolvedValue(createSubscriptionFixture({ status: SubscriptionStatus.active }))
            cascade.resolveEffectiveEntitlement.mockResolvedValue({ active: false, expiresAt: null })

            const result = await service.isAuthorized(userId, svc)
            expect(result).toBe(false)
            expect(loggerMock.log).toHaveBeenCalledWith(
                expect.stringContaining(`Forward-auth denied for user '${userId}' on service '${svc.slug}': subscription not entitled`)
            )
        })

        it('caches the result and does not re-query on second call', async () => {
            subscriptionRepo.find.mockResolvedValue(createSubscriptionFixture({ status: SubscriptionStatus.active }))

            await service.isAuthorized(userId, svc)
            await service.isAuthorized(userId, svc)

            expect(subscriptionRepo.find).toHaveBeenCalledTimes(1)
        })
    })

    // #endregion isAuthorized

    // #region cache invalidation

    describe('cache invalidation', () => {
        const svc = createServiceFixture({ id: 1 })
        const userId = 'user-1'

        it('clears cache entries for the user on SUBSCRIPTION_CHANGED', async () => {
            subscriptionRepo.find.mockResolvedValue(createSubscriptionFixture({ status: SubscriptionStatus.active }))

            await service.isAuthorized(userId, svc)
            expect(subscriptionRepo.find).toHaveBeenCalledTimes(1)

            service.handleInvalidation({ userId })

            expect(loggerMock.log).toHaveBeenCalledWith(
                expect.stringContaining(`Invalidated 1 forward-auth cache entry for user '${userId}'`)
            )

            subscriptionRepo.find.mockResolvedValue(null)
            const result = await service.isAuthorized(userId, svc)

            expect(subscriptionRepo.find).toHaveBeenCalledTimes(2)
            expect(result).toBe(false)
        })

        it('does not clear other users cache entries', async () => {
            subscriptionRepo.find.mockResolvedValue(createSubscriptionFixture({ status: SubscriptionStatus.active }))

            await service.isAuthorized('user-2', svc)

            service.handleInvalidation({ userId: 'user-1' })

            expect(loggerMock.log).toHaveBeenCalledWith(
                expect.stringContaining(`Invalidated 0 forward-auth cache entries for user 'user-1'`)
            )

            await service.isAuthorized('user-2', svc)
            expect(subscriptionRepo.find).toHaveBeenCalledTimes(1)
        })
    })

    // #endregion cache invalidation
})
