import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { OAuthProviderManagementService } from '@/api/services/oauthProviderManagement.service'
import { IOAuthProviderRepository } from '@/data/repositories/IOAuthProviderRepository'
import { ISessionRepository } from '@/data/repositories/ISessionRepository'
import { createOAuthProviderFixture } from '../../fixtures/oauthProvider.stub'
import { OAuthProviderName } from '@prisma/generated'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { createLoggerMock } from '../../mocks/logger.provider.mock'

function createOAuthProviderRepositoryMock(): jest.Mocked<
    Pick<IOAuthProviderRepository, 'findMany' | 'count' | 'setEnabled' | 'findById'>
> {
    return {
        findMany: jest.fn(),
        count: jest.fn(),
        setEnabled: jest.fn(),
        findById: jest.fn(),
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
    let loggerMock: ReturnType<typeof createLoggerMock>

    beforeEach(async () => {
        providerRepositoryMock = createOAuthProviderRepositoryMock()
        sessionRepositoryMock = createSessionRepositoryMock()
        loggerMock = createLoggerMock()

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OAuthProviderManagementService,
                { provide: IOAuthProviderRepository, useValue: providerRepositoryMock },
                { provide: ISessionRepository, useValue: sessionRepositoryMock },
                { provide: LoggingProvider, useValue: loggerMock },
            ],
        }).compile()

        service = module.get<OAuthProviderManagementService>(OAuthProviderManagementService)
    })

    // #region list

    describe('list', () => {
        it('returns paginated response with providers', async () => {
            const providers = [createOAuthProviderFixture(), createOAuthProviderFixture({ id: 2 })]
            providerRepositoryMock.findMany.mockResolvedValue(providers)
            providerRepositoryMock.count.mockResolvedValue(2)

            const result = await service.list()

            expect(providerRepositoryMock.findMany).toHaveBeenCalledWith({}, 50, 0)
            expect(result.data).toHaveLength(2)
            expect(result.total).toBe(2)
            expect(result.hasMore).toBe(false)
        })
    })

    // #endregion list

    // #region listEnabledNames

    describe('listEnabledNames', () => {
        it('queries the repository filtered to enabled providers', async () => {
            providerRepositoryMock.findMany.mockResolvedValue([createOAuthProviderFixture({ enabled: true })])

            await service.listEnabledNames()

            expect(providerRepositoryMock.findMany).toHaveBeenCalledWith({ enabled: true })
        })

        it('returns just the provider names', async () => {
            const providers = [
                createOAuthProviderFixture({ id: 1, name: OAuthProviderName.google, enabled: true }),
            ]
            providerRepositoryMock.findMany.mockResolvedValue(providers)

            const result = await service.listEnabledNames()

            expect(result).toEqual([OAuthProviderName.google])
        })
    })

    // #endregion listEnabledNames

    // #region enable

    describe('enable', () => {
        const name = OAuthProviderName.google

        it('calls setEnabled with true', async () => {
            const provider = createOAuthProviderFixture({ name, enabled: true })
            providerRepositoryMock.setEnabled.mockResolvedValue(provider)

            await service.enable(name)

            expect(providerRepositoryMock.setEnabled).toHaveBeenCalledWith(name, true)
            expect(loggerMock.log).toHaveBeenCalledWith(`OAuth provider '${name}' enabled`)
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
            expect(loggerMock.warn).toHaveBeenCalledWith(
                `OAuth provider '${name}' disabled and all of its sessions invalidated`
            )
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
            providerRepositoryMock.setEnabled.mockImplementation(async () => {
                order.push('disable')
                return provider
            })
            sessionRepositoryMock.deleteByProviderId.mockImplementation(async () => {
                order.push('revoke')
            })

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

    // #region updateEnabledById

    describe('updateEnabledById', () => {
        it('enables the provider found by id', async () => {
            const provider = createOAuthProviderFixture({ id: 5, name: OAuthProviderName.google, enabled: true })
            providerRepositoryMock.findById.mockResolvedValue(provider)
            providerRepositoryMock.setEnabled.mockResolvedValue(provider)

            const result = await service.updateEnabledById(5, true)

            expect(providerRepositoryMock.findById).toHaveBeenCalledWith(5)
            expect(providerRepositoryMock.setEnabled).toHaveBeenCalledWith(OAuthProviderName.google, true)
            expect(result).toBe(provider)
        })

        it('disables the provider found by id', async () => {
            const provider = createOAuthProviderFixture({ id: 5, name: OAuthProviderName.google, enabled: false })
            providerRepositoryMock.findById.mockResolvedValue(provider)
            providerRepositoryMock.setEnabled.mockResolvedValue(provider)
            sessionRepositoryMock.deleteByProviderId.mockResolvedValue(undefined)

            const result = await service.updateEnabledById(5, false)

            expect(providerRepositoryMock.setEnabled).toHaveBeenCalledWith(OAuthProviderName.google, false)
            expect(result).toBe(provider)
        })

        it('throws NotFoundException when provider not found by id', async () => {
            providerRepositoryMock.findById.mockResolvedValue(null)

            await expect(service.updateEnabledById(99, true)).rejects.toThrow(NotFoundException)
        })
    })

    // #endregion updateEnabledById
})
