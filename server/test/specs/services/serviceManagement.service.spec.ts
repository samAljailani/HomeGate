import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { ServiceManagementService } from '@/api/services/serviceManagement.service'
import { IServiceRepository, ISubscriptionRepository } from '@/data/repositories'
import { AccountIntegrationRegistry } from '@/core/integrations/accountIntegrationRegistry'
import { ServicePutRequestDto } from '@/types/dtos/serviceDto'
import {
    createServiceFixture,
    createReferencedServiceFixture,
    createNoAccountServiceFixture,
} from '../../fixtures/service.stub'
import { createLoggerMock } from '../../mocks/logger.provider.mock'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { AccountType, IntegrationProvider } from '@/types/enums'
import { ServiceAccessService } from '@/api/services/serviceAccess.service'
import { SubscriptionCascadeService } from '@/core/subscriptions/subscriptionCascade.service'

function createServiceRepositoryMock(): jest.Mocked<
    Pick<
        IServiceRepository,
        | 'findMany'
        | 'count'
        | 'setEnabled'
        | 'findBySlug'
        | 'findById'
        | 'setImageUrl'
        | 'setUrl'
        | 'create'
        | 'update'
        | 'delete'
    >
> {
    return {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn(),
        setEnabled: jest.fn(),
        findBySlug: jest.fn(),
        findById: jest.fn(),
        setImageUrl: jest.fn(),
        setUrl: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    }
}

function createClientRegistryMock(): jest.Mocked<Pick<AccountIntegrationRegistry, 'has' | 'enable' | 'disable' | 'get'>> {
    return {
        has: jest.fn(),
        enable: jest.fn(),
        disable: jest.fn(),
        get: jest.fn(),
    }
}

function createSubscriptionRepositoryMock(): jest.Mocked<
    Pick<ISubscriptionRepository, 'findMany' | 'deleteByServiceId'>
> {
    return {
        findMany: jest.fn().mockResolvedValue([]),
        deleteByServiceId: jest.fn().mockResolvedValue(0),
    }
}

