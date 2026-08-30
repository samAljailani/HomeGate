import { Test, TestingModule } from '@nestjs/testing'
import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    InternalServerErrorException,
    NotFoundException,
    ServiceUnavailableException,
} from '@nestjs/common'
import { SubscriptionService } from '@/api/services/subscriptions.service'
import { UserService } from '@/api/services/user.service'
import { IServiceRepository, ISubscriptionRepository, IExternalUserAccountRepository } from '@/data/repositories'
import { AccountIntegrationRegistry } from '@/core/integrations/accountIntegrationRegistry'
import {
    ManagedAccountProvisioner,
    ReferencedAccountProvisioner,
    NoAccountProvisioner,
    SubscriptionProvisionerResolver,
} from '@/core/subscriptions/provisioners'
import { SubscriptionCascadeService } from '@/core/subscriptions/subscriptionCascade.service'
import { ServiceAccessService } from '@/api/services/serviceAccess.service'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { FailedOperation, SubscriptionStatus } from '@/types/enums'
import { createUserServiceMock } from '../../mocks/user.service.mock'
import {
    createSubscriptionRepositoryMock,
    createExternalUserAccountRepositoryMock,
} from '../../mocks/subscription.repository.mock'
import { createServiceRepositoryMock } from '../../mocks/service.repository.mock'
import { createAccountIntegrationRegistryMock } from '../../mocks/accountIntegrationRegistry.mock'
import { createAccountIntegrationProviderMock } from '../../mocks/accountIntegrationProvider.mock'
import { createLoggerMock } from '../../mocks/logger.provider.mock'
import { createUserFixture } from '../../fixtures/user.stub'
import {
    createSubscriptionFixture,
    createExternalUserAccountFixture,
    toSubscriptionResponseDto,
} from '../../fixtures/subscription.stub'
import {
    createServiceFixture,
    createNoAccountServiceFixture,
    createReferencedServiceFixture,
} from '../../fixtures/service.stub'
import { SubscriptionCreateRequestDto } from '@/types/dtos/subscriptionsDto'

