import { Test, TestingModule } from '@nestjs/testing'
import { ServiceController } from '@/api/controllers/service.controller'
import { ServiceManagementService } from '@/api/services/serviceManagement.service'
import { ServiceActionRequestDto } from '@/types/dtos/serviceDto'
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

    // #region enable

    describe('enable', () => {
        const request: ServiceActionRequestDto = { name: ApplicationClientNames.jellyfin }

        it('calls serviceManagementService.enable with the name', async () => {
            const svc = createServiceFixture({ enabled: true })
            serviceManagementMock.enable.mockResolvedValue(svc)

            await controller.enable(request)

            expect(serviceManagementMock.enable).toHaveBeenCalledWith(ApplicationClientNames.jellyfin)
        })

        it('returns the mapped DTO', async () => {
            const svc = createServiceFixture({ id: 1, enabled: true })
            serviceManagementMock.enable.mockResolvedValue(svc)

            const result = await controller.enable(request)

            expect(result).toEqual({ id: 1, name: svc.name, enabled: true, url: null })
        })
    })

    // #endregion enable

    // #region disable

    describe('disable', () => {
        const request: ServiceActionRequestDto = { name: ApplicationClientNames.jellyfin }

        it('calls serviceManagementService.disable with the name', async () => {
            const svc = createServiceFixture({ enabled: false })
            serviceManagementMock.disable.mockResolvedValue(svc)

            await controller.disable(request)

            expect(serviceManagementMock.disable).toHaveBeenCalledWith(ApplicationClientNames.jellyfin)
        })

        it('returns the mapped DTO', async () => {
            const svc = createServiceFixture({ id: 1, enabled: false })
            serviceManagementMock.disable.mockResolvedValue(svc)

            const result = await controller.disable(request)

            expect(result).toEqual({ id: 1, name: svc.name, enabled: false, url: null })
        })
    })

    // #endregion disable
})
