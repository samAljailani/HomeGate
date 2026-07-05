import { Test, TestingModule } from '@nestjs/testing'
import {
    BadRequestException,
    ConflictException,
    InternalServerErrorException,
    ServiceUnavailableException,
} from '@nestjs/common'
import { SubscriptionService } from '@/api/services/subscriptions.service'
import { UserService } from '@/api/services/user.service'
import { IServiceRepository, IUserAccountRepository } from '@/data/repositories'
import { ApplicationClientRegistry } from '@/core/clients/applicationClientRegistry'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { UserAccountStatus } from '@/types/enums'
import { createUserServiceMock } from '../../mocks/user.service.mock'
import { createUserAccountRepositoryMock } from '../../mocks/userAccount.repository.mock'
import { createServiceRepositoryMock } from '../../mocks/service.repository.mock'
import { createApplicationClientRegistryMock } from '../../mocks/applicationClientRegistry.mock'
import { createApplicationClientMock } from '../../mocks/applicationClient.mock'
import { createLoggerMock } from '../../mocks/logger.provider.mock'
import { createUserFixture } from '../../fixtures/user.stub'
import { createUserAccountFixture } from '../../fixtures/userAccount.stub'
import { createServiceFixture } from '../../fixtures/service.stub'
import {
    SubscriptionCreateRequestDto,
    SubscriptionDeleteRequestDto,
    SubscriptionDisableRequestDto,
} from '@/types/dtos/subscriptionsDto'

