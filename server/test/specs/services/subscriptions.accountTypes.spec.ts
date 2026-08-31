import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException } from '@nestjs/common'
import { SubscriptionService } from '@/api/services/subscriptions.service'
import { UserService } from '@/api/services/user.service'
import { IServiceRepository, ISubscriptionRepository, IExternalUserAccountRepository, IUserServicePolicyRepository } from '@/data/repositories'
import { AccountIntegrationRegistry } from '@/core/integrations/accountIntegrationRegistry'
import { SubscriptionCascadeService } from '@/core/subscriptions/subscriptionCascade.service'
import { subscriptionProvisioners } from '@/core/subscriptions/provisioners'
import { ServiceAccessService } from '@/api/services/serviceAccess.service'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { SubscriptionStatus } from '@/types/enums'
import { createUserServiceMock } from '../../mocks/user.service.mock'
import {
    createSubscriptionRepositoryMock,
    createExternalUserAccountRepositoryMock,
} from '../../mocks/subscription.repository.mock'
import { createServiceRepositoryMock } from '../../mocks/service.repository.mock'
import { createLoggerMock } from '../../mocks/logger.provider.mock'
import { createUserServicePolicyRepositoryMock } from '../../mocks/userServicePolicy.repository.mock'
import { createUserFixture } from '../../fixtures/user.stub'
import { createSubscriptionFixture } from '../../fixtures/subscription.stub'
import {
    createServiceFixture,
    createReferencedServiceFixture,
    createNoAccountServiceFixture,
} from '../../fixtures/service.stub'
import { SubscriptionCreateRequestDto } from '@/types/dtos/subscriptionsDto'

/**
 * Any property access on this stands in for an integration lookup. REFERENCED and NONE services
 * must never reach it, so touching it at all fails the test rather than silently succeeding.
 */
function createExplodingRegistry(): AccountIntegrationRegistry {
    return new Proxy({} as AccountIntegrationRegistry, {
        get(_target, property) {
            // Nest's DI and promise resolution probe these; they are not integration lookups.
            if (property === 'then' || typeof property === 'symbol') {
                return undefined
            }

            throw new Error(
                `Integration registry was accessed ('${String(property)}') for a service that owns no external account`
            )
        },
    })
}

