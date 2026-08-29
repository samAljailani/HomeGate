import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException } from '@nestjs/common'
import { ServiceController } from '@/api/controllers/service.controller'
import { ServiceManagementService } from '@/api/services/serviceManagement.service'
import { createServiceFixture } from '../../fixtures/service.stub'
import { PaginatedResponseDto } from '@/types/dtos/paginationDto'

function createServiceManagementServiceMock(): jest.Mocked<
    Pick<ServiceManagementService, 'list' | 'enable' | 'disable' | 'updateImageUrl' | 'updateUrl' | 'listExternalAccounts'>
> {
    return {
        list: jest.fn(),
        enable: jest.fn(),
        disable: jest.fn(),
        updateImageUrl: jest.fn(),
        updateUrl: jest.fn(),
        listExternalAccounts: jest.fn(),
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
            serviceManagementMock.list.mockResolvedValue(new PaginatedResponseDto(services, 2, 0))

            const result = await controller.list({}, { session: { userId: 'user-1' } } as any)

            expect(serviceManagementMock.list).toHaveBeenCalled()
            expect(result.data).toHaveLength(2)
            expect(result.data[0]).toEqual(services[0])
            expect(result.data[1]).toEqual(services[1])
        })
    })

    // #endregion list

    // #region update

    describe('update', () => {
        const slug = 'jellyfin'

        it('enables the service when enabled is true', async () => {
            const svc = createServiceFixture({ enabled: true })
            serviceManagementMock.enable.mockResolvedValue(svc)

            await controller.update({ slug }, { enabled: true })

            expect(serviceManagementMock.enable).toHaveBeenCalledWith(slug)
            expect(serviceManagementMock.disable).not.toHaveBeenCalled()
        })

        it('disables the service when enabled is false', async () => {
            const svc = createServiceFixture({ enabled: false })
            serviceManagementMock.disable.mockResolvedValue(svc)

            await controller.update({ slug }, { enabled: false })

            expect(serviceManagementMock.disable).toHaveBeenCalledWith(slug)
            expect(serviceManagementMock.enable).not.toHaveBeenCalled()
        })

        it('returns the mapped DTO', async () => {
            const svc = createServiceFixture({ id: 1, enabled: true })
            serviceManagementMock.enable.mockResolvedValue(svc)

            const result = await controller.update({ slug }, { enabled: true })

            expect(result).toEqual(svc)
        })

        it('updates the imageUrl when provided', async () => {
            const svc = createServiceFixture({ id: 1, imageUrl: 'https://example.com/logo.png' })
            serviceManagementMock.updateImageUrl.mockResolvedValue(svc)

            const result = await controller.update({ slug }, { imageUrl: 'https://example.com/logo.png' })

            expect(serviceManagementMock.updateImageUrl).toHaveBeenCalledWith(slug, 'https://example.com/logo.png')
            expect(serviceManagementMock.enable).not.toHaveBeenCalled()
            expect(serviceManagementMock.disable).not.toHaveBeenCalled()
            expect(result).toEqual(svc)
        })

        it('updates the url when provided', async () => {
            const svc = createServiceFixture({ id: 1, url: 'https://jellyfin.example.com' })
            serviceManagementMock.updateUrl.mockResolvedValue(svc)

            const result = await controller.update({ slug }, { url: 'https://jellyfin.example.com' })

            expect(serviceManagementMock.updateUrl).toHaveBeenCalledWith(slug, 'https://jellyfin.example.com')
            expect(serviceManagementMock.enable).not.toHaveBeenCalled()
            expect(serviceManagementMock.disable).not.toHaveBeenCalled()
            expect(result).toEqual(svc)
        })

        it('throws BadRequestException when no fields provided', async () => {
            await expect(controller.update({ slug }, {})).rejects.toThrow(BadRequestException)
        })
    })

    // #endregion update

    // #region listAccounts

    describe('listAccounts', () => {
        const slug = 'jellyfin'

        it('returns the accounts from the service', async () => {
            const accounts = [{ id: 'ext-1', username: 'alice', isActive: true, isAdmin: false }]
            serviceManagementMock.listExternalAccounts.mockResolvedValue(accounts)

            const result = await controller.listAccounts({ slug })

            expect(serviceManagementMock.listExternalAccounts).toHaveBeenCalledWith(slug)
            expect(result).toEqual(accounts)
        })
    })

    // #endregion listAccounts
})
