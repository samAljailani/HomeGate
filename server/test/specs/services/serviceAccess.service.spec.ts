import { Test, TestingModule } from '@nestjs/testing'
import { ForbiddenException } from '@nestjs/common'
import { ServiceAccessService } from '@/api/services/serviceAccess.service'
import { IUserServicePolicyRepository } from '@/data/repositories'
import { PolicyEffect, AccountType, IntegrationProvider } from '@/types/enums'
import { UserServicePolicyModel } from '@/types/models/userServicePolicy'
import { ServiceModel } from '@/types/models/service'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { createLoggerMock } from '../../mocks/logger.provider.mock'

function createPolicyRepositoryMock(): jest.Mocked<IUserServicePolicyRepository> {
    return {
        find: jest.fn().mockResolvedValue(null),
        findByUserId: jest.fn().mockResolvedValue([]),
        upsert: jest.fn(),
        delete: jest.fn(),
    }
}

function stubService(overrides: Partial<ServiceModel> = {}): ServiceModel {
    return {
        id: 1,
        name: 'jellyfin',
        slug: 'jellyfin',
        enabled: true,
        url: null,
        imageUrl: null,
        accountType: AccountType.MANAGED,
        integrationProvider: IntegrationProvider.Jellyfin,
        accountSourceServiceId: null,
        defaultAllowed: true,
        ...overrides,
    }
}

function stubPolicy(overrides: Partial<UserServicePolicyModel> = {}): UserServicePolicyModel {
    return {
        id: 'policy-1',
        userId: 'user-1',
        serviceId: 1,
        effect: PolicyEffect.ALLOW,
        createdByUserId: null,
        createdAt: new Date(),
        ...overrides,
    }
}

describe('ServiceAccessService', () => {
    let access: ServiceAccessService
    let policyRepo: ReturnType<typeof createPolicyRepositoryMock>
    let loggerMock: ReturnType<typeof createLoggerMock>

    beforeEach(async () => {
        policyRepo = createPolicyRepositoryMock()
        loggerMock = createLoggerMock()

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ServiceAccessService,
                { provide: IUserServicePolicyRepository, useValue: policyRepo },
                { provide: LoggingProvider, useValue: loggerMock },
            ],
        }).compile()

        access = module.get(ServiceAccessService)
    })

    // #region canSubscribe

    describe('canSubscribe', () => {
        it('returns true when no policy exists and service.defaultAllowed is true', async () => {
            const result = await access.canSubscribe('user-1', stubService({ defaultAllowed: true }))
            expect(result).toBe(true)
        })

        it('returns false when no policy exists and service.defaultAllowed is false', async () => {
            const result = await access.canSubscribe('user-1', stubService({ defaultAllowed: false }))
            expect(result).toBe(false)
        })

        it('returns true when an ALLOW policy exists regardless of defaultAllowed', async () => {
            policyRepo.find.mockResolvedValue(stubPolicy({ effect: PolicyEffect.ALLOW }))

            const result = await access.canSubscribe('user-1', stubService({ defaultAllowed: false }))
            expect(result).toBe(true)
        })

        it('returns false when a DENY policy exists regardless of defaultAllowed', async () => {
            policyRepo.find.mockResolvedValue(stubPolicy({ effect: PolicyEffect.DENY }))

            const result = await access.canSubscribe('user-1', stubService({ defaultAllowed: true }))
            expect(result).toBe(false)
        })
    })

    // #endregion canSubscribe

    // #region assertCanSubscribe

    describe('assertCanSubscribe', () => {
        it('does not throw when access is allowed', async () => {
            await expect(access.assertCanSubscribe('user-1', stubService())).resolves.toBeUndefined()
        })

        it('throws ForbiddenException when access is denied', async () => {
            policyRepo.find.mockResolvedValue(stubPolicy({ effect: PolicyEffect.DENY }))

            await expect(access.assertCanSubscribe('user-1', stubService())).rejects.toThrow(ForbiddenException)
            expect(loggerMock.warn).toHaveBeenCalledWith(
                "Access denied for user 'user-1' on service 'jellyfin' (id 1): not allowed by policy"
            )
        })
    })

    // #endregion assertCanSubscribe

    // #region resolveAccess

    describe('resolveAccess', () => {
        it('returns defaultAllowed when no policies exist', async () => {
            const services = [
                stubService({ id: 1, defaultAllowed: true }),
                stubService({ id: 2, defaultAllowed: false }),
            ]

            const result = await access.resolveAccess('user-1', services)

            expect(result.get(1)).toBe(true)
            expect(result.get(2)).toBe(false)
        })

        it('overrides defaultAllowed with explicit policies', async () => {
            policyRepo.findByUserId.mockResolvedValue([
                stubPolicy({ serviceId: 1, effect: PolicyEffect.DENY }),
                stubPolicy({ serviceId: 2, effect: PolicyEffect.ALLOW }),
            ])

            const services = [
                stubService({ id: 1, defaultAllowed: true }),
                stubService({ id: 2, defaultAllowed: false }),
            ]

            const result = await access.resolveAccess('user-1', services)

            expect(result.get(1)).toBe(false)
            expect(result.get(2)).toBe(true)
        })

        it('ignores policies for services not in the list', async () => {
            policyRepo.findByUserId.mockResolvedValue([
                stubPolicy({ serviceId: 99, effect: PolicyEffect.DENY }),
            ])

            const services = [stubService({ id: 1, defaultAllowed: true })]
            const result = await access.resolveAccess('user-1', services)

            expect(result.get(1)).toBe(true)
            expect(result.has(99)).toBe(false)
        })
    })

    // #endregion resolveAccess
})
