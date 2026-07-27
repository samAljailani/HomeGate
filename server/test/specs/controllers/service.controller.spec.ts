import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException } from '@nestjs/common'
import { ServiceController } from '@/api/controllers/service.controller'
import { ServiceManagementService } from '@/api/services/serviceManagement.service'
import { createServiceFixture } from '../../fixtures/service.stub'
import { ApplicationClientNames } from '@/types/enums'

function createServiceManagementServiceMock(): jest.Mocked<
    Pick<ServiceManagementService, 'list' | 'enable' | 'disable'>
> {
    return {
        list: jest.fn(),
        enable: jest.fn(),
        disable: jest.fn(),
    }
}

describe('ServiceController', () => {
    let controller: ServiceController
    let serviceManagementMock: ReturnType<typeof createServiceManagementServiceMock>

    beforeEach(async () => {
        serviceManagementMock = createServiceManagementServiceMock()

        const module: TestingModule = await Test.createTestingModule({
            controllers: [ServiceController],
            providers: [{ provide: ServiceManagementService, useValue: serviceManagementMock }],
        }).compile()

        controller = module.get<ServiceController>(ServiceController)
    })

    it('should be defined', () => {
        expect(controller).toBeDefined()
    })

    // #region list

    describe('list', () => {
        it('returns mapped service DTOs', async () => {
            const services = [
                createServiceFixture({ id: 1, enabled: true }),
                createServiceFixture({ id: 2, enabled: false }),
            ]
            serviceManagementMock.list.mockResolvedValue(services)

            const result = await controller.list({})

            expect(serviceManagementMock.list).toHaveBeenCalled()
            expect(result).toHaveLength(2)
            expect(result[0]).toEqual({ id: 1, name: services[0]!.name, enabled: true, url: null })
            expect(result[1]).toEqual({ id: 2, name: services[1]!.name, enabled: false, url: null })
        })
    })

    // #endregion list

    // #region update

    describe('update', () => {
        const name = ApplicationClientNames.Jellyfin

        it('enables the service when enabled is true', async () => {
            const svc = createServiceFixture({ enabled: true })
            serviceManagementMock.enable.mockResolvedValue(svc)

            await controller.update(name, { enabled: true })

            expect(serviceManagementMock.enable).toHaveBeenCalledWith(ApplicationClientNames.Jellyfin)
            expect(serviceManagementMock.disable).not.toHaveBeenCalled()
        })

        it('disables the service when enabled is false', async () => {
            const svc = createServiceFixture({ enabled: false })
            serviceManagementMock.disable.mockResolvedValue(svc)

            await controller.update(name, { enabled: false })

            expect(serviceManagementMock.disable).toHaveBeenCalledWith(ApplicationClientNames.Jellyfin)
            expect(serviceManagementMock.enable).not.toHaveBeenCalled()
        })

        it('returns the mapped DTO', async () => {
            const svc = createServiceFixture({ id: 1, enabled: true })
            serviceManagementMock.enable.mockResolvedValue(svc)

            const result = await controller.update(name, { enabled: true })

            expect(result).toEqual({ id: 1, name: svc.name, enabled: true, url: null })
        })

        it('throws BadRequestException when no fields provided', async () => {
            await expect(controller.update(name, {})).rejects.toThrow(BadRequestException)
        })
    })

    // #endregion update
})
