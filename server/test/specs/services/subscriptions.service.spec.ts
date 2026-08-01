import { Test, TestingModule } from '@nestjs/testing'
import {
    BadRequestException,
    ConflictException,
    InternalServerErrorException,
    NotFoundException,
    ServiceUnavailableException,
} from '@nestjs/common'
import { SubscriptionService } from '@/api/services/subscriptions.service'
import { UserService } from '@/api/services/user.service'
import { IServiceRepository, IUserAccountRepository } from '@/data/repositories'
import { ApplicationClientRegistry } from '@/core/clients/applicationClientRegistry'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { FailedOperation, UserAccountStatus } from '@/types/enums'
import { createUserServiceMock } from '../../mocks/user.service.mock'
import { createUserAccountRepositoryMock } from '../../mocks/userAccount.repository.mock'
import { createServiceRepositoryMock } from '../../mocks/service.repository.mock'
import { createApplicationClientRegistryMock } from '../../mocks/applicationClientRegistry.mock'
import { createApplicationClientMock } from '../../mocks/applicationClient.mock'
import { createLoggerMock } from '../../mocks/logger.provider.mock'
import { createUserFixture } from '../../fixtures/user.stub'
import { createUserAccountFixture, toSubscriptionResponseDto } from '../../fixtures/userAccount.stub'
import { createServiceFixture } from '../../fixtures/service.stub'
import { SubscriptionCreateRequestDto } from '@/types/dtos/subscriptionsDto'

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
                user: { id: 'external-id-1', username: 'newuser', isActive: true, isAdmin: false },
            })
            userAccountRepoMock.update.mockResolvedValue(createdAccount)

            return { user, serviceModel, client, createdAccount }
        }

        it('should create a new subscription successfully', async () => {
            const { createdAccount } = setupSuccessfulSubscribe()

            const result = await service.subscribe(request, userId)

            expect(result).toEqual(toSubscriptionResponseDto(createdAccount))
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
                user: { id: 'external-id-1', username: 'newuser', isActive: true, isAdmin: false },
            })

            const result = await service.subscribe(request, userId)

            expect(result).toEqual(toSubscriptionResponseDto(activeAccount))
            expect(userAccountRepoMock.update).toHaveBeenCalledWith(
                expect.objectContaining({ status: UserAccountStatus.provisioning })
            )
        })

        it('should reactivate existing external account when resubscribing and account is disabled', async () => {
            const cancelledAccount = createUserAccountFixture({
                userId,
                status: UserAccountStatus.cancelled,
                userServiceAccountId: 'old-ext-id',
            })
            const reactivatedAccount = createUserAccountFixture({ userId, status: UserAccountStatus.active })
            const client = createApplicationClientMock()

            userServiceMock.getUserById.mockResolvedValue(createUserFixture({ id: userId, email: 'test@example.com' }))
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            clientRegistryMock.getEnabled.mockResolvedValue([client])
            userAccountRepoMock.find.mockResolvedValue(cancelledAccount)
            client.getUser.mockResolvedValue({
                ok: true,
                user: { id: 'old-ext-id', username: 'testuser', isActive: false, isAdmin: false },
            })
            client.enableUser.mockResolvedValue(true)
            userAccountRepoMock.update.mockResolvedValue(reactivatedAccount)

            const result = await service.subscribe(request, userId)

            expect(result).toEqual(toSubscriptionResponseDto(reactivatedAccount))
            expect(client.enableUser).toHaveBeenCalledWith(
                expect.objectContaining({ userServiceAccountId: 'old-ext-id' })
            )
            expect(client.createUser).not.toHaveBeenCalled()
        })

        it('should reactivate existing external account when resubscribing and account is already active', async () => {
            const cancelledAccount = createUserAccountFixture({
                userId,
                status: UserAccountStatus.cancelled,
                userServiceAccountId: 'old-ext-id',
            })
            const reactivatedAccount = createUserAccountFixture({ userId, status: UserAccountStatus.active })
            const client = createApplicationClientMock()

            userServiceMock.getUserById.mockResolvedValue(createUserFixture({ id: userId, email: 'test@example.com' }))
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            clientRegistryMock.getEnabled.mockResolvedValue([client])
            userAccountRepoMock.find.mockResolvedValue(cancelledAccount)
            client.getUser.mockResolvedValue({
                ok: true,
                user: { id: 'old-ext-id', username: 'testuser', isActive: true, isAdmin: false },
            })
            client.enableUser.mockResolvedValue(true)
            userAccountRepoMock.update.mockResolvedValue(reactivatedAccount)

            const result = await service.subscribe(request, userId)

            expect(result).toEqual(toSubscriptionResponseDto(reactivatedAccount))
            expect(client.enableUser).toHaveBeenCalledWith(
                expect.objectContaining({ userServiceAccountId: 'old-ext-id' })
            )
        })

        it('should create a new account when resubscribing and old external account is gone', async () => {
            const cancelledAccount = createUserAccountFixture({
                userId,
                status: UserAccountStatus.cancelled,
                userServiceAccountId: 'old-ext-id',
            })
            const activeAccount = createUserAccountFixture({ userId, status: UserAccountStatus.active })
            const client = createApplicationClientMock()

            userServiceMock.getUserById.mockResolvedValue(createUserFixture({ id: userId, email: 'test@example.com' }))
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            clientRegistryMock.getEnabled.mockResolvedValue([client])
            userAccountRepoMock.find.mockResolvedValue(cancelledAccount)
            // First getUser call: old external account gone
            // Second getUser call: new username availability check returns not found
            client.getUser
                .mockResolvedValueOnce({ ok: false, user: null })
                .mockResolvedValueOnce({ ok: false, user: null })
            userAccountRepoMock.update.mockResolvedValue(activeAccount)
            client.createUser.mockResolvedValue({
                ok: true,
                user: { id: 'new-ext-id', username: request.serviceUsername, isActive: true, isAdmin: false },
            })

            const result = await service.subscribe(request, userId)

            expect(result).toEqual(toSubscriptionResponseDto(activeAccount))
            expect(client.createUser).toHaveBeenCalled()
        })

        it('should allow resubscribe when previous failure was during provisioning', async () => {
            const failedAccount = createUserAccountFixture({
                userId,
                status: UserAccountStatus.failed,
                failedOperation: FailedOperation.provisioning,
            })
            const activeAccount = createUserAccountFixture({ userId, status: UserAccountStatus.active })
            const client = createApplicationClientMock()

            userServiceMock.getUserById.mockResolvedValue(createUserFixture({ id: userId, email: 'test@example.com' }))
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            clientRegistryMock.getEnabled.mockResolvedValue([client])
            userAccountRepoMock.find.mockResolvedValue(failedAccount)
            client.getUser.mockResolvedValue({ ok: false, user: null })
            userAccountRepoMock.update.mockResolvedValue(activeAccount)
            client.createUser.mockResolvedValue({
                ok: true,
                user: { id: 'external-id-1', username: 'newuser', isActive: true, isAdmin: false },
            })

            const result = await service.subscribe(request, userId)

            expect(result).toEqual(toSubscriptionResponseDto(activeAccount))
        })

        it.each([FailedOperation.cancellation, FailedOperation.expiration, FailedOperation.sync])(
            'should throw ConflictException when previous failure was during %s',
            async (failedOperation) => {
                userServiceMock.getUserById.mockResolvedValue(createUserFixture({ id: userId }))
                serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
                userAccountRepoMock.find.mockResolvedValue(
                    createUserAccountFixture({ userId, status: UserAccountStatus.failed, failedOperation })
                )

                await expect(service.subscribe(request, userId)).rejects.toThrow(ConflictException)
            }
        )

        it('should throw ConflictException when external account already exists', async () => {
            const client = createApplicationClientMock()
            userServiceMock.getUserById.mockResolvedValue(createUserFixture({ id: userId, email: 'test@example.com' }))
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            userAccountRepoMock.find.mockResolvedValue(null)
            clientRegistryMock.getEnabled.mockResolvedValue([client])
            client.getUser.mockResolvedValue({
                ok: true,
                user: { id: 'ext-1', username: 'newuser', isActive: true, isAdmin: false },
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
        const subscriptionId = 'subscription-uuid-1'
        const currentUserId = 'user-uuid-1'

        function createActiveAccount(overrides: Parameters<typeof createUserAccountFixture>[0] = {}) {
            return createUserAccountFixture({
                id: subscriptionId,
                userId: currentUserId,
                status: UserAccountStatus.active,
                expiresAt: new Date(Date.now() + 86400000),
                ...overrides,
            })
        }

        it('should throw NotFoundException when subscription does not exist', async () => {
            userAccountRepoMock.findById.mockResolvedValue(null)

            await expect(service.delete(subscriptionId, currentUserId)).rejects.toThrow(NotFoundException)
        })

        it('should throw BadRequestException when user does not exist', async () => {
            userAccountRepoMock.findById.mockResolvedValue(createActiveAccount())
            userServiceMock.getUserById.mockResolvedValue(null)

            await expect(service.delete(subscriptionId, currentUserId)).rejects.toThrow(BadRequestException)
        })

        it('should throw BadRequestException when non-admin tries to delete another user subscription', async () => {
            const user = createUserFixture({ id: 'other-user', isAdmin: false })
            const currentUser = createUserFixture({ id: currentUserId, isAdmin: false })

            userAccountRepoMock.findById.mockResolvedValue(createActiveAccount({ userId: 'other-user' }))
            userServiceMock.getUserById.mockResolvedValueOnce(user).mockResolvedValueOnce(currentUser)

            await expect(service.delete(subscriptionId, currentUserId)).rejects.toThrow(BadRequestException)
        })

        it('should allow admin to delete another user subscription', async () => {
            const targetUser = createUserFixture({ id: 'target-user' })
            const adminUser = createUserFixture({ id: currentUserId, isAdmin: true })
            const activeAccount = createActiveAccount({ userId: 'target-user', autoRenew: true })

            userAccountRepoMock.findById.mockResolvedValue(activeAccount)
            userServiceMock.getUserById.mockResolvedValueOnce(targetUser).mockResolvedValueOnce(adminUser)
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            userAccountRepoMock.update.mockResolvedValue({ ...activeAccount, autoRenew: false })

            const result = await service.delete(subscriptionId, currentUserId)

            expect(result).toBe(true)
        })

        it('should cancel subscription immediately when immediate delete is requested', async () => {
            const user = createUserFixture({ id: currentUserId })
            const activeAccount = createActiveAccount()
            const client = createApplicationClientMock()

            userAccountRepoMock.findById.mockResolvedValue(activeAccount)
            userServiceMock.getUserById.mockResolvedValue(user)
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            clientRegistryMock.getEnabled.mockResolvedValue([client])
            client.deleteUser.mockResolvedValue(true)
            userAccountRepoMock.update.mockResolvedValue({ ...activeAccount, status: UserAccountStatus.cancelled })

            const result = await service.delete(subscriptionId, currentUserId, true)

            expect(result).toBe(true)
            expect(client.deleteUser).toHaveBeenCalled()
            expect(userAccountRepoMock.update).toHaveBeenCalledWith(
                expect.objectContaining({ status: UserAccountStatus.cancelling })
            )
        })

        it('should mark as failed when immediate delete fails externally', async () => {
            const user = createUserFixture({ id: currentUserId })
            const activeAccount = createActiveAccount()
            const client = createApplicationClientMock()

            userAccountRepoMock.findById.mockResolvedValue(activeAccount)
            userServiceMock.getUserById.mockResolvedValue(user)
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            clientRegistryMock.getEnabled.mockResolvedValue([client])
            client.deleteUser.mockResolvedValue(false)
            userAccountRepoMock.update.mockResolvedValue(activeAccount)

            const result = await service.delete(subscriptionId, currentUserId, true)

            expect(result).toBe(false)
            expect(userAccountRepoMock.update).toHaveBeenCalledWith(
                expect.objectContaining({ status: UserAccountStatus.failed })
            )
        })

        it('should disable auto-renew when immediate delete is not requested', async () => {
            const user = createUserFixture({ id: currentUserId })
            const activeAccount = createActiveAccount({ autoRenew: true })

            userAccountRepoMock.findById.mockResolvedValue(activeAccount)
            userServiceMock.getUserById.mockResolvedValue(user)
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            userAccountRepoMock.update.mockResolvedValue({ ...activeAccount, autoRenew: false })

            const result = await service.delete(subscriptionId, currentUserId)

            expect(result).toBe(true)
            expect(userAccountRepoMock.update).toHaveBeenCalledWith(expect.objectContaining({ autoRenew: false }))
        })

        it('should return true when auto-renew is already disabled', async () => {
            const user = createUserFixture({ id: currentUserId })
            const activeAccount = createActiveAccount({ autoRenew: false })

            userAccountRepoMock.findById.mockResolvedValue(activeAccount)
            userServiceMock.getUserById.mockResolvedValue(user)
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())

            const result = await service.delete(subscriptionId, currentUserId)

            expect(result).toBe(true)
            expect(userAccountRepoMock.update).not.toHaveBeenCalled()
        })
    })

    // #endregion delete

    // #region update — enabled

    describe('update — enabled: false (disable)', () => {
        const subscriptionId = 'subscription-uuid-1'
        const userId = 'user-uuid-1'
        const serviceId = 1

        it('should disable an active subscription', async () => {
            const targetUser = createUserFixture({ id: userId })
            const activeAccount = createUserAccountFixture({
                id: subscriptionId,
                userId,
                serviceId,
                status: UserAccountStatus.active,
                expiresAt: new Date(Date.now() + 86400000),
            })
            const client = createApplicationClientMock()

            userAccountRepoMock.findById.mockResolvedValue(activeAccount)
            userServiceMock.getUserById.mockResolvedValue(targetUser)
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            userAccountRepoMock.find.mockResolvedValue(activeAccount)
            clientRegistryMock.getEnabled.mockResolvedValue([client])
            client.disableUser.mockResolvedValue(true)
            userAccountRepoMock.update.mockResolvedValue({ ...activeAccount, status: UserAccountStatus.disabled })

            const result = await service.update(subscriptionId, { enabled: false })

            expect(client.disableUser).toHaveBeenCalled()
            expect(userAccountRepoMock.update).toHaveBeenCalledWith(
                expect.objectContaining({ status: UserAccountStatus.disabled })
            )
            expect(result).toBeDefined()
        })

        it('should throw NotFoundException when subscription does not exist', async () => {
            userAccountRepoMock.findById.mockResolvedValue(null)

            await expect(service.update(subscriptionId, { enabled: false })).rejects.toThrow(NotFoundException)
        })

        it('should throw ConflictException when account is not active', async () => {
            const targetUser = createUserFixture({ id: userId })
            const disabledAccount = createUserAccountFixture({
                id: subscriptionId,
                userId,
                serviceId,
                status: UserAccountStatus.disabled,
            })

            userAccountRepoMock.findById.mockResolvedValue(disabledAccount)
            userServiceMock.getUserById.mockResolvedValue(targetUser)
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            userAccountRepoMock.find.mockResolvedValue(disabledAccount)

            await expect(service.update(subscriptionId, { enabled: false })).rejects.toThrow(ConflictException)
        })
    })

    describe('update — enabled: true (enable)', () => {
        const subscriptionId = 'subscription-uuid-1'
        const userId = 'user-uuid-1'
        const serviceId = 1

        it('should enable a disabled subscription', async () => {
            const targetUser = createUserFixture({ id: userId })
            const disabledAccount = createUserAccountFixture({
                id: subscriptionId,
                userId,
                serviceId,
                status: UserAccountStatus.disabled,
                expiresAt: new Date(Date.now() + 86400000),
            })
            const client = createApplicationClientMock()

            userAccountRepoMock.findById.mockResolvedValue(disabledAccount)
            userServiceMock.getUserById.mockResolvedValue(targetUser)
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            userAccountRepoMock.find.mockResolvedValue(disabledAccount)
            clientRegistryMock.getEnabled.mockResolvedValue([client])
            client.getUser.mockResolvedValue({
                ok: true,
                user: { id: 'ext-1', username: 'testuser', isActive: false, isAdmin: false },
            })
            client.enableUser.mockResolvedValue(true)
            userAccountRepoMock.update.mockResolvedValue({ ...disabledAccount, status: UserAccountStatus.active })

            const result = await service.update(subscriptionId, { enabled: true })

            expect(client.enableUser).toHaveBeenCalled()
            expect(result).toBeDefined()
        })

        it('should throw ConflictException when account is not disabled', async () => {
            const targetUser = createUserFixture({ id: userId })
            const activeAccount = createUserAccountFixture({
                id: subscriptionId,
                userId,
                serviceId,
                status: UserAccountStatus.active,
                expiresAt: new Date(Date.now() + 86400000),
            })

            userAccountRepoMock.findById.mockResolvedValue(activeAccount)
            userServiceMock.getUserById.mockResolvedValue(targetUser)
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            userAccountRepoMock.find.mockResolvedValue(activeAccount)

            await expect(service.update(subscriptionId, { enabled: true })).rejects.toThrow(ConflictException)
        })

        it('should mark as failed when enableUser returns false', async () => {
            const targetUser = createUserFixture({ id: userId })
            const disabledAccount = createUserAccountFixture({
                id: subscriptionId,
                userId,
                serviceId,
                status: UserAccountStatus.disabled,
                expiresAt: new Date(Date.now() + 86400000),
            })
            const client = createApplicationClientMock()

            userAccountRepoMock.findById.mockResolvedValue(disabledAccount)
            userServiceMock.getUserById.mockResolvedValue(targetUser)
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            userAccountRepoMock.find.mockResolvedValue(disabledAccount)
            clientRegistryMock.getEnabled.mockResolvedValue([client])
            client.getUser.mockResolvedValue({
                ok: true,
                user: { id: 'ext-1', username: 'testuser', isActive: false, isAdmin: false },
            })
            client.enableUser.mockResolvedValue(false)
            userAccountRepoMock.update.mockResolvedValue(disabledAccount)

            await expect(service.update(subscriptionId, { enabled: true })).rejects.toThrow(
                InternalServerErrorException
            )
        })

        it('should delete stale local record and return when enabling but external account no longer exists', async () => {
            const targetUser = createUserFixture({ id: userId })
            const disabledAccount = createUserAccountFixture({
                id: subscriptionId,
                userId,
                serviceId,
                status: UserAccountStatus.disabled,
                userServiceAccountId: 'ext-1',
                expiresAt: new Date(Date.now() + 86400000),
            })
            const client = createApplicationClientMock()

            userAccountRepoMock.findById.mockResolvedValue(disabledAccount)
            userServiceMock.getUserById.mockResolvedValue(targetUser)
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            userAccountRepoMock.find.mockResolvedValue(disabledAccount)
            clientRegistryMock.getEnabled.mockResolvedValue([client])
            client.getUser.mockResolvedValue({ ok: false, user: null })

            await service.update(subscriptionId, { enabled: true })

            expect(client.enableUser).not.toHaveBeenCalled()
            expect(userAccountRepoMock.delete).toHaveBeenCalledWith(userId, serviceId)
        })
    })

    // #endregion update — enabled

    // #region retryFailedOperation

    describe('retryFailedOperation', () => {
        const currentUserId = 'admin-uuid-1'
        const request = {
            userId: 'user-uuid-1',
            serviceId: 1,
        }

        it('should throw BadRequestException when not admin', async () => {
            userServiceMock.getUserById.mockResolvedValue(createUserFixture({ id: currentUserId, isAdmin: false }))

            await expect(service.retryFailedOperation(request.userId, request.serviceId, currentUserId)).rejects.toThrow(BadRequestException)
        })

        it('should throw ConflictException when account is not in failed state', async () => {
            userServiceMock.getUserById.mockResolvedValue(createUserFixture({ id: currentUserId, isAdmin: true }))
            userAccountRepoMock.find.mockResolvedValue(
                createUserAccountFixture({ userId: request.userId, status: UserAccountStatus.active })
            )

            await expect(service.retryFailedOperation(request.userId, request.serviceId, currentUserId)).rejects.toThrow(ConflictException)
        })

        it('should throw BadRequestException when failedOperation is provisioning', async () => {
            userServiceMock.getUserById.mockResolvedValue(createUserFixture({ id: currentUserId, isAdmin: true }))
            userAccountRepoMock.find.mockResolvedValue(
                createUserAccountFixture({
                    userId: request.userId,
                    status: UserAccountStatus.failed,
                    failedOperation: FailedOperation.provisioning,
                })
            )

            await expect(service.retryFailedOperation(request.userId, request.serviceId, currentUserId)).rejects.toThrow(BadRequestException)
        })

        it('should mark as cancelled when cancellation failed but external account is already gone', async () => {
            const failedAccount = createUserAccountFixture({
                userId: request.userId,
                status: UserAccountStatus.failed,
                failedOperation: FailedOperation.cancellation,
            })
            const client = createApplicationClientMock()

            userServiceMock.getUserById
                .mockResolvedValueOnce(createUserFixture({ id: currentUserId, isAdmin: true }))
                .mockResolvedValueOnce(createUserFixture({ id: request.userId }))
            userAccountRepoMock.find.mockResolvedValue(failedAccount)
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            clientRegistryMock.getEnabled.mockResolvedValue([client])
            client.getUser.mockResolvedValue({ ok: false, user: null })
            userAccountRepoMock.update.mockResolvedValue({ ...failedAccount, status: UserAccountStatus.cancelled })

            const result = await service.retryFailedOperation(request.userId, request.serviceId, currentUserId)

            expect(result).toBe(true)
            expect(client.deleteUser).not.toHaveBeenCalled()
            expect(userAccountRepoMock.update).toHaveBeenCalledWith(
                expect.objectContaining({ status: UserAccountStatus.cancelled, failedOperation: null })
            )
        })

        it('should retry deleteUser and mark as cancelled when cancellation failed and external account still exists', async () => {
            const failedAccount = createUserAccountFixture({
                userId: request.userId,
                status: UserAccountStatus.failed,
                failedOperation: FailedOperation.cancellation,
            })
            const client = createApplicationClientMock()

            userServiceMock.getUserById
                .mockResolvedValueOnce(createUserFixture({ id: currentUserId, isAdmin: true }))
                .mockResolvedValueOnce(createUserFixture({ id: request.userId }))
            userAccountRepoMock.find.mockResolvedValue(failedAccount)
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            clientRegistryMock.getEnabled.mockResolvedValue([client])
            client.getUser.mockResolvedValue({
                ok: true,
                user: { id: 'ext-1', username: 'testuser', isActive: true, isAdmin: false },
            })
            client.deleteUser.mockResolvedValue(true)
            userAccountRepoMock.update.mockResolvedValue({ ...failedAccount, status: UserAccountStatus.cancelled })

            const result = await service.retryFailedOperation(request.userId, request.serviceId, currentUserId)

            expect(result).toBe(true)
            expect(client.deleteUser).toHaveBeenCalled()
            expect(userAccountRepoMock.update).toHaveBeenCalledWith(
                expect.objectContaining({ status: UserAccountStatus.cancelled, failedOperation: null })
            )
        })

        it('should mark as expired when expiration failed but external account is already disabled', async () => {
            const failedAccount = createUserAccountFixture({
                userId: request.userId,
                status: UserAccountStatus.failed,
                failedOperation: FailedOperation.expiration,
            })
            const client = createApplicationClientMock()

            userServiceMock.getUserById
                .mockResolvedValueOnce(createUserFixture({ id: currentUserId, isAdmin: true }))
                .mockResolvedValueOnce(createUserFixture({ id: request.userId }))
            userAccountRepoMock.find.mockResolvedValue(failedAccount)
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            clientRegistryMock.getEnabled.mockResolvedValue([client])
            client.getUser.mockResolvedValue({
                ok: true,
                user: { id: 'ext-1', username: 'testuser', isActive: false, isAdmin: false },
            })
            userAccountRepoMock.update.mockResolvedValue({ ...failedAccount, status: UserAccountStatus.expired })

            const result = await service.retryFailedOperation(request.userId, request.serviceId, currentUserId)

            expect(result).toBe(true)
            expect(client.disableUser).not.toHaveBeenCalled()
            expect(userAccountRepoMock.update).toHaveBeenCalledWith(
                expect.objectContaining({ status: UserAccountStatus.expired, failedOperation: null })
            )
        })

        it('should retry disableUser and mark as expired when expiration failed and external account is still active', async () => {
            const failedAccount = createUserAccountFixture({
                userId: request.userId,
                status: UserAccountStatus.failed,
                failedOperation: FailedOperation.expiration,
            })
            const client = createApplicationClientMock()

            userServiceMock.getUserById
                .mockResolvedValueOnce(createUserFixture({ id: currentUserId, isAdmin: true }))
                .mockResolvedValueOnce(createUserFixture({ id: request.userId }))
            userAccountRepoMock.find.mockResolvedValue(failedAccount)
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            clientRegistryMock.getEnabled.mockResolvedValue([client])
            client.getUser.mockResolvedValue({
                ok: true,
                user: { id: 'ext-1', username: 'testuser', isActive: true, isAdmin: false },
            })
            client.disableUser.mockResolvedValue(true)
            userAccountRepoMock.update.mockResolvedValue({ ...failedAccount, status: UserAccountStatus.expired })

            const result = await service.retryFailedOperation(request.userId, request.serviceId, currentUserId)

            expect(result).toBe(true)
            expect(client.disableUser).toHaveBeenCalled()
            expect(userAccountRepoMock.update).toHaveBeenCalledWith(
                expect.objectContaining({ status: UserAccountStatus.expired, failedOperation: null })
            )
        })

        it('should mark as cancelled when sync failed and external account is confirmed gone', async () => {
            const failedAccount = createUserAccountFixture({
                userId: request.userId,
                status: UserAccountStatus.failed,
                failedOperation: FailedOperation.sync,
            })
            const client = createApplicationClientMock()

            userServiceMock.getUserById
                .mockResolvedValueOnce(createUserFixture({ id: currentUserId, isAdmin: true }))
                .mockResolvedValueOnce(createUserFixture({ id: request.userId }))
            userAccountRepoMock.find.mockResolvedValue(failedAccount)
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            clientRegistryMock.getEnabled.mockResolvedValue([client])
            client.getUser.mockResolvedValue({ ok: false, user: null })
            userAccountRepoMock.update.mockResolvedValue({ ...failedAccount, status: UserAccountStatus.cancelled })

            const result = await service.retryFailedOperation(request.userId, request.serviceId, currentUserId)

            expect(result).toBe(true)
            expect(userAccountRepoMock.update).toHaveBeenCalledWith(
                expect.objectContaining({ status: UserAccountStatus.cancelled, failedOperation: null })
            )
        })

        it('should restore to active when sync failed but external account is found', async () => {
            const failedAccount = createUserAccountFixture({
                userId: request.userId,
                status: UserAccountStatus.failed,
                failedOperation: FailedOperation.sync,
            })
            const client = createApplicationClientMock()

            userServiceMock.getUserById
                .mockResolvedValueOnce(createUserFixture({ id: currentUserId, isAdmin: true }))
                .mockResolvedValueOnce(createUserFixture({ id: request.userId }))
            userAccountRepoMock.find.mockResolvedValue(failedAccount)
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            clientRegistryMock.getEnabled.mockResolvedValue([client])
            client.getUser.mockResolvedValue({
                ok: true,
                user: { id: 'ext-1', username: 'testuser', isActive: true, isAdmin: false },
            })
            userAccountRepoMock.update.mockResolvedValue({ ...failedAccount, status: UserAccountStatus.active })

            const result = await service.retryFailedOperation(request.userId, request.serviceId, currentUserId)

            expect(result).toBe(true)
            expect(userAccountRepoMock.update).toHaveBeenCalledWith(
                expect.objectContaining({ status: UserAccountStatus.active, failedOperation: null })
            )
        })
    })

    // #endregion retryFailedOperation

    // #region processSubscriptions

    describe('processSubscriptions', () => {
        it('should auto-renew expired subscriptions with autoRenew enabled', async () => {
            const expired = createUserAccountFixture({
                status: UserAccountStatus.active,
                autoRenew: true,
                expiresAt: new Date(Date.now() - 86400000),
            })

            userAccountRepoMock.findMany.mockResolvedValue([expired])

            await service.processSubscriptions()

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

            await service.processSubscriptions()

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

            await service.processSubscriptions()

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

            await service.processSubscriptions()

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

            await service.processSubscriptions()

            expect(userAccountRepoMock.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: UserAccountStatus.failed,
                    lastError: expect.any(String),
                })
            )
        })
    })

    // #endregion processSubscriptions

    // #region syncClientAccounts

    describe('syncClientAccounts', () => {
        it('should disable orphaned external accounts with no local record', async () => {
            const client = createApplicationClientMock()
            const svc = createServiceFixture()

            clientRegistryMock.getEnabled.mockResolvedValue([client])
            serviceRepoMock.findMany.mockResolvedValue([svc])
            userAccountRepoMock.findMany.mockResolvedValue([])
            client.getAllUsers.mockResolvedValue([
                { id: 'orphan-1', username: 'orphan', isActive: true, isAdmin: false },
            ])

            await service.syncClientAccounts()

            expect(client.disableUser).toHaveBeenCalledWith(
                expect.objectContaining({ userServiceAccountId: 'orphan-1' })
            )
            expect(loggerMock.warn).toHaveBeenCalled()
        })

        it('should skip disabling orphaned admin accounts', async () => {
            const client = createApplicationClientMock()
            const svc = createServiceFixture()

            clientRegistryMock.getEnabled.mockResolvedValue([client])
            serviceRepoMock.findMany.mockResolvedValue([svc])
            userAccountRepoMock.findMany.mockResolvedValue([])
            client.getAllUsers.mockResolvedValue([{ id: 'admin-1', username: 'admin', isActive: true, isAdmin: true }])

            await service.syncClientAccounts()

            expect(client.disableUser).not.toHaveBeenCalled()
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
            client.getAllUsers.mockResolvedValue([
                { id: 'ext-1', username: 'testuser', isActive: true, isAdmin: false },
            ])

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
            client.getAllUsers.mockResolvedValue([
                { id: 'ext-1', username: 'testuser', isActive: false, isAdmin: false },
            ])

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
            client.getAllUsers.mockResolvedValue([
                { id: 'ext-1', username: 'testuser', isActive: true, isAdmin: false },
            ])

            await service.syncClientAccounts()

            expect(client.disableUser).not.toHaveBeenCalled()
            expect(client.enableUser).not.toHaveBeenCalled()
            expect(userAccountRepoMock.update).not.toHaveBeenCalled()
        })
    })

    // #endregion syncClientAccounts

    // #region cleanupStaleLocalAccounts

    describe('cleanupStaleLocalAccounts', () => {
        it('should delete stale local records for non-active accounts whose external account no longer exists', async () => {
            const client = createApplicationClientMock()
            const svc = createServiceFixture()
            const expiredAccount = createUserAccountFixture({
                status: UserAccountStatus.expired,
                userServiceAccountId: 'ext-gone',
            })

            clientRegistryMock.getEnabled.mockResolvedValue([client])
            serviceRepoMock.findMany.mockResolvedValue([svc])
            userAccountRepoMock.findMany.mockResolvedValue([expiredAccount])
            client.getAllUsers.mockResolvedValue([])

            await service.cleanupStaleLocalAccounts()

            expect(userAccountRepoMock.delete).toHaveBeenCalledWith(expiredAccount.userId, expiredAccount.serviceId)
        })

        it('should not delete non-active local records when external account still exists', async () => {
            const client = createApplicationClientMock()
            const svc = createServiceFixture()
            const cancelledAccount = createUserAccountFixture({
                status: UserAccountStatus.cancelled,
                userServiceAccountId: 'ext-1',
            })

            clientRegistryMock.getEnabled.mockResolvedValue([client])
            serviceRepoMock.findMany.mockResolvedValue([svc])
            userAccountRepoMock.findMany.mockResolvedValue([cancelledAccount])
            client.getAllUsers.mockResolvedValue([
                { id: 'ext-1', username: 'testuser', isActive: false, isAdmin: false },
            ])

            await service.cleanupStaleLocalAccounts()

            expect(userAccountRepoMock.delete).not.toHaveBeenCalled()
        })
    })

    // #endregion cleanupStaleLocalAccounts

    // #region disableAllForUser

    describe('disableAllForUser', () => {
        const userId = 'user-uuid-1'
        const user = createUserFixture({ id: userId })

        describe('when user has no active subscriptions', () => {
            it('does nothing', async () => {
                userAccountRepoMock.findMany.mockResolvedValue([])

                await service.disableAllForUser(userId)

                expect(userAccountRepoMock.update).not.toHaveBeenCalled()
            })
        })

        describe('when user has active subscriptions', () => {
            it('disables each external account', async () => {
                const account = createUserAccountFixture({ userId, status: UserAccountStatus.active })
                const client = createApplicationClientMock({ disableUser: jest.fn().mockResolvedValue(true) })
                userAccountRepoMock.findMany.mockResolvedValue([account])
                userServiceMock.getUserById.mockResolvedValue(user)
                clientRegistryMock.getEnabled.mockResolvedValue([client])
                serviceRepoMock.findById.mockResolvedValue(createServiceFixture())

                await service.disableAllForUser(userId)

                expect(client.disableUser).toHaveBeenCalled()
            })

            it('sets status to disabled and autoRenew to false', async () => {
                const account = createUserAccountFixture({ userId, status: UserAccountStatus.active })
                const client = createApplicationClientMock({ disableUser: jest.fn().mockResolvedValue(true) })
                userAccountRepoMock.findMany.mockResolvedValue([account])
                userServiceMock.getUserById.mockResolvedValue(user)
                clientRegistryMock.getEnabled.mockResolvedValue([client])
                serviceRepoMock.findById.mockResolvedValue(createServiceFixture())

                await service.disableAllForUser(userId)

                expect(userAccountRepoMock.update).toHaveBeenCalledWith(
                    expect.objectContaining({
                        userId,
                        serviceId: account.serviceId,
                        status: UserAccountStatus.disabled,
                        autoRenew: false,
                    })
                )
            })

            it('continues and still updates the DB record when the external call fails', async () => {
                const account = createUserAccountFixture({ userId, status: UserAccountStatus.active })
                const client = createApplicationClientMock({
                    disableUser: jest.fn().mockRejectedValue(new Error('timeout')),
                })
                userAccountRepoMock.findMany.mockResolvedValue([account])
                userServiceMock.getUserById.mockResolvedValue(user)
                clientRegistryMock.getEnabled.mockResolvedValue([client])
                serviceRepoMock.findById.mockResolvedValue(createServiceFixture())

                await expect(service.disableAllForUser(userId)).resolves.not.toThrow()

                expect(userAccountRepoMock.update).toHaveBeenCalledWith(
                    expect.objectContaining({ status: UserAccountStatus.disabled, autoRenew: false })
                )
            })

            it('skips non-active subscriptions', async () => {
                const cancelled = createUserAccountFixture({ userId, status: UserAccountStatus.cancelled })
                userAccountRepoMock.findMany.mockResolvedValue([cancelled])

                await service.disableAllForUser(userId)

                expect(userAccountRepoMock.update).not.toHaveBeenCalled()
            })
        })
    })

    // #endregion disableAllForUser
})
