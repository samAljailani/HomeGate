import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, ValidationPipe } from '@nestjs/common'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { ServiceController } from '@/api/controllers/service.controller'
import { ServiceManagementService } from '@/api/services/serviceManagement.service'
import { createServiceFixture } from '../../fixtures/service.stub'
import { PaginatedResponseDto } from '@/types/dtos/paginationDto'
import { ServicePatchRequestDto, ServicePutRequestDto } from '@/types/dtos/serviceDto'

function createServiceManagementServiceMock(): jest.Mocked<
    Pick<ServiceManagementService, 'list' | 'update' | 'delete' | 'listExternalAccounts'>
> {
    return {
        list: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
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
        it('delegates the full patch to the service management', async () => {
            const svc = createServiceFixture({
                slug: 'jellyfin',
                enabled: true,
                url: 'https://jellyfin.example.com',
            })
            serviceManagementMock.update.mockResolvedValue(svc)

            const body = {
                slug: 'jellyfin',
                enabled: true,
                url: 'https://jellyfin.example.com',
                imageUrl: 'https://example.com/logo.png',
            }

            const result = await controller.update({ slug: 'jellyfin' }, body)

            expect(serviceManagementMock.update).toHaveBeenCalledWith('jellyfin', body)
            expect(result).toEqual(svc)
        })

        it('passes a rename via the body slug', async () => {
            const svc = createServiceFixture({ slug: 'jellyfin2', enabled: true, url: 'https://jellyfin.example.com' })
            serviceManagementMock.update.mockResolvedValue(svc)

            const body = { slug: 'jellyfin2', enabled: true, url: 'https://jellyfin.example.com' }

            const result = await controller.update({ slug: 'jellyfin' }, body)

            expect(serviceManagementMock.update).toHaveBeenCalledWith('jellyfin', body)
            expect(result).toEqual(svc)
        })
    })

    // #endregion update

    // #region delete

    describe('delete', () => {
        it('delegates to the service management service', async () => {
            const svc = createServiceFixture({ id: 7, slug: 'wiki' })
            serviceManagementMock.delete.mockResolvedValue(svc)

            const result = await controller.remove({ slug: 'wiki' })

            expect(serviceManagementMock.delete).toHaveBeenCalledWith('wiki')
            expect(result).toEqual(svc)
        })
    })

    // #endregion delete

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

// #region DTO validation

describe('Service DTO validation', () => {
    const validCreate = {
        slug: 'jellyfin',
        name: 'Jellyfin',
        accountType: 'NONE',
        url: 'https://jellyfin.example.com',
    }
    const validPatch = {
        slug: 'jellyfin',
        enabled: true,
        url: 'https://jellyfin.example.com',
    }

    async function expectUrlError(dto: object) {
        const errors = await validate(dto)
        const url = errors.find((e) => e.property === 'url')
        expect(url).toBeDefined()
        expect(url!.constraints).toBeDefined()
    }

    it('ServicePutRequestDto rejects a missing url', async () => {
        const dto = plainToInstance(ServicePutRequestDto, { ...validCreate, url: undefined })
        await expectUrlError(dto)
    })

    it('ServicePutRequestDto rejects a blank url', async () => {
        const dto = plainToInstance(ServicePutRequestDto, { ...validCreate, url: '   ' })
        await expectUrlError(dto)
    })

    it('ServicePutRequestDto accepts a valid url', async () => {
        const dto = plainToInstance(ServicePutRequestDto, validCreate)
        const errors = await validate(dto)
        expect(errors).toHaveLength(0)
    })

    it('ServicePatchRequestDto rejects a missing url', async () => {
        const dto = plainToInstance(ServicePatchRequestDto, { ...validPatch, url: undefined })
        await expectUrlError(dto)
    })

    it('ServicePatchRequestDto rejects a blank url', async () => {
        const dto = plainToInstance(ServicePatchRequestDto, { ...validPatch, url: '   ' })
        await expectUrlError(dto)
    })

    it('ServicePatchRequestDto accepts a valid url', async () => {
        const dto = plainToInstance(ServicePatchRequestDto, validPatch)
        const errors = await validate(dto)
        expect(errors).toHaveLength(0)
    })
})

// #endregion DTO validation

// #region ValidationPipe integration

describe('Service create through ValidationPipe (main.ts options)', () => {
    const pipe = new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
    })

    const swaggerPayload = {
        slug: 'jellyseerr3',
        name: 'jellyseerr3',
        accountType: 'REFERENCED',
        accountSourceServiceId: 1,
        enabled: true,
        defaultAllowed: true,
        url: '',
        imageUrl: 'https://easypanel.io/templates/jellyseerr',
    }

    async function pipeCreate(body: object): Promise<unknown> {
        return pipe.transform(body, { type: 'body', metatype: ServicePutRequestDto })
    }

    it('rejects an empty-string url', async () => {
        await expect(pipeCreate(swaggerPayload)).rejects.toThrow(BadRequestException)
    })

    it('rejects a whitespace-only url', async () => {
        await expect(pipeCreate({ ...swaggerPayload, url: '   ' })).rejects.toThrow(BadRequestException)
    })

    it('rejects a missing url', async () => {
        const { url, ...rest } = swaggerPayload
        void url
        await expect(pipeCreate(rest)).rejects.toThrow(BadRequestException)
    })

    it('accepts a valid url (empty string is transformed to undefined)', async () => {
        const result = await pipeCreate({ ...swaggerPayload, url: 'https://jellyseerr.example.com' })
        expect(result).toHaveProperty('url', 'https://jellyseerr.example.com')
    })
})

// #endregion ValidationPipe integration