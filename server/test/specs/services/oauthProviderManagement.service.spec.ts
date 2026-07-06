import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { OAuthProviderManagementService } from '@/api/services/oauthProviderManagement.service'
import { IOAuthProviderRepository } from '@/data/repositories/IOAuthProviderRepository'
import { ISessionRepository } from '@/data/repositories/ISessionRepository'
import { createOAuthProviderFixture } from '../../fixtures/oauthProvider.stub'
import { OAuthProviderName } from '@prisma/generated'

function createOAuthProviderRepositoryMock(): jest.Mocked<
    Pick<IOAuthProviderRepository, 'findMany' | 'setEnabled'>
> {
    return {
        findMany: jest.fn(),
        setEnabled: jest.fn(),
    }
}

function createSessionRepositoryMock(): jest.Mocked<Pick<ISessionRepository, 'deleteByProviderId'>> {
    return {
        deleteByProviderId: jest.fn(),
    }
}

describe('OAuthProviderManagementService', () => {
    let service: OAuthProviderManagementService
    let providerRepositoryMock: ReturnType<typeof createOAuthProviderRepositoryMock>
    let sessionRepositoryMock: ReturnType<typeof createSessionRepositoryMock>

    beforeEach(async () => {
        providerRepositoryMock = createOAuthProviderRepositoryMock()
        sessionRepositoryMock = createSessionRepositoryMock()

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OAuthProviderManagementService,
                { provide: IOAuthProviderRepository, useValue: providerRepositoryMock },
                { provide: ISessionRepository, useValue: sessionRepositoryMock },
            ],
        }).compile()

        service = module.get<OAuthProviderManagementService>(OAuthProviderManagementService)
    })

    // #region list

    describe('list', () => {
        it('returns all providers', async () => {
            const providers = [createOAuthProviderFixture(), createOAuthProviderFixture({ id: 2 })]
            providerRepositoryMock.findMany.mockResolvedValue(providers)

            const result = await service.list()

            expect(providerRepositoryMock.findMany).toHaveBeenCalledWith({}, undefined, undefined)
            expect(result).toHaveLength(2)
        })
    })

    // #endregion list

    // #region enable

    describe('enable', () => {
        const name = OAuthProviderName.google

        it('calls setEnabled with true', async () => {
            const provider = createOAuthProviderFixture({ name, enabled: true })
            providerRepositoryMock.setEnabled.mockResolvedValue(provider)

            await service.enable(name)

            expect(providerRepositoryMock.setEnabled).toHaveBeenCalledWith(name, true)
        })

        it('returns the updated provider', async () => {
            const provider = createOAuthProviderFixture({ name, enabled: true })
            providerRepositoryMock.setEnabled.mockResolvedValue(provider)

            const result = await service.enable(name)

            expect(result).toBe(provider)
        })

        it('throws NotFoundException when provider not found', async () => {
            providerRepositoryMock.setEnabled.mockResolvedValue(null)

            await expect(service.enable(name)).rejects.toThrow(NotFoundException)
        })

        it('does not revoke sessions on enable', async () => {
            const provider = createOAuthProviderFixture({ name, enabled: true })
            providerRepositoryMock.setEnabled.mockResolvedValue(provider)

            await service.enable(name)

            expect(sessionRepositoryMock.deleteByProviderId).not.toHaveBeenCalled()
        })
    })

    // #endregion enable

    // #region disable

    describe('disable', () => {
        const name = OAuthProviderName.google

        it('calls setEnabled with false', async () => {
            const provider = createOAuthProviderFixture({ name, enabled: false })
            providerRepositoryMock.setEnabled.mockResolvedValue(provider)
            sessionRepositoryMock.deleteByProviderId.mockResolvedValue(undefined)

            await service.disable(name)

            expect(providerRepositoryMock.setEnabled).toHaveBeenCalledWith(name, false)
        })

        it('revokes all sessions for that provider', async () => {
            const provider = createOAuthProviderFixture({ id: 1, name, enabled: false })
            providerRepositoryMock.setEnabled.mockResolvedValue(provider)
            sessionRepositoryMock.deleteByProviderId.mockResolvedValue(undefined)

            await service.disable(name)

            expect(sessionRepositoryMock.deleteByProviderId).toHaveBeenCalledWith(1)
        })

        it('revokes sessions after disabling the provider', async () => {
            const order: string[] = []
            const provider = createOAuthProviderFixture({ name, enabled: false })
            providerRepositoryMock.setEnabled.mockImplementation(async () => { order.push('disable'); return provider })
            sessionRepositoryMock.deleteByProviderId.mockImplementation(async () => { order.push('revoke') })

            await service.disable(name)

            expect(order).toEqual(['disable', 'revoke'])
        })

        it('throws NotFoundException when provider not found', async () => {
            providerRepositoryMock.setEnabled.mockResolvedValue(null)

            await expect(service.disable(name)).rejects.toThrow(NotFoundException)
        })

        it('returns the updated provider', async () => {
            const provider = createOAuthProviderFixture({ name, enabled: false })
            providerRepositoryMock.setEnabled.mockResolvedValue(provider)
            sessionRepositoryMock.deleteByProviderId.mockResolvedValue(undefined)

            const result = await service.disable(name)

            expect(result).toBe(provider)
        })
    })

    // #endregion disable
})