describe('SubscriptionService — account types', () => {
    let service: SubscriptionService
    let userServiceMock: ReturnType<typeof createUserServiceMock>
    let subscriptionRepoMock: ReturnType<typeof createSubscriptionRepositoryMock>
    let externalAccountRepoMock: ReturnType<typeof createExternalUserAccountRepositoryMock>
    let serviceRepoMock: ReturnType<typeof createServiceRepositoryMock>

    const userId = 'user-uuid-1'

    async function build(registry: AccountIntegrationRegistry): Promise<void> {
        userServiceMock = createUserServiceMock()
        subscriptionRepoMock = createSubscriptionRepositoryMock()
        externalAccountRepoMock = createExternalUserAccountRepositoryMock()
        serviceRepoMock = createServiceRepositoryMock()

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SubscriptionService,
                SubscriptionCascadeService,
                ...subscriptionProvisioners,
                { provide: UserService, useValue: userServiceMock },
                { provide: ISubscriptionRepository, useValue: subscriptionRepoMock },
                { provide: IExternalUserAccountRepository, useValue: externalAccountRepoMock },
                { provide: IServiceRepository, useValue: serviceRepoMock },
                { provide: IUserServicePolicyRepository, useValue: createUserServicePolicyRepositoryMock() },
                { provide: AccountIntegrationRegistry, useValue: registry },
                { provide: ServiceAccessService, useValue: { assertCanSubscribe: jest.fn(), resolveAccess: jest.fn() } },
                { provide: EventEmitter2, useValue: { emit: jest.fn() } },
                { provide: LoggingProvider, useValue: createLoggerMock() },
            ],
        }).compile()

        service = module.get(SubscriptionService)
        userServiceMock.getUserById.mockResolvedValue(createUserFixture({ id: userId, email: 'test@example.com' }))
    }

    const request = (serviceId: number): SubscriptionCreateRequestDto =>
        ({ serviceId, autoRenew: true }) as SubscriptionCreateRequestDto

    describe('REFERENCED services', () => {
        beforeEach(async () => {
            await build(createExplodingRegistry())
        })

        it('subscribes without ever consulting an integration when the account source is active', async () => {
            const referenced = createReferencedServiceFixture()
            serviceRepoMock.findById.mockResolvedValue(referenced)
            subscriptionRepoMock.find.mockImplementation(async (_userId, serviceId) =>
                serviceId === referenced.accountSourceServiceId
                    ? createSubscriptionFixture({ serviceId, status: SubscriptionStatus.active })
                    : null
            )
            subscriptionRepoMock.create.mockResolvedValue(createSubscriptionFixture({ serviceId: referenced.id }))
            subscriptionRepoMock.update.mockResolvedValue(
                createSubscriptionFixture({ serviceId: referenced.id, status: SubscriptionStatus.active })
            )

            const result = await service.subscribe(request(referenced.id), userId)

            expect(result.status).toBe(SubscriptionStatus.active)
            expect(result.username).toBeNull()
            expect(externalAccountRepoMock.create).not.toHaveBeenCalled()
        })

        it('rejects when the user has no active subscription to the account source', async () => {
            const referenced = createReferencedServiceFixture()
            serviceRepoMock.findById.mockResolvedValue(referenced)
            subscriptionRepoMock.find.mockResolvedValue(null)

            await expect(service.subscribe(request(referenced.id), userId)).rejects.toThrow(BadRequestException)
            expect(subscriptionRepoMock.create).not.toHaveBeenCalled()
        })

        it('rejects when the account source subscription exists but is not active', async () => {
            const referenced = createReferencedServiceFixture()
            serviceRepoMock.findById.mockResolvedValue(referenced)
            subscriptionRepoMock.find.mockImplementation(async (_userId, serviceId) =>
                serviceId === referenced.accountSourceServiceId
                    ? createSubscriptionFixture({ serviceId, status: SubscriptionStatus.expired })
                    : null
            )

            await expect(service.subscribe(request(referenced.id), userId)).rejects.toThrow(BadRequestException)
        })

        it('cancels without consulting an integration', async () => {
            const referenced = createReferencedServiceFixture()
            const subscription = createSubscriptionFixture({
                serviceId: referenced.id,
                status: SubscriptionStatus.active,
                expiresAt: new Date(Date.now() + 86_400_000),
                autoRenew: false,
            })
            serviceRepoMock.findById.mockResolvedValue(referenced)
            subscriptionRepoMock.findById.mockResolvedValue(subscription)

            await expect(service.delete(subscription.id, userId, true)).resolves.toBe(true)
        })

        it('refuses a password reset because there is no account to reset', async () => {
            const referenced = createReferencedServiceFixture()
            const subscription = createSubscriptionFixture({ serviceId: referenced.id })
            serviceRepoMock.findById.mockResolvedValue(referenced)
            subscriptionRepoMock.findById.mockResolvedValue(subscription)

            await expect(
                service.resetAccountPassword(subscription.id, userId, 'nonexistent-account-id', 'pw')
            ).rejects.toThrow(BadRequestException)
        })
    })

    describe('NONE services', () => {
        beforeEach(async () => {
            await build(createExplodingRegistry())
        })

        it('subscribes without credentials or an integration lookup', async () => {
            const none = createNoAccountServiceFixture()
            serviceRepoMock.findById.mockResolvedValue(none)
            subscriptionRepoMock.find.mockResolvedValue(null)
            subscriptionRepoMock.create.mockResolvedValue(createSubscriptionFixture({ serviceId: none.id }))
            subscriptionRepoMock.update.mockResolvedValue(
                createSubscriptionFixture({ serviceId: none.id, status: SubscriptionStatus.active })
            )

            const result = await service.subscribe(request(none.id), userId)

            expect(result.status).toBe(SubscriptionStatus.active)
            expect(externalAccountRepoMock.create).not.toHaveBeenCalled()
        })

        it('cancels without consulting an integration', async () => {
            const none = createNoAccountServiceFixture()
            const subscription = createSubscriptionFixture({
                serviceId: none.id,
                status: SubscriptionStatus.active,
                expiresAt: new Date(Date.now() + 86_400_000),
                autoRenew: false,
            })
            serviceRepoMock.findById.mockResolvedValue(none)
            subscriptionRepoMock.findById.mockResolvedValue(subscription)

            await expect(service.delete(subscription.id, userId, true)).resolves.toBe(true)
        })
    })

    describe('MANAGED services', () => {
        it('does reach the integration registry, proving the guard above is meaningful', async () => {
            await build(createExplodingRegistry())

            const managed = createServiceFixture()
            serviceRepoMock.findById.mockResolvedValue(managed)
            subscriptionRepoMock.find.mockResolvedValue(null)

            await expect(service.subscribe(request(managed.id), userId)).rejects.toThrow(
                /Integration registry was accessed/
            )
        })
    })
})