describe('ServiceManagementService', () => {
    let service: ServiceManagementService
    let serviceRepositoryMock: ReturnType<typeof createServiceRepositoryMock>
    let clientRegistryMock: ReturnType<typeof createClientRegistryMock>
    let accessServiceMock: jest.Mocked<Pick<ServiceAccessService, 'resolveAccess'>>
    let subscriptionRepositoryMock: ReturnType<typeof createSubscriptionRepositoryMock>
    let eventEmitterMock: { emit: jest.Mock }
    let cascadeMock: { onReferencedServiceCreated: jest.Mock }

    beforeEach(async () => {
        serviceRepositoryMock = createServiceRepositoryMock()
        clientRegistryMock = createClientRegistryMock()
        accessServiceMock = { resolveAccess: jest.fn().mockResolvedValue(new Map()) }
        subscriptionRepositoryMock = createSubscriptionRepositoryMock()
        eventEmitterMock = { emit: jest.fn() }
        cascadeMock = { onReferencedServiceCreated: jest.fn().mockResolvedValue([]) }

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ServiceManagementService,
                { provide: IServiceRepository, useValue: serviceRepositoryMock },
                { provide: ISubscriptionRepository, useValue: subscriptionRepositoryMock },
                { provide: AccountIntegrationRegistry, useValue: clientRegistryMock },
                { provide: ServiceAccessService, useValue: accessServiceMock },
                { provide: SubscriptionCascadeService, useValue: cascadeMock },
                { provide: EventEmitter2, useValue: eventEmitterMock },
                { provide: LoggingProvider, useValue: createLoggerMock() },
            ],
        }).compile()

        service = module.get<ServiceManagementService>(ServiceManagementService)
    })

    // #region create

    describe('create', () => {
        const referencedBody = {
            slug: 'jellyseerr',
            name: 'Jellyseerr',
            accountType: AccountType.REFERENCED,
            accountSourceServiceId: 1,
        } as ServicePutRequestDto

        const noneBody = { slug: 'wiki', name: 'Wiki', accountType: AccountType.NONE } as ServicePutRequestDto

        it('creates a NONE service with no integration provider and no account source', async () => {
            serviceRepositoryMock.findBySlug.mockResolvedValue(null)
            serviceRepositoryMock.create.mockImplementation(async (r) => ({ id: 9, ...r }))

            const result = await service.create(noneBody)

            expect(serviceRepositoryMock.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    slug: 'wiki',
                    name: 'Wiki',
                    accountType: AccountType.NONE,
                    integrationProvider: null,
                    accountSourceServiceId: null,
                    enabled: true,
                    defaultAllowed: true,
                })
            )
            expect(result.accountType).toBe(AccountType.NONE)
        })

        it('creates a REFERENCED service pointing at a MANAGED account source', async () => {
            serviceRepositoryMock.findBySlug.mockResolvedValue(null)
            serviceRepositoryMock.findById.mockResolvedValue(createServiceFixture())
            serviceRepositoryMock.create.mockImplementation(async (r) => ({ id: 9, ...r }))
            cascadeMock.onReferencedServiceCreated.mockResolvedValue(['user-a', 'user-b'])

            await service.create(referencedBody)

            expect(serviceRepositoryMock.create).toHaveBeenCalledWith(
                expect.objectContaining({ accountType: AccountType.REFERENCED, accountSourceServiceId: 1 })
            )
            expect(cascadeMock.onReferencedServiceCreated).toHaveBeenCalledWith(
                expect.objectContaining({ id: 9, accountType: AccountType.REFERENCED, accountSourceServiceId: 1 })
            )
            for (const userId of ['user-a', 'user-b']) {
                expect(eventEmitterMock.emit).toHaveBeenCalledWith('subscription.changed', { userId })
            }
        })

        it('does not mirror subscriptions when creating a NONE service', async () => {
            serviceRepositoryMock.findBySlug.mockResolvedValue(null)
            serviceRepositoryMock.create.mockImplementation(async (r) => ({ id: 9, ...r }))

            await service.create(noneBody)

            expect(cascadeMock.onReferencedServiceCreated).not.toHaveBeenCalled()
            expect(eventEmitterMock.emit).not.toHaveBeenCalled()
        })

        it('rejects MANAGED because it needs a built-in integration', async () => {
            await expect(
                service.create({ ...noneBody, accountType: 'MANAGED' } as unknown as ServicePutRequestDto)
            ).rejects.toThrow(BadRequestException)
            expect(serviceRepositoryMock.create).not.toHaveBeenCalled()
        })

        it('rejects a REFERENCED service with no account source', async () => {
            await expect(service.create({ ...referencedBody, accountSourceServiceId: null })).rejects.toThrow(
                BadRequestException
            )
        })

        it('rejects an account source that does not exist', async () => {
            serviceRepositoryMock.findById.mockResolvedValue(null)

            await expect(service.create(referencedBody)).rejects.toThrow(BadRequestException)
        })

        it('rejects chaining a reference onto another REFERENCED service', async () => {
            serviceRepositoryMock.findById.mockResolvedValue(createReferencedServiceFixture())

            await expect(service.create(referencedBody)).rejects.toThrow(BadRequestException)
        })

        it('rejects an account source on a NONE service', async () => {
            await expect(service.create({ ...noneBody, accountSourceServiceId: 1 })).rejects.toThrow(
                BadRequestException
            )
        })

        it('rejects a slug that is not url safe', async () => {
            await expect(service.create({ ...noneBody, slug: 'Not A Slug' })).rejects.toThrow(BadRequestException)
            await expect(service.create({ ...noneBody, slug: 'trailing-' })).rejects.toThrow(BadRequestException)
        })

        it('rejects a slug that is already taken rather than replacing it', async () => {
            serviceRepositoryMock.findBySlug.mockResolvedValue(createNoAccountServiceFixture({ slug: 'wiki' }))

            await expect(service.create(noneBody)).rejects.toThrow(ConflictException)
            expect(serviceRepositoryMock.create).not.toHaveBeenCalled()
            expect(serviceRepositoryMock.update).not.toHaveBeenCalled()
        })

        it('rejects a duplicate name', async () => {
            serviceRepositoryMock.findBySlug.mockResolvedValue(null)
            serviceRepositoryMock.findMany.mockResolvedValue([createNoAccountServiceFixture({ name: 'Wiki' })])

            await expect(service.create(noneBody)).rejects.toThrow(ConflictException)
            expect(serviceRepositoryMock.create).not.toHaveBeenCalled()
        })
    })

    // #endregion create

    // #region list

    describe('list', () => {
        it('returns paginated response with services', async () => {
            const services = [createServiceFixture({ id: 1 }), createServiceFixture({ id: 2 })]
            serviceRepositoryMock.findMany.mockResolvedValue(services)
            serviceRepositoryMock.count.mockResolvedValue(2)

            const result = await service.list('user-1')

            expect(serviceRepositoryMock.findMany).toHaveBeenCalledWith({}, 50, 0)
            expect(result.data).toHaveLength(2)
            expect(result.total).toBe(2)
            expect(result.hasMore).toBe(false)
        })
    })

    // #endregion list

    // #region enable

    describe('enable', () => {
        const name = IntegrationProvider.Jellyfin

        it('uses registry.enable when client is registered', async () => {
            const svc = createServiceFixture({ name, enabled: true })
            clientRegistryMock.has.mockReturnValue(true)
            clientRegistryMock.enable.mockResolvedValue(undefined)
            serviceRepositoryMock.findBySlug.mockResolvedValue(svc)

            await service.enable(name)

            expect(clientRegistryMock.enable).toHaveBeenCalledWith(name)
            expect(serviceRepositoryMock.setEnabled).not.toHaveBeenCalled()
        })

        it('uses repo.setEnabled when client is not registered', async () => {
            const svc = createServiceFixture({ name, enabled: true })
            clientRegistryMock.has.mockReturnValue(false)
            serviceRepositoryMock.setEnabled.mockResolvedValue(svc)
            serviceRepositoryMock.findBySlug.mockResolvedValue(svc)

            await service.enable(name)

            expect(serviceRepositoryMock.setEnabled).toHaveBeenCalledWith(name, true)
            expect(clientRegistryMock.enable).not.toHaveBeenCalled()
        })

        it('returns the updated service record', async () => {
            const svc = createServiceFixture({ name, enabled: true })
            clientRegistryMock.has.mockReturnValue(false)
            serviceRepositoryMock.setEnabled.mockResolvedValue(svc)
            serviceRepositoryMock.findBySlug.mockResolvedValue(svc)

            const result = await service.enable(name)

            expect(result).toEqual(expect.objectContaining({ id: svc.id, name: svc.name, slug: svc.slug, enabled: svc.enabled, accountType: svc.accountType }))
        })

        it('throws NotFoundException when service record is not found after update', async () => {
            clientRegistryMock.has.mockReturnValue(false)
            serviceRepositoryMock.setEnabled.mockResolvedValue(null)
            serviceRepositoryMock.findBySlug.mockResolvedValue(null)

            await expect(service.enable(name)).rejects.toThrow(NotFoundException)
        })
    })

    // #endregion enable

    // #region disable

    describe('disable', () => {
        const name = IntegrationProvider.Jellyfin

        it('uses registry.disable when client is registered', async () => {
            const svc = createServiceFixture({ name, enabled: false })
            clientRegistryMock.has.mockReturnValue(true)
            clientRegistryMock.disable.mockResolvedValue(undefined)
            serviceRepositoryMock.findBySlug.mockResolvedValue(svc)

            await service.disable(name)

            expect(clientRegistryMock.disable).toHaveBeenCalledWith(name)
            expect(serviceRepositoryMock.setEnabled).not.toHaveBeenCalled()
        })

        it('uses repo.setEnabled when client is not registered', async () => {
            const svc = createServiceFixture({ name, enabled: false })
            clientRegistryMock.has.mockReturnValue(false)
            serviceRepositoryMock.setEnabled.mockResolvedValue(svc)
            serviceRepositoryMock.findBySlug.mockResolvedValue(svc)

            await service.disable(name)

            expect(serviceRepositoryMock.setEnabled).toHaveBeenCalledWith(name, false)
        })

        it('returns the updated service record', async () => {
            const svc = createServiceFixture({ name, enabled: false })
            clientRegistryMock.has.mockReturnValue(false)
            serviceRepositoryMock.setEnabled.mockResolvedValue(svc)
            serviceRepositoryMock.findBySlug.mockResolvedValue(svc)

            const result = await service.disable(name)

            expect(result).toEqual(expect.objectContaining({ id: svc.id, name: svc.name, slug: svc.slug, enabled: svc.enabled, accountType: svc.accountType }))
        })
    })

    // #endregion disable

    // #region updateImageUrl

    describe('updateImageUrl', () => {
        const name = IntegrationProvider.Jellyfin

        it('sets the image URL via the repository', async () => {
            const svc = createServiceFixture({ name, imageUrl: 'https://example.com/logo.png' })
            serviceRepositoryMock.setImageUrl.mockResolvedValue(svc)

            const result = await service.updateImageUrl(name, 'https://example.com/logo.png')

            expect(serviceRepositoryMock.setImageUrl).toHaveBeenCalledWith(name, 'https://example.com/logo.png')
            expect(result).toEqual(expect.objectContaining({ id: svc.id, name: svc.name, slug: svc.slug, enabled: svc.enabled, accountType: svc.accountType }))
        })

        it('throws NotFoundException when service record is not found', async () => {
            serviceRepositoryMock.setImageUrl.mockResolvedValue(null)

            await expect(service.updateImageUrl(name, 'https://example.com/logo.png')).rejects.toThrow(
                NotFoundException
            )
        })
    })

    // #endregion updateImageUrl

    // #region updateUrl

    describe('updateUrl', () => {
        const name = IntegrationProvider.Jellyfin

        it('sets the url via the repository', async () => {
            const svc = createServiceFixture({ name, url: 'https://jellyfin.example.com' })
            serviceRepositoryMock.setUrl.mockResolvedValue(svc)

            const result = await service.updateUrl(name, 'https://jellyfin.example.com')

            expect(serviceRepositoryMock.setUrl).toHaveBeenCalledWith(name, 'https://jellyfin.example.com')
            expect(result).toEqual(expect.objectContaining({ id: svc.id, name: svc.name, slug: svc.slug, enabled: svc.enabled, accountType: svc.accountType }))
        })

        it('throws NotFoundException when service record is not found', async () => {
            serviceRepositoryMock.setUrl.mockResolvedValue(null)

            await expect(service.updateUrl(name, 'https://jellyfin.example.com')).rejects.toThrow(NotFoundException)
        })
    })

    // #endregion updateUrl

    // #region listExternalAccounts

    describe('listExternalAccounts', () => {
        const name = IntegrationProvider.Jellyfin

        it('throws BadRequestException when the service has no account integration', async () => {
            serviceRepositoryMock.findBySlug.mockResolvedValue(createServiceFixture({ integrationProvider: null }))
            clientRegistryMock.get.mockReturnValue(null)

            await expect(service.listExternalAccounts(name)).rejects.toThrow(BadRequestException)
        })

        it('throws NotFoundException when the service does not exist', async () => {
            serviceRepositoryMock.findBySlug.mockResolvedValue(null)

            await expect(service.listExternalAccounts(name)).rejects.toThrow(NotFoundException)
        })

        it('returns mapped external accounts from the client', async () => {
            const users = [
                { id: 'ext-1', username: 'alice', isActive: true, isAdmin: false },
                { id: 'ext-2', username: 'bob', isActive: false, isAdmin: true },
            ]
            serviceRepositoryMock.findBySlug.mockResolvedValue(createServiceFixture())
            clientRegistryMock.has.mockReturnValue(true)
            clientRegistryMock.get.mockReturnValue({ getAllUsers: jest.fn().mockResolvedValue(users) } as any)

            const result = await service.listExternalAccounts(name)

            expect(result).toEqual(users)
        })

        it('returns an empty array when the client returns null', async () => {
            serviceRepositoryMock.findBySlug.mockResolvedValue(createServiceFixture())
            clientRegistryMock.has.mockReturnValue(true)
            clientRegistryMock.get.mockReturnValue({ getAllUsers: jest.fn().mockResolvedValue(null) } as any)

            const result = await service.listExternalAccounts(name)

            expect(result).toEqual([])
        })
    })

    // #endregion listExternalAccounts

    // #region delete

    describe('delete', () => {
        it('deletes a NONE service by its repository id', async () => {
            const svc = createNoAccountServiceFixture({ id: 7, slug: 'wiki' })
            serviceRepositoryMock.findBySlug.mockResolvedValue(svc)

            const result = await service.delete('wiki')

            expect(serviceRepositoryMock.findBySlug).toHaveBeenCalledWith('wiki')
            expect(serviceRepositoryMock.delete).toHaveBeenCalledWith(7)
            expect(result).toEqual(expect.objectContaining({ id: 7, slug: 'wiki', accountType: AccountType.NONE }))
        })

        it('deletes a REFERENCED service', async () => {
            const svc = createReferencedServiceFixture({ id: 8, slug: 'jellyseerr' })
            serviceRepositoryMock.findBySlug.mockResolvedValue(svc)

            const result = await service.delete('jellyseerr')

            expect(serviceRepositoryMock.delete).toHaveBeenCalledWith(8)
            expect(result).toEqual(expect.objectContaining({ slug: 'jellyseerr', accountType: AccountType.REFERENCED }))
        })

        it('cascades subscriptions of a REFERENCED service and notifies its users', async () => {
            const svc = createReferencedServiceFixture({ id: 8, slug: 'jellyseerr' })
            const subscriptions = [
                { id: 'sub-1', userId: 'user-a' },
                { id: 'sub-2', userId: 'user-b' },
                { id: 'sub-3', userId: 'user-a' },
            ]
            serviceRepositoryMock.findBySlug.mockResolvedValue(svc)
            subscriptionRepositoryMock.findMany.mockResolvedValue(subscriptions as any)
            subscriptionRepositoryMock.deleteByServiceId.mockResolvedValue(3)

            await service.delete('jellyseerr')

            expect(subscriptionRepositoryMock.findMany).toHaveBeenCalledWith({ serviceId: 8 })
            expect(subscriptionRepositoryMock.deleteByServiceId).toHaveBeenCalledWith(8)
            expect(serviceRepositoryMock.delete).toHaveBeenCalledWith(8)
            for (const userId of ['user-a', 'user-b']) {
                expect(eventEmitterMock.emit).toHaveBeenCalledWith('subscription.changed', { userId })
            }
        })

        it('does not cascade for a NONE service', async () => {
            const svc = createNoAccountServiceFixture({ id: 9, slug: 'wiki' })
            serviceRepositoryMock.findBySlug.mockResolvedValue(svc)

            await service.delete('wiki')

            expect(subscriptionRepositoryMock.deleteByServiceId).not.toHaveBeenCalled()
        })

        it('throws NotFoundException when the service does not exist', async () => {
            serviceRepositoryMock.findBySlug.mockResolvedValue(null)

            await expect(service.delete('missing')).rejects.toThrow(NotFoundException)
            expect(serviceRepositoryMock.delete).not.toHaveBeenCalled()
        })

        it('throws BadRequestException when the service is MANAGED', async () => {
            serviceRepositoryMock.findBySlug.mockResolvedValue(createServiceFixture({ slug: 'jellyfin' }))

            await expect(service.delete('jellyfin')).rejects.toThrow(BadRequestException)
            expect(serviceRepositoryMock.delete).not.toHaveBeenCalled()
        })

        it('propagates a ConflictException when the service is still referenced', async () => {
            serviceRepositoryMock.findBySlug.mockResolvedValue(createNoAccountServiceFixture({ slug: 'wiki' }))
            serviceRepositoryMock.delete.mockRejectedValue(new ConflictException('still referenced'))

            await expect(service.delete('wiki')).rejects.toThrow(ConflictException)
        })
    })

    // #endregion delete
})
