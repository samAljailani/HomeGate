import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, ConflictException } from '@nestjs/common'
import { SubscriptionService } from '@/api/services/subscriptions.service'
import { SubscriptionLifecycleService } from '@/api/services/subscriptionLifecycle.service'
import { UserService } from '@/api/services/user.service'
import { IServiceRepository, ISubscriptionRepository, IExternalUserAccountRepository, IUserServicePolicyRepository } from '@/data/repositories'
import { AccountIntegrationRegistry } from '@/core/integrations/accountIntegrationRegistry'
import { SubscriptionCascadeService } from '@/core/subscriptions/subscriptionCascade.service'
import { subscriptionProvisioners } from '@/core/subscriptions/provisioners'
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
import { createUserServicePolicyRepositoryMock } from '../../mocks/userServicePolicy.repository.mock'
import { createUserFixture } from '../../fixtures/user.stub'
import { createSubscriptionFixture, createExternalUserAccountFixture } from '../../fixtures/subscription.stub'
import { createServiceFixture } from '../../fixtures/service.stub'

describe('SubscriptionLifecycleService', () => {
    let lifecycle: SubscriptionLifecycleService
    let userServiceMock: ReturnType<typeof createUserServiceMock>
    let subscriptionRepoMock: ReturnType<typeof createSubscriptionRepositoryMock>
    let externalAccountRepoMock: ReturnType<typeof createExternalUserAccountRepositoryMock>
    let serviceRepoMock: ReturnType<typeof createServiceRepositoryMock>
    let clientRegistryMock: ReturnType<typeof createAccountIntegrationRegistryMock>
    let loggerMock: ReturnType<typeof createLoggerMock>
    let policyRepoMock: ReturnType<typeof createUserServicePolicyRepositoryMock>

    beforeEach(async () => {
        userServiceMock = createUserServiceMock()
        subscriptionRepoMock = createSubscriptionRepositoryMock()
        externalAccountRepoMock = createExternalUserAccountRepositoryMock()
        serviceRepoMock = createServiceRepositoryMock()
        clientRegistryMock = createAccountIntegrationRegistryMock()
        loggerMock = createLoggerMock()
        policyRepoMock = createUserServicePolicyRepositoryMock()

        // Real provisioners and cascade so integration behaviour is exercised, not stubbed away.
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SubscriptionLifecycleService,
                SubscriptionService,
                SubscriptionCascadeService,
                ...subscriptionProvisioners,
                { provide: UserService, useValue: userServiceMock },
                { provide: ISubscriptionRepository, useValue: subscriptionRepoMock },
                { provide: IExternalUserAccountRepository, useValue: externalAccountRepoMock },
                { provide: IServiceRepository, useValue: serviceRepoMock },
                { provide: IUserServicePolicyRepository, useValue: policyRepoMock },
                { provide: AccountIntegrationRegistry, useValue: clientRegistryMock },
                { provide: ServiceAccessService, useValue: { assertCanSubscribe: jest.fn(), resolveAccess: jest.fn() } },
                { provide: EventEmitter2, useValue: { emit: jest.fn() } },
                { provide: LoggingProvider, useValue: loggerMock },
            ],
        }).compile()

        lifecycle = module.get(SubscriptionLifecycleService)

        serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
        externalAccountRepoMock.findBySubscriptionId.mockResolvedValue([createExternalUserAccountFixture()])
        externalAccountRepoMock.findMany.mockResolvedValue([
            createExternalUserAccountFixture({ externalAccountId: 'ext-1' }),
        ])
    })

    describe('retryFailedOperation', () => {
        const currentUserId = 'admin-uuid-1'
        const request = {
            userId: 'user-uuid-1',
            serviceId: 1,
        }

        it('should throw BadRequestException when not admin', async () => {
            userServiceMock.getUserById.mockResolvedValue(createUserFixture({ id: currentUserId, isAdmin: false }))

            await expect(lifecycle.retryFailedOperation(request.userId, request.serviceId, currentUserId)).rejects.toThrow(BadRequestException)
        })

        it('should throw ConflictException when account is not in failed state', async () => {
            userServiceMock.getUserById.mockResolvedValue(createUserFixture({ id: currentUserId, isAdmin: true }))
            subscriptionRepoMock.find.mockResolvedValue(
                createSubscriptionFixture({ userId: request.userId, status: SubscriptionStatus.active })
            )

            await expect(lifecycle.retryFailedOperation(request.userId, request.serviceId, currentUserId)).rejects.toThrow(ConflictException)
        })

        it('should throw BadRequestException when failedOperation is provisioning', async () => {
            userServiceMock.getUserById.mockResolvedValue(createUserFixture({ id: currentUserId, isAdmin: true }))
            subscriptionRepoMock.find.mockResolvedValue(
                createSubscriptionFixture({
                    userId: request.userId,
                    status: SubscriptionStatus.failed,
                    failedOperation: FailedOperation.provisioning,
                })
            )

            await expect(lifecycle.retryFailedOperation(request.userId, request.serviceId, currentUserId)).rejects.toThrow(BadRequestException)
        })

        it('should mark as cancelled when cancellation failed but external account is already gone', async () => {
            const failedAccount = createSubscriptionFixture({
                userId: request.userId,
                status: SubscriptionStatus.failed,
                failedOperation: FailedOperation.cancellation,
            })
            const client = createAccountIntegrationProviderMock()

            userServiceMock.getUserById
                .mockResolvedValueOnce(createUserFixture({ id: currentUserId, isAdmin: true }))
                .mockResolvedValueOnce(createUserFixture({ id: request.userId }))
            subscriptionRepoMock.find.mockResolvedValue(failedAccount)
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            clientRegistryMock.get.mockReturnValue(client)
            client.getUser.mockResolvedValue({ ok: false, user: null })
            subscriptionRepoMock.update.mockResolvedValue({ ...failedAccount, status: SubscriptionStatus.cancelled })

            const result = await lifecycle.retryFailedOperation(request.userId, request.serviceId, currentUserId)

            expect(result).toBe(true)
            expect(client.deleteUser).not.toHaveBeenCalled()
            expect(subscriptionRepoMock.update).toHaveBeenCalledWith(
                expect.objectContaining({ status: SubscriptionStatus.cancelled, failedOperation: null })
            )
        })

        it('should retry deleteUser and mark as cancelled when cancellation failed and external account still exists', async () => {
            const failedAccount = createSubscriptionFixture({
                userId: request.userId,
                status: SubscriptionStatus.failed,
                failedOperation: FailedOperation.cancellation,
            })
            const client = createAccountIntegrationProviderMock()

            userServiceMock.getUserById
                .mockResolvedValueOnce(createUserFixture({ id: currentUserId, isAdmin: true }))
                .mockResolvedValueOnce(createUserFixture({ id: request.userId }))
            subscriptionRepoMock.find.mockResolvedValue(failedAccount)
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            clientRegistryMock.get.mockReturnValue(client)
            client.getUser.mockResolvedValue({
                ok: true,
                user: { id: 'ext-1', username: 'testuser', isActive: true, isAdmin: false },
            })
            client.deleteUser.mockResolvedValue(true)
            subscriptionRepoMock.update.mockResolvedValue({ ...failedAccount, status: SubscriptionStatus.cancelled })

            const result = await lifecycle.retryFailedOperation(request.userId, request.serviceId, currentUserId)

            expect(result).toBe(true)
            expect(client.deleteUser).toHaveBeenCalled()
            expect(subscriptionRepoMock.update).toHaveBeenCalledWith(
                expect.objectContaining({ status: SubscriptionStatus.cancelled, failedOperation: null })
            )
        })

        it('should mark as expired when expiration failed but external account is already disabled', async () => {
            const failedAccount = createSubscriptionFixture({
                userId: request.userId,
                status: SubscriptionStatus.failed,
                failedOperation: FailedOperation.expiration,
            })
            const client = createAccountIntegrationProviderMock()

            userServiceMock.getUserById
                .mockResolvedValueOnce(createUserFixture({ id: currentUserId, isAdmin: true }))
                .mockResolvedValueOnce(createUserFixture({ id: request.userId }))
            subscriptionRepoMock.find.mockResolvedValue(failedAccount)
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            clientRegistryMock.get.mockReturnValue(client)
            client.getUser.mockResolvedValue({
                ok: true,
                user: { id: 'ext-1', username: 'testuser', isActive: false, isAdmin: false },
            })
            subscriptionRepoMock.update.mockResolvedValue({ ...failedAccount, status: SubscriptionStatus.expired })

            const result = await lifecycle.retryFailedOperation(request.userId, request.serviceId, currentUserId)

            expect(result).toBe(true)
            expect(client.disableUser).not.toHaveBeenCalled()
            expect(subscriptionRepoMock.update).toHaveBeenCalledWith(
                expect.objectContaining({ status: SubscriptionStatus.expired, failedOperation: null })
            )
        })

        it('should retry disableUser and mark as expired when expiration failed and external account is still active', async () => {
            const failedAccount = createSubscriptionFixture({
                userId: request.userId,
                status: SubscriptionStatus.failed,
                failedOperation: FailedOperation.expiration,
            })
            const client = createAccountIntegrationProviderMock()

            userServiceMock.getUserById
                .mockResolvedValueOnce(createUserFixture({ id: currentUserId, isAdmin: true }))
                .mockResolvedValueOnce(createUserFixture({ id: request.userId }))
            subscriptionRepoMock.find.mockResolvedValue(failedAccount)
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            clientRegistryMock.get.mockReturnValue(client)
            client.getUser.mockResolvedValue({
                ok: true,
                user: { id: 'ext-1', username: 'testuser', isActive: true, isAdmin: false },
            })
            client.disableUser.mockResolvedValue(true)
            subscriptionRepoMock.update.mockResolvedValue({ ...failedAccount, status: SubscriptionStatus.expired })

            const result = await lifecycle.retryFailedOperation(request.userId, request.serviceId, currentUserId)

            expect(result).toBe(true)
            expect(client.disableUser).toHaveBeenCalled()
            expect(subscriptionRepoMock.update).toHaveBeenCalledWith(
                expect.objectContaining({ status: SubscriptionStatus.expired, failedOperation: null })
            )
        })

        it('should mark as cancelled when sync failed and external account is confirmed gone', async () => {
            const failedAccount = createSubscriptionFixture({
                userId: request.userId,
                status: SubscriptionStatus.failed,
                failedOperation: FailedOperation.sync,
            })
            const client = createAccountIntegrationProviderMock()

            userServiceMock.getUserById
                .mockResolvedValueOnce(createUserFixture({ id: currentUserId, isAdmin: true }))
                .mockResolvedValueOnce(createUserFixture({ id: request.userId }))
            subscriptionRepoMock.find.mockResolvedValue(failedAccount)
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            clientRegistryMock.get.mockReturnValue(client)
            client.getUser.mockResolvedValue({ ok: false, user: null })
            subscriptionRepoMock.update.mockResolvedValue({ ...failedAccount, status: SubscriptionStatus.cancelled })

            const result = await lifecycle.retryFailedOperation(request.userId, request.serviceId, currentUserId)

            expect(result).toBe(true)
            expect(subscriptionRepoMock.update).toHaveBeenCalledWith(
                expect.objectContaining({ status: SubscriptionStatus.cancelled, failedOperation: null })
            )
        })

        it('should restore to active when sync failed but external account is found', async () => {
            const failedAccount = createSubscriptionFixture({
                userId: request.userId,
                status: SubscriptionStatus.failed,
                failedOperation: FailedOperation.sync,
            })
            const client = createAccountIntegrationProviderMock()

            userServiceMock.getUserById
                .mockResolvedValueOnce(createUserFixture({ id: currentUserId, isAdmin: true }))
                .mockResolvedValueOnce(createUserFixture({ id: request.userId }))
            subscriptionRepoMock.find.mockResolvedValue(failedAccount)
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            clientRegistryMock.get.mockReturnValue(client)
            client.getUser.mockResolvedValue({
                ok: true,
                user: { id: 'ext-1', username: 'testuser', isActive: true, isAdmin: false },
            })
            subscriptionRepoMock.update.mockResolvedValue({ ...failedAccount, status: SubscriptionStatus.active })

            const result = await lifecycle.retryFailedOperation(request.userId, request.serviceId, currentUserId)

            expect(result).toBe(true)
            expect(subscriptionRepoMock.update).toHaveBeenCalledWith(
                expect.objectContaining({ status: SubscriptionStatus.active, failedOperation: null })
            )
        })
    })

    // #endregion retryFailedOperation

    // #region processSubscriptions

    describe('processSubscriptions', () => {
        it('should auto-renew expired subscriptions with autoRenew enabled', async () => {
            const expired = createSubscriptionFixture({
                status: SubscriptionStatus.active,
                autoRenew: true,
                expiresAt: new Date(Date.now() - 86400000),
            })

            subscriptionRepoMock.findMany.mockResolvedValue([expired])

            await lifecycle.processSubscriptions()

            expect(subscriptionRepoMock.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: expired.userId,
                    serviceId: expired.serviceId,
                    expiresAt: expect.any(Date),
                })
            )
        })

        it('should expire subscriptions past expiresAt without autoRenew', async () => {
            const expired = createSubscriptionFixture({
                status: SubscriptionStatus.active,
                autoRenew: false,
                expiresAt: new Date(Date.now() - 86400000),
            })
            const client = createAccountIntegrationProviderMock()

            subscriptionRepoMock.findMany.mockResolvedValue([expired])
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            clientRegistryMock.get.mockReturnValue(client)
            userServiceMock.getUserById.mockResolvedValue(createUserFixture({ id: expired.userId }))
            client.disableUser.mockResolvedValue(true)
            subscriptionRepoMock.update.mockResolvedValue(expired)

            await lifecycle.processSubscriptions()

            expect(subscriptionRepoMock.update).toHaveBeenCalledWith(
                expect.objectContaining({ status: SubscriptionStatus.expired })
            )
        })

        it('should disable subscriptions with no expiration date', async () => {
            const noExpiry = createSubscriptionFixture({
                status: SubscriptionStatus.active,
                expiresAt: null,
            })
            const client = createAccountIntegrationProviderMock()

            subscriptionRepoMock.findMany.mockResolvedValue([noExpiry])
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            clientRegistryMock.get.mockReturnValue(client)
            userServiceMock.getUserById.mockResolvedValue(createUserFixture({ id: noExpiry.userId }))
            client.disableUser.mockResolvedValue(true)
            subscriptionRepoMock.update.mockResolvedValue(noExpiry)

            await lifecycle.processSubscriptions()

            expect(subscriptionRepoMock.update).toHaveBeenCalledWith(
                expect.objectContaining({ status: SubscriptionStatus.disabled })
            )
            expect(loggerMock.warn).toHaveBeenCalled()
        })

        it('should skip subscriptions that are still active', async () => {
            const stillActive = createSubscriptionFixture({
                status: SubscriptionStatus.active,
                expiresAt: new Date(Date.now() + 86400000),
            })

            subscriptionRepoMock.findMany.mockResolvedValue([stillActive])

            await lifecycle.processSubscriptions()

            expect(subscriptionRepoMock.update).not.toHaveBeenCalled()
        })

        it('should mark as failed when disableUser throws', async () => {
            const expired = createSubscriptionFixture({
                status: SubscriptionStatus.active,
                autoRenew: false,
                expiresAt: new Date(Date.now() - 86400000),
            })
            const client = createAccountIntegrationProviderMock()

            subscriptionRepoMock.findMany.mockResolvedValue([expired])
            serviceRepoMock.findById.mockResolvedValue(createServiceFixture())
            clientRegistryMock.get.mockReturnValue(client)
            userServiceMock.getUserById.mockResolvedValue(createUserFixture({ id: expired.userId }))
            client.getUser.mockResolvedValue({
                ok: true,
                user: { id: 'ext-1', username: 'testuser', isActive: true, isAdmin: false },
            })
            client.disableUser.mockResolvedValue(false)
            subscriptionRepoMock.update.mockResolvedValue(expired)

            await lifecycle.processSubscriptions()

            expect(subscriptionRepoMock.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: SubscriptionStatus.failed,
                    lastError: expect.any(String),
                })
            )
        })
    })

    // #endregion processSubscriptions

    // #region syncClientAccounts

    describe('syncClientAccounts', () => {
        it('should delete orphaned external accounts with no local record', async () => {
            const client = createAccountIntegrationProviderMock()
            const svc = createServiceFixture()

            clientRegistryMock.get.mockReturnValue(client)
            serviceRepoMock.findMany.mockResolvedValue([svc])
            subscriptionRepoMock.findMany.mockResolvedValue([createSubscriptionFixture()])
            client.getAllUsers.mockResolvedValue([
                { id: 'ext-1', username: 'testuser', isActive: true, isAdmin: false },
                { id: 'orphan-1', username: 'orphan', isActive: true, isAdmin: false },
            ])

            await lifecycle.syncIntegrationAccounts()

            expect(client.deleteUser).toHaveBeenCalledWith(
                expect.objectContaining({ userServiceAccountId: 'orphan-1' })
            )
            expect(loggerMock.warn).toHaveBeenCalled()
        })

        it('refuses to reconcile when the service has accounts but HomeGate has no local records', async () => {
            const client = createAccountIntegrationProviderMock()

            clientRegistryMock.get.mockReturnValue(client)
            serviceRepoMock.findMany.mockResolvedValue([createServiceFixture()])
            subscriptionRepoMock.findMany.mockResolvedValue([])
            externalAccountRepoMock.findMany.mockResolvedValue([])
            client.getAllUsers.mockResolvedValue([
                { id: 'orphan-1', username: 'orphan', isActive: true, isAdmin: false },
            ])

            await lifecycle.syncIntegrationAccounts()

            expect(client.deleteUser).not.toHaveBeenCalled()
            expect(loggerMock.error).toHaveBeenCalled()
        })

        it('should skip deleting orphaned admin accounts', async () => {
            const client = createAccountIntegrationProviderMock()
            const svc = createServiceFixture()

            clientRegistryMock.get.mockReturnValue(client)
            serviceRepoMock.findMany.mockResolvedValue([svc])
            subscriptionRepoMock.findMany.mockResolvedValue([createSubscriptionFixture()])
            client.getAllUsers.mockResolvedValue([
                { id: 'ext-1', username: 'testuser', isActive: true, isAdmin: false },
                { id: 'admin-1', username: 'admin', isActive: true, isAdmin: true },
            ])

            await lifecycle.syncIntegrationAccounts()

            expect(client.deleteUser).not.toHaveBeenCalled()
        })

        it('should disable external account when local record is not active', async () => {
            const client = createAccountIntegrationProviderMock()
            const svc = createServiceFixture()
            const cancelledAccount = createSubscriptionFixture({
                status: SubscriptionStatus.cancelled,
            })

            clientRegistryMock.get.mockReturnValue(client)
            serviceRepoMock.findMany.mockResolvedValue([svc])
            subscriptionRepoMock.findMany.mockResolvedValue([cancelledAccount])
            client.getAllUsers.mockResolvedValue([
                { id: 'ext-1', username: 'testuser', isActive: true, isAdmin: false },
            ])

            await lifecycle.syncIntegrationAccounts()

            expect(client.disableUser).toHaveBeenCalledWith(expect.objectContaining({ userServiceAccountId: 'ext-1' }))
        })

        it('should enable external account when local is active but external is disabled', async () => {
            const client = createAccountIntegrationProviderMock()
            const svc = createServiceFixture()
            const activeAccount = createSubscriptionFixture({
                status: SubscriptionStatus.active,
            })

            clientRegistryMock.get.mockReturnValue(client)
            serviceRepoMock.findMany.mockResolvedValue([svc])
            subscriptionRepoMock.findMany.mockResolvedValue([activeAccount])
            client.getAllUsers.mockResolvedValue([
                { id: 'ext-1', username: 'testuser', isActive: false, isAdmin: false },
            ])

            await lifecycle.syncIntegrationAccounts()

            expect(client.enableUser).toHaveBeenCalledWith(expect.objectContaining({ userServiceAccountId: 'ext-1' }))
        })

        it('should mark local record as failed when active but external account is missing', async () => {
            const client = createAccountIntegrationProviderMock()
            const svc = createServiceFixture()
            const activeAccount = createSubscriptionFixture({
                status: SubscriptionStatus.active,
            })

            clientRegistryMock.get.mockReturnValue(client)
            serviceRepoMock.findMany.mockResolvedValue([svc])
            subscriptionRepoMock.findMany.mockResolvedValue([activeAccount])
            client.getAllUsers.mockResolvedValue([])
            subscriptionRepoMock.update.mockResolvedValue(activeAccount)

            await lifecycle.syncIntegrationAccounts()

            expect(subscriptionRepoMock.update).toHaveBeenCalledWith(
                expect.objectContaining({ status: SubscriptionStatus.failed })
            )
        })

        it('should skip clients when getAllUsers returns null', async () => {
            const client = createAccountIntegrationProviderMock()

            clientRegistryMock.get.mockReturnValue(client)
            serviceRepoMock.findMany.mockResolvedValue([createServiceFixture()])
            subscriptionRepoMock.findMany.mockResolvedValue([])
            client.getAllUsers.mockResolvedValue(null)

            await lifecycle.syncIntegrationAccounts()

            expect(client.disableUser).not.toHaveBeenCalled()
            expect(client.enableUser).not.toHaveBeenCalled()
            expect(loggerMock.warn).toHaveBeenCalled()
        })

        it('should not take action when external and local states match', async () => {
            const client = createAccountIntegrationProviderMock()
            const svc = createServiceFixture()
            const activeAccount = createSubscriptionFixture({
                status: SubscriptionStatus.active,
            })

            clientRegistryMock.get.mockReturnValue(client)
            serviceRepoMock.findMany.mockResolvedValue([svc])
            subscriptionRepoMock.findMany.mockResolvedValue([activeAccount])
            client.getAllUsers.mockResolvedValue([
                { id: 'ext-1', username: 'testuser', isActive: true, isAdmin: false },
            ])

            await lifecycle.syncIntegrationAccounts()

            expect(client.disableUser).not.toHaveBeenCalled()
            expect(client.enableUser).not.toHaveBeenCalled()
            expect(subscriptionRepoMock.update).not.toHaveBeenCalled()
        })
    })

    // #endregion syncClientAccounts

    // #region cleanupStaleLocalAccounts

    describe('cleanupStaleLocalAccounts', () => {
        it('should delete stale local records for non-active accounts whose external account no longer exists', async () => {
            const client = createAccountIntegrationProviderMock()
            const svc = createServiceFixture()
            const expiredAccount = createSubscriptionFixture({
                status: SubscriptionStatus.expired,
            })

            clientRegistryMock.get.mockReturnValue(client)
            serviceRepoMock.findMany.mockResolvedValue([svc])
            subscriptionRepoMock.findMany.mockResolvedValue([expiredAccount])
            client.getAllUsers.mockResolvedValue([])

            await lifecycle.cleanupStaleLocalAccounts()

            expect(subscriptionRepoMock.delete).toHaveBeenCalledWith(expiredAccount.userId, expiredAccount.serviceId)
        })

        it('should not delete non-active local records when external account still exists', async () => {
            const client = createAccountIntegrationProviderMock()
            const svc = createServiceFixture()
            const cancelledAccount = createSubscriptionFixture({
                status: SubscriptionStatus.cancelled,
            })

            clientRegistryMock.get.mockReturnValue(client)
            serviceRepoMock.findMany.mockResolvedValue([svc])
            subscriptionRepoMock.findMany.mockResolvedValue([cancelledAccount])
            client.getAllUsers.mockResolvedValue([
                { id: 'ext-1', username: 'testuser', isActive: false, isAdmin: false },
            ])

            await lifecycle.cleanupStaleLocalAccounts()

            expect(subscriptionRepoMock.delete).not.toHaveBeenCalled()
        })
    })

    // #endregion cleanupStaleLocalAccounts

    // #region disableAllForUser

    describe('disableAllForUser', () => {
        const userId = 'user-uuid-1'
        const user = createUserFixture({ id: userId })

        describe('when user has no active subscriptions', () => {
            it('does nothing', async () => {
                subscriptionRepoMock.findMany.mockResolvedValue([])

                await lifecycle.disableAllForUser(userId)

                expect(subscriptionRepoMock.update).not.toHaveBeenCalled()
            })
        })

        describe('when user has active subscriptions', () => {
            it('disables each external account', async () => {
                const account = createSubscriptionFixture({ userId, status: SubscriptionStatus.active })
                const client = createAccountIntegrationProviderMock({ disableUser: jest.fn().mockResolvedValue(true) })
                subscriptionRepoMock.findMany.mockResolvedValue([account])
                userServiceMock.getUserById.mockResolvedValue(user)
                clientRegistryMock.get.mockReturnValue(client)
                client.getUser.mockResolvedValue({
                    ok: true,
                    user: { id: 'ext-1', username: 'testuser', isActive: true, isAdmin: false },
                })
                serviceRepoMock.findById.mockResolvedValue(createServiceFixture())

                await lifecycle.disableAllForUser(userId)

                expect(client.disableUser).toHaveBeenCalled()
            })

            it('sets status to disabled and autoRenew to false', async () => {
                const account = createSubscriptionFixture({ userId, status: SubscriptionStatus.active })
                const client = createAccountIntegrationProviderMock({ disableUser: jest.fn().mockResolvedValue(true) })
                subscriptionRepoMock.findMany.mockResolvedValue([account])
                userServiceMock.getUserById.mockResolvedValue(user)
                clientRegistryMock.get.mockReturnValue(client)
                serviceRepoMock.findById.mockResolvedValue(createServiceFixture())

                await lifecycle.disableAllForUser(userId)

                expect(subscriptionRepoMock.update).toHaveBeenCalledWith(
                    expect.objectContaining({
                        userId,
                        serviceId: account.serviceId,
                        status: SubscriptionStatus.disabled,
                        autoRenew: false,
                    })
                )
            })

            it('continues and still updates the DB record when the external call fails', async () => {
                const account = createSubscriptionFixture({ userId, status: SubscriptionStatus.active })
                const client = createAccountIntegrationProviderMock({
                    disableUser: jest.fn().mockRejectedValue(new Error('timeout')),
                })
                subscriptionRepoMock.findMany.mockResolvedValue([account])
                userServiceMock.getUserById.mockResolvedValue(user)
                clientRegistryMock.get.mockReturnValue(client)
                serviceRepoMock.findById.mockResolvedValue(createServiceFixture())

                await expect(lifecycle.disableAllForUser(userId)).resolves.not.toThrow()

                expect(subscriptionRepoMock.update).toHaveBeenCalledWith(
                    expect.objectContaining({ status: SubscriptionStatus.disabled, autoRenew: false })
                )
            })

            it('skips non-active subscriptions', async () => {
                const cancelled = createSubscriptionFixture({ userId, status: SubscriptionStatus.cancelled })
                subscriptionRepoMock.findMany.mockResolvedValue([cancelled])

                await lifecycle.disableAllForUser(userId)

                expect(subscriptionRepoMock.update).not.toHaveBeenCalled()
            })
        })
    })

    // #endregion disableAllForUser

    // #region listAll / listByUser / getById â€” detail hydration
})
