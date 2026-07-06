import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { ServiceManagementService } from '@/api/services/serviceManagement.service'
import { IServiceRepository } from '@/data/repositories'
import { ApplicationClientRegistry } from '@/core/clients/applicationClientRegistry'
import { createServiceFixture } from '../../fixtures/service.stub'
import { ApplicationClientNames } from '@/types/enums'

function createServiceRepositoryMock(): jest.Mocked<
    Pick<IServiceRepository, 'findMany' | 'setEnabled' | 'findByName'>
> {
    return {
        findMany: jest.fn(),
        setEnabled: jest.fn(),
        findByName: jest.fn(),
    }
}

function createClientRegistryMock(): jest.Mocked<Pick<ApplicationClientRegistry, 'has' | 'enable' | 'disable'>> {
    return {
        has: jest.fn(),
        enable: jest.fn(),
        disable: jest.fn(),
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
        it('returns all services', async () => {
            const services = [createServiceFixture({ id: 1 }), createServiceFixture({ id: 2 })]
            serviceRepositoryMock.findMany.mockResolvedValue(services)

            const result = await service.list()

            expect(serviceRepositoryMock.findMany).toHaveBeenCalledWith({}, undefined, undefined)
            expect(result).toHaveLength(2)
        })
    })

    // #endregion list

    // #region enable

    describe('enable', () => {
        const name = ApplicationClientNames.jellyfin

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

            expect(result).toBe(svc)
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
        const name = ApplicationClientNames.jellyfin

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

            expect(result).toBe(svc)
        })
    })

    // #endregion disable
})
