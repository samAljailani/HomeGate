import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException, BadRequestException } from '@nestjs/common'
import { ServiceManagementService } from '@/api/services/serviceManagement.service'
import { IServiceRepository } from '@/data/repositories'
import { ApplicationClientRegistry } from '@/core/clients/applicationClientRegistry'
import { createServiceFixture } from '../../fixtures/service.stub'
import { ApplicationClientNames } from '@/types/enums'

function createServiceRepositoryMock(): jest.Mocked<
    Pick<IServiceRepository, 'findMany' | 'count' | 'setEnabled' | 'findByName' | 'setImageUrl'>
> {
    return {
        findMany: jest.fn(),
        count: jest.fn(),
        setEnabled: jest.fn(),
        findByName: jest.fn(),
        setImageUrl: jest.fn(),
    }
}

function createClientRegistryMock(): jest.Mocked<Pick<ApplicationClientRegistry, 'has' | 'enable' | 'disable' | 'get'>> {
    return {
        has: jest.fn(),
        enable: jest.fn(),
        disable: jest.fn(),
        get: jest.fn(),
    }
}

describe('ServiceManagementService', () => {
    let service: ServiceManagementService
    let serviceRepositoryMock: ReturnType<typeof createServiceRepositoryMock>
    let clientRegistryMock: ReturnType<typeof createClientRegistryMock>

    beforeEach(async () => {
        serviceRepositoryMock = createServiceRepositoryMock()
        clientRegistryMock = createClientRegistryMock()

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ServiceManagementService,
                { provide: IServiceRepository, useValue: serviceRepositoryMock },
                { provide: ApplicationClientRegistry, useValue: clientRegistryMock },
            ],
        }).compile()

        service = module.get<ServiceManagementService>(ServiceManagementService)
    })

    // #region list

    describe('list', () => {
        it('returns paginated response with services', async () => {
            const services = [createServiceFixture({ id: 1 }), createServiceFixture({ id: 2 })]
            serviceRepositoryMock.findMany.mockResolvedValue(services)
            serviceRepositoryMock.count.mockResolvedValue(2)

            const result = await service.list()

            expect(serviceRepositoryMock.findMany).toHaveBeenCalledWith({}, 50, 0)
            expect(result.data).toHaveLength(2)
            expect(result.total).toBe(2)
            expect(result.hasMore).toBe(false)
        })
    })

    // #endregion list

    // #region enable

    describe('enable', () => {
        const name = ApplicationClientNames.Jellyfin

        it('uses registry.enable when client is registered', async () => {
            const svc = createServiceFixture({ name, enabled: true })
            clientRegistryMock.has.mockReturnValue(true)
            clientRegistryMock.enable.mockResolvedValue(undefined)
            serviceRepositoryMock.findByName.mockResolvedValue(svc)

            await service.enable(name)

            expect(clientRegistryMock.enable).toHaveBeenCalledWith(name)
            expect(serviceRepositoryMock.setEnabled).not.toHaveBeenCalled()
        })

        it('uses repo.setEnabled when client is not registered', async () => {
            const svc = createServiceFixture({ name, enabled: true })
            clientRegistryMock.has.mockReturnValue(false)
            serviceRepositoryMock.setEnabled.mockResolvedValue(svc)
            serviceRepositoryMock.findByName.mockResolvedValue(svc)

            await service.enable(name)

            expect(serviceRepositoryMock.setEnabled).toHaveBeenCalledWith(name, true)
            expect(clientRegistryMock.enable).not.toHaveBeenCalled()
        })

        it('returns the updated service record', async () => {
            const svc = createServiceFixture({ name, enabled: true })
            clientRegistryMock.has.mockReturnValue(false)
            serviceRepositoryMock.setEnabled.mockResolvedValue(svc)
            serviceRepositoryMock.findByName.mockResolvedValue(svc)

            const result = await service.enable(name)

            expect(result).toEqual({ id: svc.id, name: svc.name, enabled: svc.enabled, url: svc.url, imageUrl: svc.imageUrl })
        })

        it('throws NotFoundException when service record is not found after update', async () => {
            clientRegistryMock.has.mockReturnValue(false)
            serviceRepositoryMock.setEnabled.mockResolvedValue(null)
            serviceRepositoryMock.findByName.mockResolvedValue(null)

            await expect(service.enable(name)).rejects.toThrow(NotFoundException)
        })
    })

    // #endregion enable

    // #region disable

    describe('disable', () => {
        const name = ApplicationClientNames.Jellyfin

        it('uses registry.disable when client is registered', async () => {
            const svc = createServiceFixture({ name, enabled: false })
            clientRegistryMock.has.mockReturnValue(true)
            clientRegistryMock.disable.mockResolvedValue(undefined)
            serviceRepositoryMock.findByName.mockResolvedValue(svc)

            await service.disable(name)

            expect(clientRegistryMock.disable).toHaveBeenCalledWith(name)
            expect(serviceRepositoryMock.setEnabled).not.toHaveBeenCalled()
        })

        it('uses repo.setEnabled when client is not registered', async () => {
            const svc = createServiceFixture({ name, enabled: false })
            clientRegistryMock.has.mockReturnValue(false)
            serviceRepositoryMock.setEnabled.mockResolvedValue(svc)
            serviceRepositoryMock.findByName.mockResolvedValue(svc)

            await service.disable(name)

            expect(serviceRepositoryMock.setEnabled).toHaveBeenCalledWith(name, false)
        })

        it('returns the updated service record', async () => {
            const svc = createServiceFixture({ name, enabled: false })
            clientRegistryMock.has.mockReturnValue(false)
            serviceRepositoryMock.setEnabled.mockResolvedValue(svc)
            serviceRepositoryMock.findByName.mockResolvedValue(svc)

            const result = await service.disable(name)

            expect(result).toEqual({ id: svc.id, name: svc.name, enabled: svc.enabled, url: svc.url, imageUrl: svc.imageUrl })
        })
    })

    // #endregion disable

    // #region updateImageUrl

    describe('updateImageUrl', () => {
        const name = ApplicationClientNames.Jellyfin

        it('sets the image URL via the repository', async () => {
            const svc = createServiceFixture({ name, imageUrl: 'https://example.com/logo.png' })
            serviceRepositoryMock.setImageUrl.mockResolvedValue(svc)

            const result = await service.updateImageUrl(name, 'https://example.com/logo.png')

            expect(serviceRepositoryMock.setImageUrl).toHaveBeenCalledWith(name, 'https://example.com/logo.png')
            expect(result).toEqual({ id: svc.id, name: svc.name, enabled: svc.enabled, url: svc.url, imageUrl: svc.imageUrl })
        })

        it('throws NotFoundException when service record is not found', async () => {
            serviceRepositoryMock.setImageUrl.mockResolvedValue(null)

            await expect(service.updateImageUrl(name, 'https://example.com/logo.png')).rejects.toThrow(
                NotFoundException
            )
        })
    })

    // #endregion updateImageUrl

    // #region listExternalAccounts

    describe('listExternalAccounts', () => {
        const name = ApplicationClientNames.Jellyfin

        it('throws BadRequestException when the service is not a registered client', async () => {
            clientRegistryMock.has.mockReturnValue(false)

            await expect(service.listExternalAccounts(name)).rejects.toThrow(BadRequestException)
        })

        it('returns mapped external accounts from the client', async () => {
            const users = [
                { id: 'ext-1', username: 'alice', isActive: true, isAdmin: false },
                { id: 'ext-2', username: 'bob', isActive: false, isAdmin: true },
            ]
            clientRegistryMock.has.mockReturnValue(true)
            clientRegistryMock.get.mockReturnValue({ getAllUsers: jest.fn().mockResolvedValue(users) } as any)

            const result = await service.listExternalAccounts(name)

            expect(result).toEqual(users)
        })

        it('returns an empty array when the client returns null', async () => {
            clientRegistryMock.has.mockReturnValue(true)
            clientRegistryMock.get.mockReturnValue({ getAllUsers: jest.fn().mockResolvedValue(null) } as any)

            const result = await service.listExternalAccounts(name)

            expect(result).toEqual([])
        })
    })

    // #endregion listExternalAccounts
})
