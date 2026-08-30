import { Test, TestingModule } from '@nestjs/testing'
import { SubscriptionCascadeService } from '@/core/subscriptions/subscriptionCascade.service'
import { IServiceRepository, ISubscriptionRepository } from '@/data/repositories'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { SubscriptionStatus } from '@/types/enums'
import { createSubscriptionRepositoryMock } from '../../mocks/subscription.repository.mock'
import { createServiceRepositoryMock } from '../../mocks/service.repository.mock'
import { createLoggerMock } from '../../mocks/logger.provider.mock'
import { createSubscriptionFixture } from '../../fixtures/subscription.stub'
import { createReferencedServiceFixture, createServiceFixture, createNoAccountServiceFixture } from '../../fixtures/service.stub'

const IN_10_DAYS = new Date(Date.now() + 10 * 86_400_000)
const IN_30_DAYS = new Date(Date.now() + 30 * 86_400_000)
const YESTERDAY = new Date(Date.now() - 86_400_000)

describe('SubscriptionCascadeService', () => {
    let cascade: SubscriptionCascadeService
    let subscriptionRepoMock: ReturnType<typeof createSubscriptionRepositoryMock>
    let serviceRepoMock: ReturnType<typeof createServiceRepositoryMock>

    beforeEach(async () => {
        subscriptionRepoMock = createSubscriptionRepositoryMock()
        serviceRepoMock = createServiceRepositoryMock()

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SubscriptionCascadeService,
                { provide: ISubscriptionRepository, useValue: subscriptionRepoMock },
                { provide: IServiceRepository, useValue: serviceRepoMock },
                { provide: LoggingProvider, useValue: createLoggerMock() },
            ],
        }).compile()

        cascade = module.get(SubscriptionCascadeService)
    })

    describe('resolveEffectiveEntitlement', () => {
        it('uses the subscription itself when it derives from no source', async () => {
            const subscription = createSubscriptionFixture({ expiresAt: IN_30_DAYS })

            const result = await cascade.resolveEffectiveEntitlement(subscription)

            expect(result).toEqual({ active: true, expiresAt: IN_30_DAYS })
        })

        it('clamps expiry to the source when the source expires sooner', async () => {
            const source = createSubscriptionFixture({ id: 'source-1', expiresAt: IN_10_DAYS })
            const derived = createSubscriptionFixture({
                id: 'derived-1',
                expiresAt: IN_30_DAYS,
                derivedFromSubscriptionId: 'source-1',
            })
            subscriptionRepoMock.findById.mockResolvedValue(source)

            const result = await cascade.resolveEffectiveEntitlement(derived)

            expect(result.expiresAt).toEqual(IN_10_DAYS)
            expect(result.active).toBe(true)
        })

        it('keeps its own expiry when that is the earlier of the two', async () => {
            const source = createSubscriptionFixture({ id: 'source-1', expiresAt: IN_30_DAYS })
            const derived = createSubscriptionFixture({
                id: 'derived-1',
                expiresAt: IN_10_DAYS,
                derivedFromSubscriptionId: 'source-1',
            })
            subscriptionRepoMock.findById.mockResolvedValue(source)

            const result = await cascade.resolveEffectiveEntitlement(derived)

            expect(result.expiresAt).toEqual(IN_10_DAYS)
        })

        it('is inactive when the source is not active, however long its own expiry runs', async () => {
            const source = createSubscriptionFixture({
                id: 'source-1',
                status: SubscriptionStatus.cancelled,
                expiresAt: IN_30_DAYS,
            })
            const derived = createSubscriptionFixture({
                expiresAt: IN_30_DAYS,
                derivedFromSubscriptionId: 'source-1',
            })
            subscriptionRepoMock.findById.mockResolvedValue(source)

            const result = await cascade.resolveEffectiveEntitlement(derived)

            expect(result.active).toBe(false)
        })

        it('is inactive when the source has expired', async () => {
            const source = createSubscriptionFixture({ id: 'source-1', expiresAt: YESTERDAY })
            const derived = createSubscriptionFixture({
                expiresAt: IN_30_DAYS,
                derivedFromSubscriptionId: 'source-1',
            })
            subscriptionRepoMock.findById.mockResolvedValue(source)

            const result = await cascade.resolveEffectiveEntitlement(derived)

            expect(result.active).toBe(false)
        })

        it('is inactive when the source has vanished', async () => {
            const derived = createSubscriptionFixture({
                expiresAt: IN_30_DAYS,
                derivedFromSubscriptionId: 'missing-source',
            })
            subscriptionRepoMock.findById.mockResolvedValue(null)

            const result = await cascade.resolveEffectiveEntitlement(derived)

            expect(result.active).toBe(false)
        })
    })

    describe('onActivated', () => {
        it('creates a derived subscription copying the source expiry and auto-renew', async () => {
            const source = createSubscriptionFixture({ id: 'source-1', expiresAt: IN_30_DAYS, autoRenew: true })
            serviceRepoMock.findMany.mockResolvedValue([createReferencedServiceFixture()])
            subscriptionRepoMock.find.mockResolvedValue(null)

            await cascade.onActivated(source)

            expect(subscriptionRepoMock.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: source.userId,
                    serviceId: 2,
                    status: SubscriptionStatus.active,
                    expiresAt: IN_30_DAYS,
                    autoRenew: true,
                    derivedFromSubscriptionId: 'source-1',
                })
            )
        })

        it('ignores services that merely point at the source without being REFERENCED', async () => {
            serviceRepoMock.findMany.mockResolvedValue([createServiceFixture({ accountSourceServiceId: 1 })])

            await cascade.onActivated(createSubscriptionFixture())

            expect(subscriptionRepoMock.create).not.toHaveBeenCalled()
        })
    })

    describe('onReferencedServiceCreated', () => {
        it('mirrors each active account source subscription onto the new service', async () => {
            const source = createSubscriptionFixture({
                id: 'source-1',
                userId: 'user-a',
                serviceId: 1,
                expiresAt: IN_30_DAYS,
            })
            subscriptionRepoMock.findMany.mockResolvedValue([source])
            subscriptionRepoMock.find.mockResolvedValue(null)

            const result = await cascade.onReferencedServiceCreated(createReferencedServiceFixture())

            expect(subscriptionRepoMock.findMany).toHaveBeenCalledWith(
                { serviceId: 1, status: SubscriptionStatus.active },
                Number.MAX_SAFE_INTEGER
            )
            expect(subscriptionRepoMock.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'user-a',
                    serviceId: 2,
                    status: SubscriptionStatus.active,
                    autoRenew: true,
                    expiresAt: IN_30_DAYS,
                    derivedFromSubscriptionId: 'source-1',
                    provisionedAt: expect.any(Date),
                })
            )
            expect(result).toEqual(['user-a'])
        })

        it('skips account source subscriptions that have already expired', async () => {
            const expired = createSubscriptionFixture({
                id: 'source-1',
                userId: 'user-a',
                expiresAt: YESTERDAY,
            })
            subscriptionRepoMock.findMany.mockResolvedValue([expired])

            await cascade.onReferencedServiceCreated(createReferencedServiceFixture())

            expect(subscriptionRepoMock.create).not.toHaveBeenCalled()
        })

        it('returns no users and creates nothing when the service has no account source', async () => {
            const result = await cascade.onReferencedServiceCreated(createNoAccountServiceFixture())

            expect(subscriptionRepoMock.findMany).not.toHaveBeenCalled()
            expect(subscriptionRepoMock.create).not.toHaveBeenCalled()
            expect(result).toEqual([])
        })

        it('re-targets an existing mirror subscription onto the account source', async () => {
            const source = createSubscriptionFixture({
                id: 'source-1',
                userId: 'user-a',
                expiresAt: IN_30_DAYS,
            })
            subscriptionRepoMock.findMany.mockResolvedValue([source])
            subscriptionRepoMock.find.mockResolvedValue(
                createSubscriptionFixture({ userId: 'user-a', serviceId: 2, derivedFromSubscriptionId: 'old-source' })
            )

            const result = await cascade.onReferencedServiceCreated(createReferencedServiceFixture())

            expect(subscriptionRepoMock.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'user-a',
                    serviceId: 2,
                    status: SubscriptionStatus.active,
                    autoRenew: true,
                    expiresAt: IN_30_DAYS,
                    derivedFromSubscriptionId: 'source-1',
                    cancelledAt: null,
                })
            )
            expect(result).toEqual(['user-a'])
        })
    })

    describe('onDeactivated', () => {
        it('cascades the status to every derived subscription', async () => {
            const derived = createSubscriptionFixture({ id: 'derived-1', serviceId: 2 })
            subscriptionRepoMock.findMany.mockResolvedValue([derived])

            await cascade.onDeactivated(createSubscriptionFixture({ id: 'source-1' }), SubscriptionStatus.cancelled)

            expect(subscriptionRepoMock.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    serviceId: 2,
                    status: SubscriptionStatus.cancelled,
                    cancelledAt: expect.any(Date),
                })
            )
        })
    })

    describe('onExpiryChanged', () => {
        it('re-clamps a derived subscription that now outlives its source', async () => {
            const derived = createSubscriptionFixture({ id: 'derived-1', serviceId: 2, expiresAt: IN_30_DAYS })
            subscriptionRepoMock.findMany.mockResolvedValue([derived])

            await cascade.onExpiryChanged(createSubscriptionFixture({ id: 'source-1', expiresAt: IN_10_DAYS }))

            expect(subscriptionRepoMock.update).toHaveBeenCalledWith(
                expect.objectContaining({ serviceId: 2, expiresAt: IN_10_DAYS })
            )
        })

        it('leaves a derived subscription alone when its expiry already matches', async () => {
            const derived = createSubscriptionFixture({ id: 'derived-1', expiresAt: IN_10_DAYS })
            subscriptionRepoMock.findMany.mockResolvedValue([derived])

            await cascade.onExpiryChanged(createSubscriptionFixture({ id: 'source-1', expiresAt: IN_10_DAYS }))

            expect(subscriptionRepoMock.update).not.toHaveBeenCalled()
        })
    })
})