describe('SubscriptionService', () => {
    let service: SubscriptionService
    let userServiceMock: ReturnType<typeof createUserServiceMock>
    let userAccountRepoMock: ReturnType<typeof createSubscriptionRepositoryMock>
    let externalAccountRepoMock: ReturnType<typeof createExternalUserAccountRepositoryMock>
    let serviceRepoMock: ReturnType<typeof createServiceRepositoryMock>
    let clientRegistryMock: ReturnType<typeof createAccountIntegrationRegistryMock>
    let accessServiceMock: jest.Mocked<Pick<ServiceAccessService, 'assertCanSubscribe' | 'resolveAccess'>>
    let loggerMock: ReturnType<typeof createLoggerMock>
    let eventsMock: jest.Mocked<Pick<EventEmitter2, 'emit'>>

    beforeEach(async () => {
        userServiceMock = createUserServiceMock()
        userAccountRepoMock = createSubscriptionRepositoryMock()
        externalAccountRepoMock = createExternalUserAccountRepositoryMock()
        serviceRepoMock = createServiceRepositoryMock()
        clientRegistryMock = createAccountIntegrationRegistryMock()
        accessServiceMock = { assertCanSubscribe: jest.fn(), resolveAccess: jest.fn() }
        loggerMock = createLoggerMock()
        eventsMock = { emit: jest.fn() }

        // Real provisioners and cascade so orchestration and integration behaviour are tested together.
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SubscriptionService,
                ManagedAccountProvisioner,
                ReferencedAccountProvisioner,
                NoAccountProvisioner,
                SubscriptionProvisionerResolver,
                SubscriptionCascadeService,
                { provide: UserService, useValue: userServiceMock },
                { provide: ISubscriptionRepository, useValue: userAccountRepoMock },
                { provide: IExternalUserAccountRepository, useValue: externalAccountRepoMock },
                { provide: IServiceRepository, useValue: serviceRepoMock },
                { provide: AccountIntegrationRegistry, useValue: clientRegistryMock },
                { provide: ServiceAccessService, useValue: accessServiceMock },
                { provide: EventEmitter2, useValue: eventsMock },
                { provide: LoggingProvider, useValue: loggerMock },
            ],
        }).compile()

        service = module.get(SubscriptionService)

        externalAccountRepoMock.findBySubscriptionId.mockResolvedValue(createExternalUserAccountFixture())
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
            const client = createAccountIntegrationProviderMock()
            const createdAccount = createSubscriptionFixture({ userId, status: SubscriptionStatus.active })

            userServiceMock.getUserById.mockResolvedValue(user)
            serviceRepoMock.findById.mockResolvedValue(serviceModel)
            clientRegistryMock.get.mockReturnValue(client)
            client.getUser.mockResolvedValue({ ok: false, user: null })
            userAccountRepoMock.find.mockResolvedValue(null)
            userAccountRepoMock.create.mockResolvedValue(
                createSubscriptionFixture({ userId, status: SubscriptionStatus.provisioning })
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

            expect(result).toEqual({
                ...toSubscriptionResponseDto(createdAccount, 'newuser'),
                serviceName: 'jellyfin',
                serviceSlug: 'jellyfin',
            })
            expect(userAccountRepoMock.create).toHaveBeenCalledWith(
                expect.objectContaining({ userId, status: SubscriptionStatus.provisioning })
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

        it('should throw ForbiddenException when service access is denied by policy', async () => {
            userServiceMock.getUserById.mockResolvedValue(createUserFixture({ id: userId }))
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            accessServiceMock.assertCanSubscribe.mockRejectedValue(
                new ForbiddenException('You do not have access to this service')
            )

            await expect(service.subscribe(request, userId)).rejects.toThrow(ForbiddenException)
            expect(userAccountRepoMock.find).not.toHaveBeenCalled()
        })

        it('should throw ConflictException when user already has an active subscription', async () => {
            userServiceMock.getUserById.mockResolvedValue(createUserFixture({ id: userId }))
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            userAccountRepoMock.find.mockResolvedValue(
                createSubscriptionFixture({ userId, status: SubscriptionStatus.active })
            )

            await expect(service.subscribe(request, userId)).rejects.toThrow(ConflictException)
        })

        it('should throw ConflictException when user is disabled', async () => {
            userServiceMock.getUserById.mockResolvedValue(createUserFixture({ id: userId }))
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            userAccountRepoMock.find.mockResolvedValue(
                createSubscriptionFixture({ userId, status: SubscriptionStatus.disabled })
            )

            await expect(service.subscribe(request, userId)).rejects.toThrow(ConflictException)
            await expect(service.subscribe(request, userId)).rejects.toThrow('User is not allowed to subscribe')
        })

        it('should allow resubscribe when account is cancelled', async () => {
            const cancelledAccount = createSubscriptionFixture({ userId, status: SubscriptionStatus.cancelled })
            const activeAccount = createSubscriptionFixture({ userId, status: SubscriptionStatus.active })
            const client = createAccountIntegrationProviderMock()

            userServiceMock.getUserById.mockResolvedValue(createUserFixture({ id: userId, email: 'test@example.com' }))
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            clientRegistryMock.get.mockReturnValue(client)
            userAccountRepoMock.find.mockResolvedValue(cancelledAccount)
            externalAccountRepoMock.findBySubscriptionId.mockResolvedValue(
                createExternalUserAccountFixture({ externalAccountId: 'old-ext-id' })
            )
            client.getUser.mockResolvedValue({ ok: false, user: null })
            userAccountRepoMock.update.mockResolvedValue(activeAccount)
            client.createUser.mockResolvedValue({
                ok: true,
                user: { id: 'external-id-1', username: 'newuser', isActive: true, isAdmin: false },
            })

            const result = await service.subscribe(request, userId)

            expect(result).toEqual({
                ...toSubscriptionResponseDto(activeAccount, 'newuser'),
                serviceName: 'jellyfin',
                serviceSlug: 'jellyfin',
            })
            expect(userAccountRepoMock.update).toHaveBeenCalledWith(
                expect.objectContaining({ status: SubscriptionStatus.provisioning })
            )
        })

        it('should reactivate existing external account when resubscribing and account is disabled', async () => {
            const cancelledAccount = createSubscriptionFixture({
                userId,
                status: SubscriptionStatus.cancelled,
            })
            const reactivatedAccount = createSubscriptionFixture({ userId, status: SubscriptionStatus.active })
            const client = createAccountIntegrationProviderMock()

            userServiceMock.getUserById.mockResolvedValue(createUserFixture({ id: userId, email: 'test@example.com' }))
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            clientRegistryMock.get.mockReturnValue(client)
            userAccountRepoMock.find.mockResolvedValue(cancelledAccount)
            externalAccountRepoMock.findBySubscriptionId.mockResolvedValue(
                createExternalUserAccountFixture({ externalAccountId: 'old-ext-id' })
            )
            client.getUser.mockResolvedValue({
                ok: true,
                user: { id: 'old-ext-id', username: 'testuser', isActive: false, isAdmin: false },
            })
            client.enableUser.mockResolvedValue(true)
            userAccountRepoMock.update.mockResolvedValue(reactivatedAccount)

            const result = await service.subscribe(request, userId)

            expect(result).toEqual({
                ...toSubscriptionResponseDto(reactivatedAccount),
                serviceName: 'jellyfin',
                serviceSlug: 'jellyfin',
            })
            expect(client.enableUser).toHaveBeenCalledWith(
                expect.objectContaining({ userServiceAccountId: 'old-ext-id' })
            )
            expect(client.createUser).not.toHaveBeenCalled()
        })

        it('should reactivate existing external account when resubscribing and account is already active', async () => {
            const cancelledAccount = createSubscriptionFixture({
                userId,
                status: SubscriptionStatus.cancelled,
            })
            const reactivatedAccount = createSubscriptionFixture({ userId, status: SubscriptionStatus.active })
            const client = createAccountIntegrationProviderMock()

            userServiceMock.getUserById.mockResolvedValue(createUserFixture({ id: userId, email: 'test@example.com' }))
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            clientRegistryMock.get.mockReturnValue(client)
            userAccountRepoMock.find.mockResolvedValue(cancelledAccount)
            externalAccountRepoMock.findBySubscriptionId.mockResolvedValue(
                createExternalUserAccountFixture({ externalAccountId: 'old-ext-id' })
            )
            client.getUser.mockResolvedValue({
                ok: true,
                user: { id: 'old-ext-id', username: 'testuser', isActive: true, isAdmin: false },
            })
            client.enableUser.mockResolvedValue(true)
            userAccountRepoMock.update.mockResolvedValue(reactivatedAccount)

            const result = await service.subscribe(request, userId)

            expect(result).toEqual({
                ...toSubscriptionResponseDto(reactivatedAccount),
                serviceName: 'jellyfin',
                serviceSlug: 'jellyfin',
            })
            expect(client.enableUser).toHaveBeenCalledWith(
                expect.objectContaining({ userServiceAccountId: 'old-ext-id' })
            )
        })

        it('should create a new account when resubscribing and old external account is gone', async () => {
            const cancelledAccount = createSubscriptionFixture({
                userId,
                status: SubscriptionStatus.cancelled,
            })
            const activeAccount = createSubscriptionFixture({ userId, status: SubscriptionStatus.active })
            const client = createAccountIntegrationProviderMock()

            userServiceMock.getUserById.mockResolvedValue(createUserFixture({ id: userId, email: 'test@example.com' }))
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            clientRegistryMock.get.mockReturnValue(client)
            userAccountRepoMock.find.mockResolvedValue(cancelledAccount)
            externalAccountRepoMock.findBySubscriptionId.mockResolvedValue(
                createExternalUserAccountFixture({ externalAccountId: 'old-ext-id' })
            )
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

            expect(result).toEqual({
                ...toSubscriptionResponseDto(activeAccount, 'newuser'),
                serviceName: 'jellyfin',
                serviceSlug: 'jellyfin',
            })
            expect(client.createUser).toHaveBeenCalled()
        })

        it('should allow resubscribe when previous failure was during provisioning', async () => {
            const failedAccount = createSubscriptionFixture({
                userId,
                status: SubscriptionStatus.failed,
                failedOperation: FailedOperation.provisioning,
            })
            const activeAccount = createSubscriptionFixture({ userId, status: SubscriptionStatus.active })
            const client = createAccountIntegrationProviderMock()

            userServiceMock.getUserById.mockResolvedValue(createUserFixture({ id: userId, email: 'test@example.com' }))
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            clientRegistryMock.get.mockReturnValue(client)
            userAccountRepoMock.find.mockResolvedValue(failedAccount)
            client.getUser.mockResolvedValue({ ok: false, user: null })
            userAccountRepoMock.update.mockResolvedValue(activeAccount)
            client.createUser.mockResolvedValue({
                ok: true,
                user: { id: 'external-id-1', username: 'newuser', isActive: true, isAdmin: false },
            })

            const result = await service.subscribe(request, userId)

            expect(result).toEqual({
                ...toSubscriptionResponseDto(activeAccount, 'newuser'),
                serviceName: 'jellyfin',
                serviceSlug: 'jellyfin',
            })
        })

        it.each([FailedOperation.cancellation, FailedOperation.expiration, FailedOperation.sync])(
            'should throw ConflictException when previous failure was during %s',
            async (failedOperation) => {
                userServiceMock.getUserById.mockResolvedValue(createUserFixture({ id: userId }))
                serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
                userAccountRepoMock.find.mockResolvedValue(
                    createSubscriptionFixture({ userId, status: SubscriptionStatus.failed, failedOperation })
                )

                await expect(service.subscribe(request, userId)).rejects.toThrow(ConflictException)
            }
        )

        it('should throw ConflictException when external account already exists', async () => {
            const client = createAccountIntegrationProviderMock()
            userServiceMock.getUserById.mockResolvedValue(createUserFixture({ id: userId, email: 'test@example.com' }))
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            userAccountRepoMock.find.mockResolvedValue(null)
            clientRegistryMock.get.mockReturnValue(client)
            client.getUser.mockResolvedValue({
                ok: true,
                user: { id: 'ext-1', username: 'newuser', isActive: true, isAdmin: false },
            })

            await expect(service.subscribe(request, userId)).rejects.toThrow(ConflictException)
        })

        it('should mark subscription as failed when createUser returns invalid response', async () => {
            const client = createAccountIntegrationProviderMock()
            const provisioningAccount = createSubscriptionFixture({ userId, status: SubscriptionStatus.provisioning })

            userServiceMock.getUserById.mockResolvedValue(createUserFixture({ id: userId, email: 'test@example.com' }))
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            userAccountRepoMock.find.mockResolvedValue(null)
            clientRegistryMock.get.mockReturnValue(client)
            client.getUser.mockResolvedValue({ ok: false, user: null })
            userAccountRepoMock.create.mockResolvedValue(provisioningAccount)
            client.createUser.mockResolvedValue({ ok: false, user: null })

            await expect(service.subscribe(request, userId)).rejects.toThrow(InternalServerErrorException)
            expect(userAccountRepoMock.update).toHaveBeenCalledWith(
                expect.objectContaining({ status: SubscriptionStatus.failed })
            )
        })
    })

    // #endregion subscribe

    // #region delete

    describe('delete', () => {
        const subscriptionId = 'subscription-uuid-1'
        const currentUserId = 'user-uuid-1'

        function createActiveAccount(overrides: Parameters<typeof createSubscriptionFixture>[0] = {}) {
            return createSubscriptionFixture({
                id: subscriptionId,
                userId: currentUserId,
                status: SubscriptionStatus.active,
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
            const client = createAccountIntegrationProviderMock()

            userAccountRepoMock.findById.mockResolvedValue(activeAccount)
            userServiceMock.getUserById.mockResolvedValue(user)
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            clientRegistryMock.get.mockReturnValue(client)
            client.deleteUser.mockResolvedValue(true)
            userAccountRepoMock.update.mockResolvedValue({ ...activeAccount, status: SubscriptionStatus.cancelled })

            const result = await service.delete(subscriptionId, currentUserId, true)

            expect(result).toBe(true)
            expect(client.deleteUser).toHaveBeenCalled()
            expect(userAccountRepoMock.update).toHaveBeenCalledWith(
                expect.objectContaining({ status: SubscriptionStatus.cancelling })
            )
        })

        it('should mark as failed when immediate delete fails externally', async () => {
            const user = createUserFixture({ id: currentUserId })
            const activeAccount = createActiveAccount()
            const client = createAccountIntegrationProviderMock()

            userAccountRepoMock.findById.mockResolvedValue(activeAccount)
            userServiceMock.getUserById.mockResolvedValue(user)
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            clientRegistryMock.get.mockReturnValue(client)
            client.deleteUser.mockResolvedValue(false)
            userAccountRepoMock.update.mockResolvedValue(activeAccount)

            const result = await service.delete(subscriptionId, currentUserId, true)

            expect(result).toBe(false)
            expect(userAccountRepoMock.update).toHaveBeenCalledWith(
                expect.objectContaining({ status: SubscriptionStatus.failed })
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
            const activeAccount = createSubscriptionFixture({
                id: subscriptionId,
                userId,
                serviceId,
                status: SubscriptionStatus.active,
                expiresAt: new Date(Date.now() + 86400000),
            })
            const client = createAccountIntegrationProviderMock()

            userAccountRepoMock.findById.mockResolvedValue(activeAccount)
            userServiceMock.getUserById.mockResolvedValue(targetUser)
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            userAccountRepoMock.find.mockResolvedValue(activeAccount)
            clientRegistryMock.get.mockReturnValue(client)
            client.disableUser.mockResolvedValue(true)
            userAccountRepoMock.update.mockResolvedValue({ ...activeAccount, status: SubscriptionStatus.disabled })

            const result = await service.update(subscriptionId, { enabled: false })

            expect(client.disableUser).toHaveBeenCalled()
            expect(userAccountRepoMock.update).toHaveBeenCalledWith(
                expect.objectContaining({ status: SubscriptionStatus.disabled })
            )
            expect(result).toBeDefined()
        })

        it('should throw NotFoundException when subscription does not exist', async () => {
            userAccountRepoMock.findById.mockResolvedValue(null)

            await expect(service.update(subscriptionId, { enabled: false })).rejects.toThrow(NotFoundException)
        })

        it('should throw ConflictException when account is not active', async () => {
            const targetUser = createUserFixture({ id: userId })
            const disabledAccount = createSubscriptionFixture({
                id: subscriptionId,
                userId,
                serviceId,
                status: SubscriptionStatus.disabled,
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
            const disabledAccount = createSubscriptionFixture({
                id: subscriptionId,
                userId,
                serviceId,
                status: SubscriptionStatus.disabled,
                expiresAt: new Date(Date.now() + 86400000),
            })
            const client = createAccountIntegrationProviderMock()

            userAccountRepoMock.findById.mockResolvedValue(disabledAccount)
            userServiceMock.getUserById.mockResolvedValue(targetUser)
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            userAccountRepoMock.find.mockResolvedValue(disabledAccount)
            clientRegistryMock.get.mockReturnValue(client)
            client.getUser.mockResolvedValue({
                ok: true,
                user: { id: 'ext-1', username: 'testuser', isActive: false, isAdmin: false },
            })
            client.enableUser.mockResolvedValue(true)
            userAccountRepoMock.update.mockResolvedValue({ ...disabledAccount, status: SubscriptionStatus.active })

            const result = await service.update(subscriptionId, { enabled: true })

            expect(client.enableUser).toHaveBeenCalled()
            expect(result).toBeDefined()
        })

        it('should throw ConflictException when account is not disabled', async () => {
            const targetUser = createUserFixture({ id: userId })
            const activeAccount = createSubscriptionFixture({
                id: subscriptionId,
                userId,
                serviceId,
                status: SubscriptionStatus.active,
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
            const disabledAccount = createSubscriptionFixture({
                id: subscriptionId,
                userId,
                serviceId,
                status: SubscriptionStatus.disabled,
                expiresAt: new Date(Date.now() + 86400000),
            })
            const client = createAccountIntegrationProviderMock()

            userAccountRepoMock.findById.mockResolvedValue(disabledAccount)
            userServiceMock.getUserById.mockResolvedValue(targetUser)
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            userAccountRepoMock.find.mockResolvedValue(disabledAccount)
            clientRegistryMock.get.mockReturnValue(client)
            client.getUser.mockResolvedValue({
                ok: true,
                user: { id: 'ext-1', username: 'testuser', isActive: false, isAdmin: false },
            })
            client.enableUser.mockResolvedValue(false)
            userAccountRepoMock.update.mockResolvedValue(disabledAccount)

            await expect(service.update(subscriptionId, { enabled: true })).rejects.toThrow(
                ServiceUnavailableException
            )
        })

        it('should delete stale local record and return when enabling but external account no longer exists', async () => {
            const targetUser = createUserFixture({ id: userId })
            const disabledAccount = createSubscriptionFixture({
                id: subscriptionId,
                userId,
                serviceId,
                status: SubscriptionStatus.disabled,
                expiresAt: new Date(Date.now() + 86400000),
            })
            const client = createAccountIntegrationProviderMock()

            userAccountRepoMock.findById.mockResolvedValue(disabledAccount)
            userServiceMock.getUserById.mockResolvedValue(targetUser)
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            userAccountRepoMock.find.mockResolvedValue(disabledAccount)
            clientRegistryMock.get.mockReturnValue(client)
            client.getUser.mockResolvedValue({ ok: false, user: null })

            await service.update(subscriptionId, { enabled: true })

            expect(client.enableUser).not.toHaveBeenCalled()
            expect(userAccountRepoMock.delete).toHaveBeenCalledWith(userId, serviceId)
        })
    })

    // #endregion update — enabled

    // #region retryFailedOperation

    describe('admin listing detail hydration', () => {
        const userId = 'user-uuid-1'

        it('listAll includes the owning user\'s username/email and the service name', async () => {
            const account = createSubscriptionFixture({ userId, serviceId: 1 })
            const user = createUserFixture({ id: userId, username: 'alice', email: 'alice@example.com' })
            const serviceModel = createServiceFixture({ id: 1, name: 'Jellyfin' })

            userAccountRepoMock.findMany.mockResolvedValue([account])
            userServiceMock.getUserById.mockResolvedValue(user)
            serviceRepoMock.findById.mockResolvedValue(serviceModel)

            const result = await service.listAll()

            expect(result[0]).toMatchObject({
                userUsername: 'alice',
                userEmail: 'alice@example.com',
                serviceName: 'Jellyfin',
            })
        })

        it('listByUser resolves details for each returned account', async () => {
            const account = createSubscriptionFixture({ userId, serviceId: 2 })
            const user = createUserFixture({ id: userId, username: 'bob', email: 'bob@example.com' })
            const serviceModel = createServiceFixture({ id: 2, name: 'Plex' })

            userAccountRepoMock.findMany.mockResolvedValue([account])
            userServiceMock.getUserById.mockResolvedValue(user)
            serviceRepoMock.findById.mockResolvedValue(serviceModel)

            const result = await service.listByUser(userId)

            expect(userAccountRepoMock.findMany).toHaveBeenCalledWith({ userId }, undefined, undefined)
            expect(result[0]).toMatchObject({ userUsername: 'bob', serviceName: 'Plex' })
        })

        it('getById includes the resolved details', async () => {
            const account = createSubscriptionFixture({ id: 'sub-1', userId, serviceId: 3 })
            const user = createUserFixture({ id: userId, username: 'carol', email: 'carol@example.com' })
            const serviceModel = createServiceFixture({ id: 3, name: 'Audiobookshelf' })

            userAccountRepoMock.findById.mockResolvedValue(account)
            userServiceMock.getUserById.mockResolvedValue(user)
            serviceRepoMock.findById.mockResolvedValue(serviceModel)

            const result = await service.getById('sub-1')

            expect(result).toMatchObject({ userUsername: 'carol', serviceName: 'Audiobookshelf' })
        })

        it('only fetches each unique user/service once for multiple accounts', async () => {
            const accountA = createSubscriptionFixture({ id: 'sub-a', userId, serviceId: 1 })
            const accountB = createSubscriptionFixture({ id: 'sub-b', userId, serviceId: 1 })
            const user = createUserFixture({ id: userId, username: 'dave' })
            const serviceModel = createServiceFixture({ id: 1, name: 'Jellyfin' })

            userAccountRepoMock.findMany.mockResolvedValue([accountA, accountB])
            userServiceMock.getUserById.mockResolvedValue(user)
            serviceRepoMock.findById.mockResolvedValue(serviceModel)

            await service.listAll()

            expect(userServiceMock.getUserById).toHaveBeenCalledTimes(1)
            expect(serviceRepoMock.findById).toHaveBeenCalledTimes(1)
        })

        it('leaves details undefined when the user or service can no longer be found', async () => {
            const account = createSubscriptionFixture({ userId, serviceId: 1 })

            userAccountRepoMock.findMany.mockResolvedValue([account])
            userServiceMock.getUserById.mockResolvedValue(null)
            serviceRepoMock.findById.mockResolvedValue(null)

            const result = await service.listAll()

            expect(result[0]!.userUsername).toBeUndefined()
            expect(result[0]!.serviceName).toBeUndefined()
        })
    })

    // #endregion listAll / listByUser / getById — detail hydration

    // #region activateFromPolicy

    describe('activateFromPolicy', () => {
        const userId = 'user-uuid-1'

        beforeEach(() => {
            userAccountRepoMock.find.mockReset()
            userAccountRepoMock.create.mockReset()
            userAccountRepoMock.update.mockReset()
            eventsMock.emit.mockClear()
        })

        describe('when the service is REFERENCED', () => {
            const referenced = createReferencedServiceFixture()
            const source = createSubscriptionFixture({
                id: 'source-sub',
                userId,
                serviceId: 1,
                status: SubscriptionStatus.active,
                autoRenew: true,
                expiresAt: new Date('2030-01-01'),
            })

            it('creates a subscription mirroring the account source when none exists', async () => {
                userAccountRepoMock.find.mockResolvedValueOnce(source).mockResolvedValueOnce(null)

                await service.activateFromPolicy(userId, referenced)

                expect(userAccountRepoMock.create).toHaveBeenCalledWith(
                    expect.objectContaining({
                        userId,
                        serviceId: 2,
                        status: SubscriptionStatus.active,
                        autoRenew: true,
                        expiresAt: source.expiresAt,
                        derivedFromSubscriptionId: 'source-sub',
                    })
                )
                expect(eventsMock.emit).toHaveBeenCalledWith('subscription.changed', { userId })
            })

            it('updates an existing subscription to mirror the account source', async () => {
                userAccountRepoMock.find
                    .mockResolvedValueOnce(source)
                    .mockResolvedValueOnce(
                        createSubscriptionFixture({ id: 'derived-sub', userId, serviceId: 2 })
                    )

                await service.activateFromPolicy(userId, referenced)

                expect(userAccountRepoMock.update).toHaveBeenCalledWith(
                    expect.objectContaining({
                        userId,
                        serviceId: 2,
                        status: SubscriptionStatus.active,
                        autoRenew: true,
                        expiresAt: source.expiresAt,
                        derivedFromSubscriptionId: 'source-sub',
                    })
                )
            })

            it('does nothing when the account source subscription does not exist', async () => {
                userAccountRepoMock.find.mockResolvedValue(null)

                await service.activateFromPolicy(userId, referenced)

                expect(userAccountRepoMock.create).not.toHaveBeenCalled()
                expect(userAccountRepoMock.update).not.toHaveBeenCalled()
                expect(eventsMock.emit).not.toHaveBeenCalled()
            })

            it('does nothing when the account source subscription is not active', async () => {
                const inactiveSource = {
                    ...source,
                    status: SubscriptionStatus.cancelled,
                    cancelledAt: new Date(),
                }
                userAccountRepoMock.find.mockResolvedValueOnce(inactiveSource)

                await service.activateFromPolicy(userId, referenced)

                expect(userAccountRepoMock.create).not.toHaveBeenCalled()
                expect(userAccountRepoMock.update).not.toHaveBeenCalled()
                expect(eventsMock.emit).not.toHaveBeenCalled()
            })

            it('does nothing when the account source subscription is expired', async () => {
                const expiredSource = {
                    ...source,
                    status: SubscriptionStatus.expired,
                    expiresAt: new Date(Date.now() - 1000),
                }
                userAccountRepoMock.find.mockResolvedValueOnce(expiredSource)

                await service.activateFromPolicy(userId, referenced)

                expect(userAccountRepoMock.create).not.toHaveBeenCalled()
                expect(userAccountRepoMock.update).not.toHaveBeenCalled()
                expect(eventsMock.emit).not.toHaveBeenCalled()
            })
        })

        describe('when the service is NONE', () => {
            const noneService = createNoAccountServiceFixture()

            it('is a no-op even when a cancelled subscription exists', async () => {
                userAccountRepoMock.find.mockResolvedValue(
                    createSubscriptionFixture({
                        id: 'none-sub',
                        userId,
                        serviceId: 3,
                        status: SubscriptionStatus.cancelled,
                        autoRenew: false,
                    })
                )

                await service.activateFromPolicy(userId, noneService)

                expect(userAccountRepoMock.create).not.toHaveBeenCalled()
                expect(userAccountRepoMock.update).not.toHaveBeenCalled()
                expect(eventsMock.emit).not.toHaveBeenCalled()
            })

            it('does nothing when no subscription exists', async () => {
                userAccountRepoMock.find.mockResolvedValue(null)

                await service.activateFromPolicy(userId, noneService)

                expect(userAccountRepoMock.create).not.toHaveBeenCalled()
                expect(userAccountRepoMock.update).not.toHaveBeenCalled()
                expect(eventsMock.emit).not.toHaveBeenCalled()
            })
        })

        describe('when the service is MANAGED', () => {
            it('is a no-op', async () => {
                userAccountRepoMock.find.mockResolvedValue(
                    createSubscriptionFixture({
                        id: 'managed-sub',
                        userId,
                        serviceId: 1,
                        status: SubscriptionStatus.cancelled,
                    })
                )

                await service.activateFromPolicy(userId, createServiceFixture())

                expect(userAccountRepoMock.update).not.toHaveBeenCalled()
                expect(userAccountRepoMock.create).not.toHaveBeenCalled()
                expect(eventsMock.emit).not.toHaveBeenCalled()
            })
        })
    })

    // #endregion activateFromPolicy
})