describe('SubscriptionService', () => {
    let service: SubscriptionService
    let userServiceMock: ReturnType<typeof createUserServiceMock>
    let userAccountRepoMock: ReturnType<typeof createUserAccountRepositoryMock>
    let serviceRepoMock: ReturnType<typeof createServiceRepositoryMock>
    let clientRegistryMock: ReturnType<typeof createApplicationClientRegistryMock>
    let loggerMock: ReturnType<typeof createLoggerMock>

    beforeEach(async () => {
        userServiceMock = createUserServiceMock()
        userAccountRepoMock = createUserAccountRepositoryMock()
        serviceRepoMock = createServiceRepositoryMock()
        clientRegistryMock = createApplicationClientRegistryMock()
        loggerMock = createLoggerMock()

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SubscriptionService,
                { provide: UserService, useValue: userServiceMock },
                { provide: IUserAccountRepository, useValue: userAccountRepoMock },
                { provide: IServiceRepository, useValue: serviceRepoMock },
                { provide: ApplicationClientRegistry, useValue: clientRegistryMock },
                { provide: LoggingProvider, useValue: loggerMock },
            ],
        }).compile()

        service = module.get(SubscriptionService)
    })

    // #region subscribe

    describe('subscribe', () => {
        const userId = 'user-uuid-1'
        const request: SubscriptionCreateRequestDto = {
            serviceId: 1,
            serviceUsername: 'newuser',
            servicePassword: 'pass123',
            confirmServicePassword: 'pass123',
            email: 'test@example.com',
            autoRenew: true,
        }

        function setupSuccessfulSubscribe() {
            const user = createUserFixture({ id: userId, email: 'test@example.com' })
            const serviceModel = createServiceFixture()
            const client = createApplicationClientMock()
            const createdAccount = createUserAccountFixture({ userId, status: UserAccountStatus.active })

            userServiceMock.getUserById.mockResolvedValue(user)
            serviceRepoMock.findById.mockResolvedValue(serviceModel)
            clientRegistryMock.getEnabled.mockResolvedValue([client])
            client.getUser.mockResolvedValue({ ok: false, user: null })
            userAccountRepoMock.find.mockResolvedValue(null)
            userAccountRepoMock.create.mockResolvedValue(
                createUserAccountFixture({ userId, status: UserAccountStatus.provisioning })
            )
            client.createUser.mockResolvedValue({
                ok: true,
                user: { id: 'external-id-1', username: 'newuser', isActive: true },
            })
            userAccountRepoMock.update.mockResolvedValue(createdAccount)

            return { user, serviceModel, client, createdAccount }
        }

        it('should create a new subscription successfully', async () => {
            const { createdAccount } = setupSuccessfulSubscribe()

            const result = await service.subscribe(request, userId)

            expect(result).toEqual(createdAccount)
            expect(userAccountRepoMock.create).toHaveBeenCalledWith(
                expect.objectContaining({ userId, status: UserAccountStatus.provisioning })
            )
        })

        it('should throw BadRequestException when user does not exist', async () => {
            userServiceMock.getUserById.mockResolvedValue(null)

            await expect(service.subscribe(request, userId)).rejects.toThrow(BadRequestException)
        })

        it('should throw BadRequestException when service is not available', async () => {
            userServiceMock.getUserById.mockResolvedValue(createUserFixture({ id: userId }))
            serviceRepoMock.findById.mockResolvedValue(null)

            await expect(service.subscribe(request, userId)).rejects.toThrow(BadRequestException)
        })

        it('should throw BadRequestException when service is disabled', async () => {
            userServiceMock.getUserById.mockResolvedValue(createUserFixture({ id: userId }))
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture({ enabled: false }))

            await expect(service.subscribe(request, userId)).rejects.toThrow(BadRequestException)
        })

        it('should throw ConflictException when user already has an active subscription', async () => {
            userServiceMock.getUserById.mockResolvedValue(createUserFixture({ id: userId }))
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            userAccountRepoMock.find.mockResolvedValue(
                createUserAccountFixture({ userId, status: UserAccountStatus.active })
            )

            await expect(service.subscribe(request, userId)).rejects.toThrow(ConflictException)
        })

        it('should throw ConflictException when user is disabled', async () => {
            userServiceMock.getUserById.mockResolvedValue(createUserFixture({ id: userId }))
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            userAccountRepoMock.find.mockResolvedValue(
                createUserAccountFixture({ userId, status: UserAccountStatus.disabled })
            )

            await expect(service.subscribe(request, userId)).rejects.toThrow(ConflictException)
            await expect(service.subscribe(request, userId)).rejects.toThrow('User is not allowed to subscribe')
        })

        it('should allow resubscribe when account is cancelled', async () => {
            const cancelledAccount = createUserAccountFixture({ userId, status: UserAccountStatus.cancelled })
            const activeAccount = createUserAccountFixture({ userId, status: UserAccountStatus.active })
            const client = createApplicationClientMock()

            userServiceMock.getUserById.mockResolvedValue(createUserFixture({ id: userId, email: 'test@example.com' }))
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            clientRegistryMock.getEnabled.mockResolvedValue([client])
            userAccountRepoMock.find.mockResolvedValue(cancelledAccount)
            client.getUser.mockResolvedValue({ ok: false, user: null })
            userAccountRepoMock.update.mockResolvedValue(activeAccount)
            client.createUser.mockResolvedValue({
                ok: true,
                user: { id: 'external-id-1', username: 'newuser', isActive: true },
            })

            const result = await service.subscribe(request, userId)

            expect(result).toEqual(activeAccount)
            expect(userAccountRepoMock.update).toHaveBeenCalledWith(
                expect.objectContaining({ status: UserAccountStatus.provisioning })
            )
        })

        it('should throw BadRequestException when passwords do not match', async () => {
            userServiceMock.getUserById.mockResolvedValue(createUserFixture({ id: userId, email: 'test@example.com' }))
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            userAccountRepoMock.find.mockResolvedValue(null)
            clientRegistryMock.getEnabled.mockResolvedValue([createApplicationClientMock()])

            const badRequest = { ...request, confirmServicePassword: 'mismatch' }

            await expect(service.subscribe(badRequest, userId)).rejects.toThrow(BadRequestException)
        })

        it('should throw ConflictException when external account already exists', async () => {
            const client = createApplicationClientMock()
            userServiceMock.getUserById.mockResolvedValue(createUserFixture({ id: userId, email: 'test@example.com' }))
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            userAccountRepoMock.find.mockResolvedValue(null)
            clientRegistryMock.getEnabled.mockResolvedValue([client])
            client.getUser.mockResolvedValue({
                ok: true,
                user: { id: 'ext-1', username: 'newuser', isActive: true },
            })

            await expect(service.subscribe(request, userId)).rejects.toThrow(ConflictException)
        })

        it('should mark subscription as failed when createUser returns invalid response', async () => {
            const client = createApplicationClientMock()
            const provisioningAccount = createUserAccountFixture({ userId, status: UserAccountStatus.provisioning })

            userServiceMock.getUserById.mockResolvedValue(createUserFixture({ id: userId, email: 'test@example.com' }))
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            userAccountRepoMock.find.mockResolvedValue(null)
            clientRegistryMock.getEnabled.mockResolvedValue([client])
            client.getUser.mockResolvedValue({ ok: false, user: null })
            userAccountRepoMock.create.mockResolvedValue(provisioningAccount)
            client.createUser.mockResolvedValue({ ok: false, user: null })

            await expect(service.subscribe(request, userId)).rejects.toThrow(InternalServerErrorException)
            expect(userAccountRepoMock.update).toHaveBeenCalledWith(
                expect.objectContaining({ status: UserAccountStatus.failed })
            )
        })
    })

    // #endregion subscribe

    // #region delete

    describe('delete', () => {
        const currentUserId = 'user-uuid-1'
        const request: SubscriptionDeleteRequestDto = {
            userId: 'user-uuid-1',
            serviceId: 1,
        }

        it('should throw BadRequestException when user does not exist', async () => {
            userServiceMock.getUserById.mockResolvedValue(null)

            await expect(service.delete(request, currentUserId)).rejects.toThrow(BadRequestException)
        })

        it('should throw BadRequestException when non-admin tries to delete another user subscription', async () => {
            const user = createUserFixture({ id: 'other-user', isAdmin: false })
            const currentUser = createUserFixture({ id: currentUserId, isAdmin: false })

            userServiceMock.getUserById.mockResolvedValueOnce(user).mockResolvedValueOnce(currentUser)

            const otherUserRequest = { ...request, userId: 'other-user' }

            await expect(service.delete(otherUserRequest, currentUserId)).rejects.toThrow(BadRequestException)
        })

        it('should allow admin to delete another user subscription', async () => {
            const targetUser = createUserFixture({ id: 'target-user' })
            const adminUser = createUserFixture({ id: currentUserId, isAdmin: true })
            const activeAccount = createUserAccountFixture({
                userId: 'target-user',
                status: UserAccountStatus.active,
                expiresAt: new Date(Date.now() + 86400000),
                autoRenew: true,
            })

            userServiceMock.getUserById.mockResolvedValueOnce(targetUser).mockResolvedValueOnce(adminUser)
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            userAccountRepoMock.find.mockResolvedValue(activeAccount)
            userAccountRepoMock.update.mockResolvedValue({ ...activeAccount, autoRenew: false })

            const result = await service.delete({ ...request, userId: 'target-user' }, currentUserId)

            expect(result).toBe(true)
        })

        it('should cancel subscription immediately when deleteImmediately is true', async () => {
            const user = createUserFixture({ id: currentUserId })
            const activeAccount = createUserAccountFixture({
                userId: currentUserId,
                status: UserAccountStatus.active,
                expiresAt: new Date(Date.now() + 86400000),
            })
            const client = createApplicationClientMock()

            userServiceMock.getUserById.mockResolvedValue(user)
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            userAccountRepoMock.find.mockResolvedValue(activeAccount)
            clientRegistryMock.getEnabled.mockResolvedValue([client])
            client.deleteUser.mockResolvedValue(true)
            userAccountRepoMock.update.mockResolvedValue({ ...activeAccount, status: UserAccountStatus.cancelled })

            const result = await service.delete({ ...request, deleteImmediately: true }, currentUserId)

            expect(result).toBe(true)
            expect(client.deleteUser).toHaveBeenCalled()
            expect(userAccountRepoMock.update).toHaveBeenCalledWith(
                expect.objectContaining({ status: UserAccountStatus.cancelling })
            )
        })

        it('should mark as failed when immediate delete fails externally', async () => {
            const user = createUserFixture({ id: currentUserId })
            const activeAccount = createUserAccountFixture({
                userId: currentUserId,
                status: UserAccountStatus.active,
                expiresAt: new Date(Date.now() + 86400000),
            })
            const client = createApplicationClientMock()

            userServiceMock.getUserById.mockResolvedValue(user)
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            userAccountRepoMock.find.mockResolvedValue(activeAccount)
            clientRegistryMock.getEnabled.mockResolvedValue([client])
            client.deleteUser.mockResolvedValue(false)
            userAccountRepoMock.update.mockResolvedValue(activeAccount)

            await expect(service.delete({ ...request, deleteImmediately: true }, currentUserId)).rejects.toThrow(
                ServiceUnavailableException
            )
            expect(userAccountRepoMock.update).toHaveBeenCalledWith(
                expect.objectContaining({ status: UserAccountStatus.failed })
            )
        })

        it('should disable auto-renew when deleteImmediately is not set', async () => {
            const user = createUserFixture({ id: currentUserId })
            const activeAccount = createUserAccountFixture({
                userId: currentUserId,
                status: UserAccountStatus.active,
                expiresAt: new Date(Date.now() + 86400000),
                autoRenew: true,
            })

            userServiceMock.getUserById.mockResolvedValue(user)
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            userAccountRepoMock.find.mockResolvedValue(activeAccount)
            userAccountRepoMock.update.mockResolvedValue({ ...activeAccount, autoRenew: false })

            const result = await service.delete(request, currentUserId)

            expect(result).toBe(true)
            expect(userAccountRepoMock.update).toHaveBeenCalledWith(expect.objectContaining({ autoRenew: false }))
        })

        it('should return true when auto-renew is already disabled', async () => {
            const user = createUserFixture({ id: currentUserId })
            const activeAccount = createUserAccountFixture({
                userId: currentUserId,
                status: UserAccountStatus.active,
                expiresAt: new Date(Date.now() + 86400000),
                autoRenew: false,
            })

            userServiceMock.getUserById.mockResolvedValue(user)
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            userAccountRepoMock.find.mockResolvedValue(activeAccount)

            const result = await service.delete(request, currentUserId)

            expect(result).toBe(true)
            expect(userAccountRepoMock.update).not.toHaveBeenCalled()
        })
    })

    // #endregion delete

    // #region disable / enable

    describe('disable', () => {
        const currentUserId = 'admin-uuid-1'
        const request: SubscriptionDisableRequestDto = {
            userId: 'user-uuid-1',
            serviceId: 1,
        }

        it('should throw BadRequestException when caller is not admin', async () => {
            userServiceMock.getUserById.mockResolvedValue(createUserFixture({ id: currentUserId, isAdmin: false }))

            await expect(service.disable(request, currentUserId)).rejects.toThrow(BadRequestException)
            await expect(service.disable(request, currentUserId)).rejects.toThrow('admin access required')
        })

        it('should throw BadRequestException when caller does not exist', async () => {
            userServiceMock.getUserById.mockResolvedValue(null)

            await expect(service.disable(request, currentUserId)).rejects.toThrow(BadRequestException)
        })

        it('should disable an active subscription', async () => {
            const adminUser = createUserFixture({ id: currentUserId, isAdmin: true })
            const targetUser = createUserFixture({ id: request.userId })
            const activeAccount = createUserAccountFixture({
                userId: request.userId,
                status: UserAccountStatus.active,
                expiresAt: new Date(Date.now() + 86400000),
            })
            const client = createApplicationClientMock()

            userServiceMock.getUserById.mockResolvedValueOnce(adminUser).mockResolvedValueOnce(targetUser)
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            userAccountRepoMock.find.mockResolvedValue(activeAccount)
            clientRegistryMock.getEnabled.mockResolvedValue([client])
            client.disableUser.mockResolvedValue(true)
            userAccountRepoMock.update.mockResolvedValue({ ...activeAccount, status: UserAccountStatus.disabled })

            const result = await service.disable(request, currentUserId)

            expect(result).toBe(true)
        })

        it('should throw ConflictException when account is not active', async () => {
            const adminUser = createUserFixture({ id: currentUserId, isAdmin: true })
            const targetUser = createUserFixture({ id: request.userId })

            userServiceMock.getUserById.mockResolvedValueOnce(adminUser).mockResolvedValueOnce(targetUser)
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            userAccountRepoMock.find.mockResolvedValue(
                createUserAccountFixture({ userId: request.userId, status: UserAccountStatus.disabled })
            )

            await expect(service.disable(request, currentUserId)).rejects.toThrow(ConflictException)
        })
    })

    describe('enable', () => {
        const currentUserId = 'admin-uuid-1'
        const request: SubscriptionDisableRequestDto = {
            userId: 'user-uuid-1',
            serviceId: 1,
        }

        it('should throw BadRequestException when caller is not admin', async () => {
            userServiceMock.getUserById.mockResolvedValue(createUserFixture({ id: currentUserId, isAdmin: false }))

            await expect(service.enable(request, currentUserId)).rejects.toThrow(BadRequestException)
        })

        it('should enable a disabled subscription', async () => {
            const adminUser = createUserFixture({ id: currentUserId, isAdmin: true })
            const targetUser = createUserFixture({ id: request.userId })
            const disabledAccount = createUserAccountFixture({
                userId: request.userId,
                status: UserAccountStatus.disabled,
                expiresAt: new Date(Date.now() + 86400000),
            })
            const client = createApplicationClientMock()

            userServiceMock.getUserById.mockResolvedValueOnce(adminUser).mockResolvedValueOnce(targetUser)
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            userAccountRepoMock.find.mockResolvedValue(disabledAccount)
            clientRegistryMock.getEnabled.mockResolvedValue([client])
            client.enableUser.mockResolvedValue(true)
            userAccountRepoMock.update.mockResolvedValue({ ...disabledAccount, status: UserAccountStatus.active })

            const result = await service.enable(request, currentUserId)

            expect(result).toBe(true)
            expect(client.enableUser).toHaveBeenCalled()
        })

        it('should throw ConflictException when account is not disabled', async () => {
            const adminUser = createUserFixture({ id: currentUserId, isAdmin: true })
            const targetUser = createUserFixture({ id: request.userId })

            userServiceMock.getUserById.mockResolvedValueOnce(adminUser).mockResolvedValueOnce(targetUser)
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            userAccountRepoMock.find.mockResolvedValue(
                createUserAccountFixture({
                    userId: request.userId,
                    status: UserAccountStatus.active,
                    expiresAt: new Date(Date.now() + 86400000),
                })
            )

            await expect(service.enable(request, currentUserId)).rejects.toThrow(ConflictException)
        })

        it('should mark as failed when enableUser returns false', async () => {
            const adminUser = createUserFixture({ id: currentUserId, isAdmin: true })
            const targetUser = createUserFixture({ id: request.userId })
            const disabledAccount = createUserAccountFixture({
                userId: request.userId,
                status: UserAccountStatus.disabled,
                expiresAt: new Date(Date.now() + 86400000),
            })
            const client = createApplicationClientMock()

            userServiceMock.getUserById.mockResolvedValueOnce(adminUser).mockResolvedValueOnce(targetUser)
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            userAccountRepoMock.find.mockResolvedValue(disabledAccount)
            clientRegistryMock.getEnabled.mockResolvedValue([client])
            client.enableUser.mockResolvedValue(false)
            userAccountRepoMock.update.mockResolvedValue(disabledAccount)

            await expect(service.enable(request, currentUserId)).rejects.toThrow(InternalServerErrorException)
        })
    })

    // #endregion disable / enable

    // #region cleanUpSubscriptions

    describe('cleanUpSubscriptions', () => {
        it('should auto-renew expired subscriptions with autoRenew enabled', async () => {
            const expired = createUserAccountFixture({
                status: UserAccountStatus.active,
                autoRenew: true,
                expiresAt: new Date(Date.now() - 86400000),
            })

            userAccountRepoMock.findMany.mockResolvedValue([expired])

            await service.cleanUpSubscriptions()

            expect(userAccountRepoMock.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: expired.userId,
                    serviceId: expired.serviceId,
                    expiresAt: expect.any(Date),
                })
            )
        })

        it('should expire subscriptions past expiresAt without autoRenew', async () => {
            const expired = createUserAccountFixture({
                status: UserAccountStatus.active,
                autoRenew: false,
                expiresAt: new Date(Date.now() - 86400000),
            })
            const client = createApplicationClientMock()

            userAccountRepoMock.findMany.mockResolvedValue([expired])
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            clientRegistryMock.getEnabled.mockResolvedValue([client])
            userServiceMock.getUserById.mockResolvedValue(createUserFixture({ id: expired.userId }))
            client.disableUser.mockResolvedValue(true)
            userAccountRepoMock.update.mockResolvedValue(expired)

            await service.cleanUpSubscriptions()

            expect(userAccountRepoMock.update).toHaveBeenCalledWith(
                expect.objectContaining({ status: UserAccountStatus.expired })
            )
        })

        it('should disable subscriptions with no expiration date', async () => {
            const noExpiry = createUserAccountFixture({
                status: UserAccountStatus.active,
                expiresAt: null,
            })
            const client = createApplicationClientMock()

            userAccountRepoMock.findMany.mockResolvedValue([noExpiry])
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            clientRegistryMock.getEnabled.mockResolvedValue([client])
            userServiceMock.getUserById.mockResolvedValue(createUserFixture({ id: noExpiry.userId }))
            client.disableUser.mockResolvedValue(true)
            userAccountRepoMock.update.mockResolvedValue(noExpiry)

            await service.cleanUpSubscriptions()

            expect(userAccountRepoMock.update).toHaveBeenCalledWith(
                expect.objectContaining({ status: UserAccountStatus.disabled })
            )
            expect(loggerMock.warn).toHaveBeenCalled()
        })

        it('should skip subscriptions that are still active', async () => {
            const stillActive = createUserAccountFixture({
                status: UserAccountStatus.active,
                expiresAt: new Date(Date.now() + 86400000),
            })

            userAccountRepoMock.findMany.mockResolvedValue([stillActive])

            await service.cleanUpSubscriptions()

            expect(userAccountRepoMock.update).not.toHaveBeenCalled()
        })

        it('should mark as failed when disableUser throws', async () => {
            const expired = createUserAccountFixture({
                status: UserAccountStatus.active,
                autoRenew: false,
                expiresAt: new Date(Date.now() - 86400000),
            })
            const client = createApplicationClientMock()

            userAccountRepoMock.findMany.mockResolvedValue([expired])
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            clientRegistryMock.getEnabled.mockResolvedValue([client])
            userServiceMock.getUserById.mockResolvedValue(createUserFixture({ id: expired.userId }))
            client.disableUser.mockResolvedValue(false)
            userAccountRepoMock.update.mockResolvedValue(expired)

            await service.cleanUpSubscriptions()

            expect(userAccountRepoMock.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: UserAccountStatus.failed,
                    lastError: expect.any(String),
                })
            )
        })
    })

    // #endregion cleanUpSubscriptions

    // #region syncClientAccounts

    describe('syncClientAccounts', () => {
        it('should disable orphaned external accounts with no local record', async () => {
            const client = createApplicationClientMock()
            const svc = createServiceFixture()

            clientRegistryMock.getEnabled.mockResolvedValue([client])
            serviceRepoMock.findMany.mockResolvedValue([svc])
            userAccountRepoMock.findMany.mockResolvedValue([])
            client.getAllUsers.mockResolvedValue([{ id: 'orphan-1', username: 'orphan', isActive: true }])

            await service.syncClientAccounts()

            expect(client.disableUser).toHaveBeenCalledWith(
                expect.objectContaining({ userServiceAccountId: 'orphan-1' })
            )
            expect(loggerMock.warn).toHaveBeenCalled()
        })

        it('should disable external account when local record is not active', async () => {
            const client = createApplicationClientMock()
            const svc = createServiceFixture()
            const cancelledAccount = createUserAccountFixture({
                status: UserAccountStatus.cancelled,
                userServiceAccountId: 'ext-1',
            })

            clientRegistryMock.getEnabled.mockResolvedValue([client])
            serviceRepoMock.findMany.mockResolvedValue([svc])
            userAccountRepoMock.findMany.mockResolvedValue([cancelledAccount])
            client.getAllUsers.mockResolvedValue([{ id: 'ext-1', username: 'testuser', isActive: true }])

            await service.syncClientAccounts()

            expect(client.disableUser).toHaveBeenCalledWith(expect.objectContaining({ userServiceAccountId: 'ext-1' }))
        })

        it('should enable external account when local is active but external is disabled', async () => {
            const client = createApplicationClientMock()
            const svc = createServiceFixture()
            const activeAccount = createUserAccountFixture({
                status: UserAccountStatus.active,
                userServiceAccountId: 'ext-1',
            })

            clientRegistryMock.getEnabled.mockResolvedValue([client])
            serviceRepoMock.findMany.mockResolvedValue([svc])
            userAccountRepoMock.findMany.mockResolvedValue([activeAccount])
            client.getAllUsers.mockResolvedValue([{ id: 'ext-1', username: 'testuser', isActive: false }])

            await service.syncClientAccounts()

            expect(client.enableUser).toHaveBeenCalledWith(expect.objectContaining({ userServiceAccountId: 'ext-1' }))
        })

        it('should mark local record as failed when active but external account is missing', async () => {
            const client = createApplicationClientMock()
            const svc = createServiceFixture()
            const activeAccount = createUserAccountFixture({
                status: UserAccountStatus.active,
                userServiceAccountId: 'ext-gone',
            })

            clientRegistryMock.getEnabled.mockResolvedValue([client])
            serviceRepoMock.findMany.mockResolvedValue([svc])
            userAccountRepoMock.findMany.mockResolvedValue([activeAccount])
            client.getAllUsers.mockResolvedValue([])
            userAccountRepoMock.update.mockResolvedValue(activeAccount)

            await service.syncClientAccounts()

            expect(userAccountRepoMock.update).toHaveBeenCalledWith(
                expect.objectContaining({ status: UserAccountStatus.failed })
            )
        })

        it('should skip clients when getAllUsers returns null', async () => {
            const client = createApplicationClientMock()

            clientRegistryMock.getEnabled.mockResolvedValue([client])
            serviceRepoMock.findMany.mockResolvedValue([createServiceFixture()])
            userAccountRepoMock.findMany.mockResolvedValue([])
            client.getAllUsers.mockResolvedValue(null)

            await service.syncClientAccounts()

            expect(client.disableUser).not.toHaveBeenCalled()
            expect(client.enableUser).not.toHaveBeenCalled()
            expect(loggerMock.warn).toHaveBeenCalled()
        })

        it('should not take action when external and local states match', async () => {
            const client = createApplicationClientMock()
            const svc = createServiceFixture()
            const activeAccount = createUserAccountFixture({
                status: UserAccountStatus.active,
                userServiceAccountId: 'ext-1',
            })

            clientRegistryMock.getEnabled.mockResolvedValue([client])
            serviceRepoMock.findMany.mockResolvedValue([svc])
            userAccountRepoMock.findMany.mockResolvedValue([activeAccount])
            client.getAllUsers.mockResolvedValue([{ id: 'ext-1', username: 'testuser', isActive: true }])

            await service.syncClientAccounts()

            expect(client.disableUser).not.toHaveBeenCalled()
            expect(client.enableUser).not.toHaveBeenCalled()
            expect(userAccountRepoMock.update).not.toHaveBeenCalled()
        })
    })

    // #endregion syncClientAccounts
})
