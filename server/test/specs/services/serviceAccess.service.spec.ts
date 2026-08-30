import { Test, TestingModule } from '@nestjs/testing'
import { ForbiddenException } from '@nestjs/common'
import { ServiceAccessService } from '@/api/services/serviceAccess.service'
import { IUserServicePolicyRepository } from '@/data/repositories'
import { PolicyEffect, AccountType, IntegrationProvider } from '@/types/enums'
import { UserServicePolicyModel } from '@/types/models/userServicePolicy'
import { ServiceModel } from '@/types/models/service'

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

    beforeEach(async () => {
        policyRepo = createPolicyRepositoryMock()

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ServiceAccessService,
                { provide: IUserServicePolicyRepository, useValue: policyRepo },
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
