import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Inject,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
    ServiceUnavailableException,
    forwardRef,
} from '@nestjs/common'
import { UserService } from './user.service'
import { IServiceRepository, IUserAccountRepository } from '@/data/repositories'
import { SubscriptionCreateRequestDto, SubscriptionPatchRequestDto, SubscriptionResponseDto } from '@/types/dtos/subscriptionsDto'
import { AccountIntegrationRegistry } from '@/core/integrations/accountIntegrationRegistry'
import { IntegrationProvider, FailedOperation, UserAccountStatus } from '@/types/enums'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { UserAccountModel } from '@/types/models/userAccount'
import { IAccountIntegrationProvider } from '@/core/integrations/IAccountIntegrationProvider'
import { UserResponseDto } from '@/types/dtos/userDto'

@Injectable()
export class SubscriptionService {
    constructor(
        @Inject(forwardRef(() => UserService))
        private readonly userService: UserService,

        @Inject(IServiceRepository)
        private readonly serviceRepository: IServiceRepository,

        @Inject(IUserAccountRepository)
        private readonly userAccountRepository: IUserAccountRepository,

        @Inject(AccountIntegrationRegistry)
        private readonly accountIntegrationRegistry: AccountIntegrationRegistry,

        @Inject(LoggingProvider)
        private readonly logger: LoggingProvider
    ) {
        this.logger.setContext(this.constructor.name)
    }

    async subscribe(request: SubscriptionCreateRequestDto, userId: string): Promise<SubscriptionResponseDto> {
        const user = await this.userService.getUserById({ userId })

        if (!user) {
            throw new BadRequestException('User does not exist')
        }

        const service = await this.serviceRepository.findById(request.serviceId)

        if (!service?.enabled) {
            throw new BadRequestException('Service not available')
        }

        const existingUserServiceAccount = await this.userAccountRepository.find(userId, request.serviceId)

        if (existingUserServiceAccount && !this.isResubscribeAllowed(existingUserServiceAccount)) {
            if (existingUserServiceAccount.status === UserAccountStatus.disabled) {
                throw new ConflictException('User is not allowed to subscribe')
            }

            throw new ConflictException('User already subscribed to the service')
        }

        const client = await this.getIntegrationProvider(service.name)

        if (client.requiredInputs.email && request.email?.toLowerCase() !== user.email.toLowerCase()) {
            throw new BadRequestException("Email address must match the user's HomeGate account email address")
        }

        // When resubscribing from a previous record, check if the old external account still exists.
        // If it does, re-enable it and reactivate the local record rather than creating a new one.
        if (existingUserServiceAccount?.userServiceAccountId) {
            const previousAccountResult = await client.getUser({
                userServiceAccountId: existingUserServiceAccount.userServiceAccountId,
                username: existingUserServiceAccount.username,
                email: undefined,
            })

            if (previousAccountResult.ok && previousAccountResult.user) {
                const enabled = await client.enableUser({
                    userServiceAccountId: existingUserServiceAccount.userServiceAccountId,
                    username: existingUserServiceAccount.username,
                    email: user.email,
                })

                if (!enabled) {
                    throw new ServiceUnavailableException('Failed to re-enable existing service account')
                }

                const reactivatedAccount = await this.userAccountRepository.update({
                    userId,
                    serviceId: request.serviceId,
                    username: previousAccountResult.user.username,
                    userServiceAccountId: previousAccountResult.user.id,
                    status: UserAccountStatus.active,
                    autoRenew: request.autoRenew,
                    expiresAt: this.getDefaultExpirationDate(),
                    lastError: null,
                    failedAt: null,
                    cancelledAt: null,
                })

                if (!reactivatedAccount) {
                    throw new InternalServerErrorException('Failed to reactivate subscription')
                }

                this.logger.log(`User '${userId}' reactivated existing account on service '${service.id}'`)

                return this.mapSubscription(reactivatedAccount)
            }

            // External account is gone — fall through to create a new one.
        }

        try {
            const existingServiceUserResult = await client.getUser({
                username: request.serviceUsername,
                email: request.email,
                userServiceAccountId: undefined,
            })

            if (existingServiceUserResult.ok || existingServiceUserResult.user) {
                throw new ConflictException('Service account already exists')
            }
        } catch (error) {
            if (error instanceof ConflictException) {
                throw error
            }

            this.logger.error(`Failed to check service account availability for service '${service.name}'`, {
                stackTrace: error instanceof Error ? error.stack : String(error),
            })

            throw new ServiceUnavailableException('Failed to verify service account availability')
        }

        const expiresAt = this.getDefaultExpirationDate()
        let userAccount = existingUserServiceAccount

        // Create/update local provisioning record before external side effects.
        // External service calls are not atomic with the database, so this gives us
        // a record to mark as active or failed.
        if (!userAccount) {
            userAccount = await this.userAccountRepository.create({
                userId,
                serviceId: request.serviceId,
                username: request.serviceUsername,
                userServiceAccountId: null,
                status: UserAccountStatus.provisioning,
                autoRenew: request.autoRenew,
                expiresAt,
            })
        } else {
            const updatedUserAccount = await this.userAccountRepository.update({
                userId,
                serviceId: request.serviceId,
                username: request.serviceUsername,
                userServiceAccountId: null,
                status: UserAccountStatus.provisioning,
                autoRenew: request.autoRenew,
                expiresAt,
                lastError: null,
                failedAt: null,
                cancelledAt: null,
            })

            if (!updatedUserAccount) {
                throw new InternalServerErrorException('Failed to update subscription record')
            }

            userAccount = updatedUserAccount
        }

        try {
            const createdServiceUserResult = await client.createUser({
                username: request.serviceUsername,
                password: request.servicePassword,
                email: request.email,
                displayName: request.serviceUsername,
            })

            if (!createdServiceUserResult.ok || !createdServiceUserResult.user) {
                // The external service may have created the account despite a null/invalid response.
                // If so, a subsequent subscribe attempt will hit a ConflictException from client.getUser().
                // A reconciliation path (detect existing + link account) should be added to handle this.
                this.logger.error(
                    `Service client returned an invalid response after createUser for service '${service.name}'. ` +
                        `An orphaned external account may exist for username '${request.serviceUsername}'.`
                )
                throw new InternalServerErrorException('The service client did not return a valid response')
            }

            const activeUserAccount = await this.userAccountRepository.update({
                userId,
                serviceId: request.serviceId,
                userServiceAccountId: createdServiceUserResult.user.id,
                username: createdServiceUserResult.user.username,
                status: UserAccountStatus.active,
                provisionedAt: new Date(),
                lastError: null,
                failedAt: null,
            })

            if (!activeUserAccount) {
                throw new InternalServerErrorException('Failed to activate subscription')
            }

            this.logger.log(`User '${userId}' successfully subscribed to service '${service.id}'`)

            return this.mapSubscription(activeUserAccount)
        } catch (error) {
            await this.markSubscriptionFailed(
                userId,
                request.serviceId,
                this.toSafeErrorMessage(error),
                FailedOperation.provisioning
            )

            throw error
        }
    }

    async delete(subscriptionId: string, currentUserId: string, deleteImmediately?: boolean): Promise<boolean> {
        const existingUserServiceAccount = await this.getRawById(subscriptionId)

        const user = await this.userService.getUserById({ userId: existingUserServiceAccount.userId })
        const currentUser = await this.userService.getUserById({ userId: currentUserId })

        if (!user || !currentUser) {
            throw new BadRequestException(`User does not exist, userId: ${currentUserId}`)
        }

        if (!currentUser.isAdmin && currentUserId !== existingUserServiceAccount.userId) {
            throw new BadRequestException(`A non-admin user cannot delete a subscription for another user.`)
        }

        const service = await this.serviceRepository.findById(existingUserServiceAccount.serviceId)

        if (!service) {
            throw new BadRequestException('Service does not exist')
        }

        if (!this.isCurrentlyActive(existingUserServiceAccount)) {
            throw new ConflictException('User is not subscribed to the service')
        }

        try {
            if (deleteImmediately === true) {
                const client = await this.getIntegrationProvider(service.name)

                await this.userAccountRepository.update({
                    userId: existingUserServiceAccount.userId,
                    serviceId: existingUserServiceAccount.serviceId,
                    status: UserAccountStatus.cancelling,
                })

                const userServiceAccountDeleted = await client.deleteUser({
                    userServiceAccountId: existingUserServiceAccount.userServiceAccountId ?? undefined,
                    username: existingUserServiceAccount.username,
                    email: user.email,
                })

                if (!userServiceAccountDeleted) {
                    throw new ServiceUnavailableException(
                        `Failed to delete user service account for user '${user.id}' and service '${service.id}'`
                    )
                }

                await this.userAccountRepository.update({
                    userId: existingUserServiceAccount.userId,
                    serviceId: existingUserServiceAccount.serviceId,
                    status: UserAccountStatus.cancelled,
                    cancelledAt: new Date(),
                    lastError: null,
                })

                this.logger.log(`User '${user.id}' immediately cancelled subscription for service '${service.id}'`)

                return true
            }

            if (existingUserServiceAccount.autoRenew) {
                const updatedUserServiceAccount = await this.userAccountRepository.update({
                    userId: existingUserServiceAccount.userId,
                    serviceId: existingUserServiceAccount.serviceId,
                    autoRenew: false,
                })

                if (!updatedUserServiceAccount) {
                    throw new InternalServerErrorException(
                        `Failed to cancel auto-renew for user '${user.id}' and service '${service.id}'`
                    )
                }

                this.logger.log(
                    `User '${user.id}' cancelled auto-renew for service '${
                        service.id
                    }'. Access remains active until ${updatedUserServiceAccount.expiresAt?.toISOString()}`
                )

                return true
            }

            this.logger.log(`User '${user.id}' already had auto-renew disabled for service '${service.id}'`)

            return true
        } catch (error) {
            this.logger.error(`Failed to cancel subscription for user '${user.id}' and service '${service.id}'`, {
                stackTrace: error instanceof Error ? error.stack : String(error),
            })

            await this.markSubscriptionFailed(
                existingUserServiceAccount.userId,
                existingUserServiceAccount.serviceId,
                this.toSafeErrorMessage(error),
                FailedOperation.cancellation
            )

            // TODO: previously rethrew here, but the boolean return type can't ever be false
            // if every failure is thrown instead. Revisit whether callers need to distinguish
            // error types (e.g. bad request vs. service unavailable) rather than a plain boolean.
            return false
        }
    }

    async disableAllForUser(userId: string): Promise<void> {
        const accounts = await this.userAccountRepository.findMany({ userId })
        const accountsToDisable = accounts.filter((a) => a.status === UserAccountStatus.active)

        if (accountsToDisable.length === 0) return

        const user = await this.userService.getUserById({ userId })
        if (!user) return

        const cachedClients = new Map<number, IAccountIntegrationProvider>()
        const cachedUsers = new Map([[userId, user]])

        for (const account of accountsToDisable) {
            try {
                await this.disableUserAccount(account, cachedClients, cachedUsers)
            } catch {
                this.logger.warn(
                    `Failed to disable external account for user ${userId}, serviceId ${account.serviceId}`
                )
            }

            await this.userAccountRepository.update({
                userId: account.userId,
                serviceId: account.serviceId,
                status: UserAccountStatus.disabled,
                autoRenew: false,
            })
        }

        this.logger.log(`Disabled ${accountsToDisable.length} subscription(s) for user ${userId}`)
    }

    async getById(subscriptionId: string): Promise<SubscriptionResponseDto> {
        const account = await this.userAccountRepository.findById(subscriptionId)

        if (!account) {
            throw new NotFoundException('Subscription not found')
        }

        const [details] = await this.hydrateSubscriptionDetails([account])
        return details!
    }

    private async getRawById(subscriptionId: string): Promise<UserAccountModel> {
        const account = await this.userAccountRepository.findById(subscriptionId)

        if (!account) {
            throw new NotFoundException('Subscription not found')
        }

        return account
    }

    /**
     * Applies a partial state update (policy object) to a subscription.
     * - `enabled` transitions the account between active and disabled (including the external service account).
     * - `autoRenew` toggles automatic renewal.
     */
    async update(subscriptionId: string, patch: SubscriptionPatchRequestDto): Promise<SubscriptionResponseDto> {
        if (patch.enabled === undefined && patch.autoRenew === undefined) {
            throw new BadRequestException('No fields provided to update')
        }

        const account = await this.getRawById(subscriptionId)

        if (patch.enabled !== undefined) {
            const status = patch.enabled ? UserAccountStatus.active : UserAccountStatus.disabled
            await this.updateUserDisabledStatus(account.userId, account.serviceId, status)
        }

        if (patch.autoRenew !== undefined) {
            const updated = await this.userAccountRepository.update({
                userId: account.userId,
                serviceId: account.serviceId,
                autoRenew: patch.autoRenew,
            })

            if (!updated) {
                throw new BadRequestException('Failed to update auto-renew')
            }

            this.logger.log(`Admin set autoRenew=${patch.autoRenew} for subscription '${subscriptionId}'`)
        }

        return this.getById(subscriptionId)
    }

    /**
     * Toggles auto-renew for the subscription owner (self-service). Admins use `update`.
     */
    async setAutoRenew(subscriptionId: string, currentUserId: string, autoRenew: boolean): Promise<SubscriptionResponseDto> {
        const account = await this.getRawById(subscriptionId)
        if (account.userId !== currentUserId) {
            throw new ForbiddenException('You can only modify your own subscription')
        }

        const updated = await this.userAccountRepository.update({
            userId: account.userId,
            serviceId: account.serviceId,
            autoRenew,
        })

        if (!updated) {
            throw new BadRequestException('Failed to update auto-renew')
        }

        this.logger.log(`User '${currentUserId}' set autoRenew=${autoRenew} for subscription '${subscriptionId}'`)

        return this.getById(subscriptionId)
    }

    /**
     * Resets the external service account password for the subscription owner.
     * Uses the service's admin API key, so no current password is required.
     */
    async resetAccountPassword(subscriptionId: string, currentUserId: string, newPassword: string): Promise<boolean> {
        const account = await this.getRawById(subscriptionId)
        if (account.userId !== currentUserId) {
            throw new ForbiddenException('You can only reset a password on your own subscription')
        }

        if (!account.userServiceAccountId) {
            throw new BadRequestException('Service account is not provisioned yet')
        }

        const service = await this.serviceRepository.findById(account.serviceId)
        if (!service) {
            throw new BadRequestException('Service does not exist')
        }

        const client = await this.getIntegrationProvider(service.name)
        const ok = await client.resetPassword(
            {
                userServiceAccountId: account.userServiceAccountId,
                username: account.username,
                email: undefined,
            },
            newPassword
        )

        if (!ok) {
            throw new ServiceUnavailableException('Failed to reset the service account password')
        }

        this.logger.log(`User '${currentUserId}' reset password for subscription '${subscriptionId}'`)
        return true
    }

    async renew(subscriptionId: string): Promise<SubscriptionResponseDto> {
        const account = await this.getRawById(subscriptionId)

        const baseDate = account.expiresAt && account.expiresAt.getTime() > Date.now() ? account.expiresAt : new Date()
        const newExpiresAt = this.getDefaultExpirationDate(baseDate)

        const updated = await this.userAccountRepository.update({
            userId: account.userId,
            serviceId: account.serviceId,
            expiresAt: newExpiresAt,
            lastError: null,
        })

        if (!updated) {
            throw new BadRequestException('Failed to renew subscription')
        }

        this.logger.log(
            `Admin renewed subscription '${subscriptionId}' for user '${account.userId}' on service '${account.serviceId}'. New expiry: ${newExpiresAt.toISOString()}`
        )

        return this.mapSubscription(updated)
    }

    async listAll(take?: number, skip?: number): Promise<SubscriptionResponseDto[]> {
        const accounts = await this.userAccountRepository.findMany({}, take, skip)
        return this.hydrateSubscriptionDetails(accounts)
    }

    async listByUser(userId: string, take?: number, skip?: number): Promise<SubscriptionResponseDto[]> {
        const accounts = await this.userAccountRepository.findMany({ userId }, take, skip)
        return this.hydrateSubscriptionDetails(accounts)
    }

    private async getIntegrationProvider(serviceName: string) {
        const enabledServices = await this.accountIntegrationRegistry.getEnabled()

        const client = enabledServices.find((x) => x.name === (serviceName as IntegrationProvider))

        if (!client) {
            throw new BadRequestException('Service client not available')
        }

        return client
    }

    private async markSubscriptionFailed(
        userId: string,
        serviceId: number,
        lastError: string,
        failedOperation: FailedOperation
    ): Promise<void> {
        await this.userAccountRepository.update({
            userId,
            serviceId,
            status: UserAccountStatus.failed,
            failedAt: new Date(),
            failedOperation,
            lastError,
        })
    }

    // #region Mappers

    private mapSubscription(model: UserAccountModel): SubscriptionResponseDto {
        return {
            id: model.id,
            userId: model.userId,
            serviceId: model.serviceId,
            username: model.username,
            status: model.status,
            autoRenew: model.autoRenew,
            createdAt: model.createdAt,
            updatedAt: model.updatedAt,
            expiresAt: model.expiresAt,
            provisionedAt: model.provisionedAt,
            cancelledAt: model.cancelledAt,
        }
    }

    /** Batch-resolves the owning user's username/email and the service's display name for admin listings. */
    private async hydrateSubscriptionDetails(accounts: UserAccountModel[]): Promise<SubscriptionResponseDto[]> {
        const userIds = [...new Set(accounts.map((a) => a.userId))]
        const serviceIds = [...new Set(accounts.map((a) => a.serviceId))]

        const [users, services] = await Promise.all([
            Promise.all(userIds.map((id) => this.userService.getUserById({ userId: id }))),
            Promise.all(serviceIds.map((id) => this.serviceRepository.findById(id))),
        ])

        const userMap = new Map(users.filter((u) => u != null).map((u) => [u.id, u]))
        const serviceMap = new Map(services.filter((s) => s != null).map((s) => [s.id, s]))

        return accounts.map((account) => {
            const user = userMap.get(account.userId)
            const service = serviceMap.get(account.serviceId)
            return {
                ...this.mapSubscription(account),
                ...(user ? { userUsername: user.username, userEmail: user.email } : {}),
                ...(service ? { serviceName: service.name } : {}),
            }
        })
    }

    // #endregion Mappers

    private isCurrentlyActive(userAccount: UserAccountModel): boolean {
        return (
            userAccount.status === UserAccountStatus.active &&
            !!userAccount.expiresAt &&
            userAccount.expiresAt.getTime() > Date.now()
        )
    }

    private getDefaultExpirationDate(startTime?: Date): Date {
        const expiresAt = startTime ? new Date(startTime.getTime()) : new Date()
        expiresAt.setDate(expiresAt.getDate() + 30)
        return expiresAt
    }

    private toSafeErrorMessage(error: unknown): string {
        if (error instanceof Error) {
            return error.message
        }

        return 'Unknown subscription error'
    }

    private isResubscribeAllowed(userAccount: UserAccountModel | null): boolean {
        if (userAccount === null) return false
        if (userAccount.status === UserAccountStatus.active) return false
        if (userAccount.status === UserAccountStatus.failed) {
            return userAccount.failedOperation === FailedOperation.provisioning
        }
        return [UserAccountStatus.cancelled, UserAccountStatus.expired].includes(userAccount.status)
    }

    private async disableUserAccount(
        userAccount: UserAccountModel,
        cachedClients: Map<number, IAccountIntegrationProvider>,
        cachedUsers: Map<string, UserResponseDto>
    ): Promise<void> {
        let client = cachedClients.get(userAccount.serviceId)

        if (!client) {
            const service = await this.serviceRepository.findById(userAccount.serviceId)

            if (!service) {
                throw new BadRequestException('Service does not exist')
            }

            client = await this.getIntegrationProvider(service.name)
            cachedClients.set(service.id, client)
        }

        let user = cachedUsers.get(userAccount.userId)

        if (!user) {
            user = (await this.userService.getUserById({ userId: userAccount.userId })) ?? undefined

            if (!user) {
                throw new BadRequestException('User does not exist')
            }

            cachedUsers.set(user.id, user)
        }

        const disabled = await client.disableUser({
            userServiceAccountId: userAccount.userServiceAccountId ?? undefined,
            username: userAccount.username,
            email: user.email,
        })

        if (!disabled) {
            throw new InternalServerErrorException('Failed to disable external service account')
        }
    }

    private async updateUserDisabledStatus(
        userId: string,
        serviceId: number,
        status: UserAccountStatus
    ): Promise<boolean> {
        const isDisableOperation = status === UserAccountStatus.disabled

        const user = await this.userService.getUserById({ userId })

        if (!user) {
            throw new BadRequestException(`User does not exist, userId: ${userId}`)
        }

        const service = await this.serviceRepository.findById(serviceId)

        if (!service) {
            throw new BadRequestException('Service does not exist')
        }

        const existingUserServiceAccount = await this.userAccountRepository.find(userId, serviceId)

        if (!existingUserServiceAccount) {
            throw new ConflictException('User is not subscribed to the service')
        }

        if (isDisableOperation && !this.isCurrentlyActive(existingUserServiceAccount)) {
            throw new ConflictException('User account is not currently active')
        }

        if (!isDisableOperation && existingUserServiceAccount.status !== UserAccountStatus.disabled) {
            throw new ConflictException('User account is not currently disabled')
        }

        const transitionStatus = isDisableOperation ? UserAccountStatus.disabling : UserAccountStatus.enabling
        const operationLabel = isDisableOperation ? 'disable' : 'enable'

        try {
            const client = await this.getIntegrationProvider(service.name)

            await this.userAccountRepository.update({
                userId,
                serviceId,
                status: transitionStatus,
            })

            if (isDisableOperation) {
                // Reuse disableUserAccount with pre-populated caches to avoid redundant fetches.
                const cachedClients: Map<number, IAccountIntegrationProvider> = new Map([[service.id, client]])
                const cachedUsers: Map<string, UserResponseDto> = new Map([[user.id, user]])
                await this.disableUserAccount(existingUserServiceAccount, cachedClients, cachedUsers)
            } else {
                const externalUserResult = await client.getUser({
                    userServiceAccountId: existingUserServiceAccount.userServiceAccountId ?? undefined,
                    username: existingUserServiceAccount.username,
                    email: user.email,
                })

                if (!externalUserResult.ok || !externalUserResult.user) {
                    await this.userAccountRepository.delete(userId, serviceId)

                    this.logger.warn(
                        `External account for user '${user.id}' on service '${service.id}' no longer exists. ` +
                            `Stale local record deleted.`
                    )

                    return true
                }

                if (!externalUserResult.user.isActive) {
                    const enabled = await client.enableUser({
                        userServiceAccountId: existingUserServiceAccount.userServiceAccountId ?? undefined,
                        username: existingUserServiceAccount.username,
                        email: user.email,
                    })

                    if (!enabled) {
                        throw new InternalServerErrorException('Failed to enable external service account')
                    }
                }
            }

            await this.userAccountRepository.update({
                userId,
                serviceId,
                status,
                lastError: null,
            })

            this.logger.log(`User '${user.id}' subscription for service '${service.id}' was ${operationLabel}d`)

            return true
        } catch (error) {
            this.logger.error(
                `Failed to ${operationLabel} subscription for user '${user.id}' and service '${service.id}'`,
                {
                    stackTrace: error instanceof Error ? error.stack : String(error),
                }
            )

            await this.markSubscriptionFailed(
                userId,
                serviceId,
                this.toSafeErrorMessage(error),
                FailedOperation.cancellation
            )

            throw error
        }
    }
    // #region subscription processing

    /**
     * Pass 1: for each account on the external service, enforce local state.
     * - No local record → disable external (orphan)
     * - Local active, external disabled → enable external (drift)
     * - Local not active, external active → disable external (drift)
     */
    private async syncExternalToLocal(
        client: IAccountIntegrationProvider,
        clientUsers: Awaited<ReturnType<IAccountIntegrationProvider['getAllUsers']>> & {},
        localAccounts: UserAccountModel[]
    ): Promise<void> {
        const localByExternalId = new Map(
            localAccounts.filter((a) => a.userServiceAccountId !== null).map((a) => [a.userServiceAccountId!, a])
        )

        for (const clientUser of clientUsers) {
            const localAccount = localByExternalId.get(clientUser.id)

            if (!localAccount) {
                if (clientUser.isAdmin) {
                    continue
                }

                await client.disableUser({
                    userServiceAccountId: clientUser.id,
                    username: clientUser.username,
                    email: undefined,
                })

                this.logger.warn(
                    `Orphaned account on service '${client.name}': disabled external user ` +
                        `'${clientUser.username}' (id: '${clientUser.id}') — no local record found`
                )
                continue
            }

            const localIsActive = localAccount.status === UserAccountStatus.active

            if (localIsActive && !clientUser.isActive) {
                await client.enableUser({
                    userServiceAccountId: clientUser.id,
                    username: clientUser.username,
                    email: undefined,
                })

                this.logger.warn(
                    `Drift detected on service '${client.name}': re-enabled external user ` +
                        `'${clientUser.username}' — local record is active but external account was disabled`
                )
                continue
            }

            if (!localIsActive && clientUser.isActive) {
                await client.disableUser({
                    userServiceAccountId: clientUser.id,
                    username: clientUser.username,
                    email: undefined,
                })

                this.logger.warn(
                    `Drift detected on service '${client.name}': disabled external user ` +
                        `'${clientUser.username}' — local status is '${localAccount.status}' but external account was active`
                )
            }
        }
    }

    /**
     * Pass 2: for each active local account, verify the external account still exists.
     * - Active local record with no matching external account → mark local as failed.
     */
    private async syncLocalToExternal(
        client: IAccountIntegrationProvider,
        clientUsers: Awaited<ReturnType<IAccountIntegrationProvider['getAllUsers']>> & {},
        localAccounts: UserAccountModel[]
    ): Promise<void> {
        const clientUserById = new Map(clientUsers.map((u) => [u.id, u]))

        for (const localAccount of localAccounts) {
            if (localAccount.status !== UserAccountStatus.active) {
                continue
            }

            if (!localAccount.userServiceAccountId) {
                continue
            }

            if (!clientUserById.has(localAccount.userServiceAccountId)) {
                await this.markSubscriptionFailed(
                    localAccount.userId,
                    localAccount.serviceId,
                    `External account not found on service '${client.name}' during sync`,
                    FailedOperation.sync
                )

                this.logger.warn(
                    `Active local record for user '${localAccount.userId}' on service '${client.name}' ` +
                        `has no matching external account — marked as failed`
                )
            }
        }
    }

    /**
     * Retries a previously failed subscription operation on behalf of an admin.
     * Only accounts in the `failed` state are eligible; failed provisioning must
     * be retried via `subscribe()` instead.
     *
     * Behaviour by `failedOperation`:
     * - `cancellation` → deletes the external account (if it still exists) and marks local as cancelled
     * - `expiration`   → disables the external account (if still active) and marks local as expired
     * - `sync`         → checks whether the external account still exists:
     *                    gone → marks local as cancelled; present → restores local to active
     *
     * @throws BadRequestException  if the caller is not an admin, or if the failed operation
     *                              is provisioning (use `subscribe()` instead)
     * @throws ConflictException    if the account is not in a failed state
     */
    async retryFailedOperation(userId: string, serviceId: number, currentUserId: string): Promise<boolean> {
        const currentUser = await this.userService.getUserById({ userId: currentUserId })

        if (!currentUser?.isAdmin) {
            throw new BadRequestException('Unauthorized: admin access required to retry a failed operation')
        }

        const existingAccount = await this.userAccountRepository.find(userId, serviceId)

        if (!existingAccount || existingAccount.status !== UserAccountStatus.failed) {
            throw new ConflictException('Account is not in a failed state')
        }

        if (!existingAccount.failedOperation || existingAccount.failedOperation === FailedOperation.provisioning) {
            throw new BadRequestException('Use subscribe() to retry failed provisioning')
        }

        const user = await this.userService.getUserById({ userId })

        if (!user) {
            throw new BadRequestException('User does not exist')
        }

        const service = await this.serviceRepository.findById(serviceId)

        if (!service) {
            throw new BadRequestException('Service does not exist')
        }

        const client = await this.getIntegrationProvider(service.name)
        const { failedOperation } = existingAccount

        try {
            const externalUserResult = await client.getUser({
                userServiceAccountId: existingAccount.userServiceAccountId ?? undefined,
                username: existingAccount.username,
                email: user.email,
            })

            const externalIsGone = !externalUserResult.ok || !externalUserResult.user
            const externalIsInactive = !externalIsGone && !externalUserResult.user!.isActive

            if (failedOperation === FailedOperation.cancellation) {
                if (!externalIsGone) {
                    const deleted = await client.deleteUser({
                        userServiceAccountId: existingAccount.userServiceAccountId ?? undefined,
                        username: existingAccount.username,
                        email: user.email,
                    })

                    if (!deleted) {
                        throw new ServiceUnavailableException('Failed to delete external service account')
                    }
                }

                await this.userAccountRepository.update({
                    userId,
                    serviceId,
                    status: UserAccountStatus.cancelled,
                    cancelledAt: new Date(),
                    lastError: null,
                    failedAt: null,
                    failedOperation: null,
                })

                this.logger.log(
                    `Retry cancellation succeeded for user '${user.id}' on service '${service.id}'` +
                        (externalIsGone ? ' (external account was already deleted)' : '')
                )
                return true
            }

            if (failedOperation === FailedOperation.expiration) {
                if (!externalIsGone && !externalIsInactive) {
                    const disabled = await client.disableUser({
                        userServiceAccountId: existingAccount.userServiceAccountId ?? undefined,
                        username: existingAccount.username,
                        email: user.email,
                    })

                    if (!disabled) {
                        throw new ServiceUnavailableException('Failed to disable external service account')
                    }
                }

                await this.userAccountRepository.update({
                    userId,
                    serviceId,
                    status: UserAccountStatus.expired,
                    lastError: null,
                    failedAt: null,
                    failedOperation: null,
                })

                this.logger.log(
                    `Retry expiration succeeded for user '${user.id}' on service '${service.id}'` +
                        (externalIsGone || externalIsInactive
                            ? ' (external account was already disabled or deleted)'
                            : '')
                )
                return true
            }

            // FailedOperation.sync — external account was not found during sync
            if (externalIsGone) {
                await this.userAccountRepository.update({
                    userId,
                    serviceId,
                    status: UserAccountStatus.cancelled,
                    cancelledAt: new Date(),
                    lastError: null,
                    failedAt: null,
                    failedOperation: null,
                })

                this.logger.log(
                    `Retry sync for user '${user.id}' on service '${service.id}': external account confirmed gone, marked as cancelled`
                )
            } else {
                await this.userAccountRepository.update({
                    userId,
                    serviceId,
                    status: UserAccountStatus.active,
                    lastError: null,
                    failedAt: null,
                    failedOperation: null,
                })

                this.logger.log(
                    `Retry sync for user '${user.id}' on service '${service.id}': external account found, restored to active`
                )
            }

            return true
        } catch (error) {
            this.logger.error(
                `Failed to retry operation '${failedOperation}' for user '${user.id}' on service '${service.id}'`,
                {
                    stackTrace: error instanceof Error ? error.stack : String(error),
                }
            )
            throw error
        }
    }

    // #endregion subscription processing

    // #region Scheduled Tasks

    /**
     * Reconciles all external service accounts against local records.
     * The local database is the source of truth. Two passes are performed per client:
     *
     * Pass 1 — External → Local:
     *   For every account that exists on the external service, find the matching
     *   local record by userServiceAccountId. If no record exists the account
     *   is orphaned and will be disabled. If the active state differs between
     *   the local record and the external service, the external service is corrected.
     *
     * Pass 2 — Local → External:
     *   For every active local record, verify the external account still exists.
     *   If it has been deleted externally (bypassing this application), the local record is
     *   marked as failed so it surfaces for investigation and retry.
     */
    public async syncIntegrationAccounts(): Promise<boolean> {
        let success = true
        const clients = await this.accountIntegrationRegistry.getEnabled()

        // Fetch all services and all local accounts once before the loop.
        const allServices = await this.serviceRepository.findMany({})
        const allLocalAccounts = await this.userAccountRepository.findMany({})
        const serviceByName = new Map(allServices.map((s) => [s.name, s]))

        for (const client of clients) {
            try {
                const service = serviceByName.get(client.name)

                if (!service) {
                    this.logger.warn(
                        `Skipping account sync for client '${client.name}': no matching service record found`
                    )
                    continue
                }

                const clientUsers = await client.getAllUsers()

                if (!clientUsers) {
                    this.logger.warn(`Skipping account sync for client '${client.name}': getAllUsers() returned null`)
                    continue
                }

                const localAccounts = allLocalAccounts.filter((a) => a.serviceId === service.id)

                await this.syncExternalToLocal(client, clientUsers, localAccounts)
                await this.syncLocalToExternal(client, clientUsers, localAccounts)
            } catch (error) {
                // Log and continue — a failure on one client should not prevent syncing the others.
                this.logger.error(`Failed to sync accounts for client '${client.name}'`, {
                    stackTrace: error instanceof Error ? error.stack : String(error),
                })
                success = false
            }
        }

        return success
    }

    /**
     * Processes all active subscriptions and enforces expiration policy.
     *
     * For each active subscription:
     * - No expiration date → disable the external account and mark as disabled
     * - Not yet expired → skip
     * - Expired with auto-renew → extend expiry by 30 days
     * - Expired without auto-renew → disable the external account and mark as expired
     *
     * Failures per subscription are caught individually so one error does not
     * prevent the remaining subscriptions from being processed.
     */
    public async processSubscriptions(): Promise<boolean> {
        const subscriptions = await this.userAccountRepository.findMany({
            statuses: [UserAccountStatus.active],
        })

        const cachedClients: Map<number, IAccountIntegrationProvider> = new Map()
        const cachedUsers: Map<string, UserResponseDto> = new Map()
        const now = Date.now()
        let success = true

        for (const sub of subscriptions) {
            try {
                if (!sub.expiresAt) {
                    await this.disableUserAccount(sub, cachedClients, cachedUsers)

                    await this.userAccountRepository.update({
                        userId: sub.userId,
                        serviceId: sub.serviceId,
                        status: UserAccountStatus.disabled,
                        lastError: 'Active subscription had no expiration date',
                        failedAt: null,
                    })

                    this.logger.warn(
                        `Disabled subscription for user '${sub.userId}' on service '${sub.serviceId}': no expiration date was set`
                    )

                    continue
                }

                if (sub.expiresAt.getTime() > now) {
                    continue
                }

                if (sub.autoRenew) {
                    const renewedExpiresAt = this.getDefaultExpirationDate(sub.expiresAt)

                    await this.userAccountRepository.update({
                        userId: sub.userId,
                        serviceId: sub.serviceId,
                        expiresAt: renewedExpiresAt,
                        lastError: null,
                        failedAt: null,
                    })

                    this.logger.log(
                        `Auto-renewed subscription for user '${sub.userId}' on service '${sub.serviceId}'. New expiry: ${renewedExpiresAt.toISOString()}`
                    )

                    continue
                }

                await this.disableUserAccount(sub, cachedClients, cachedUsers)

                await this.userAccountRepository.update({
                    userId: sub.userId,
                    serviceId: sub.serviceId,
                    status: UserAccountStatus.expired,
                    lastError: null,
                    failedAt: null,
                })

                this.logger.log(`Expired subscription for user '${sub.userId}' on service '${sub.serviceId}'`)
            } catch (error) {
                this.logger.error(
                    `Failed to clean up subscription for user '${sub.userId}' and service '${sub.serviceId}'`,
                    {
                        stackTrace: error instanceof Error ? error.stack : String(error),
                    }
                )

                await this.userAccountRepository.update({
                    userId: sub.userId,
                    serviceId: sub.serviceId,
                    status: UserAccountStatus.failed,
                    lastError: this.toSafeErrorMessage(error),
                    failedAt: new Date(),
                    failedOperation: FailedOperation.expiration,
                })
                success = false
            }
        }

        return success
    }

    /**
     * Deletes stale local records for non-active accounts whose external counterpart
     * no longer exists (e.g. cleaned up by the external application).
     * Intended to be scheduled at a lower frequency than syncClientAccounts.
     */
    public async cleanupStaleLocalAccounts(): Promise<boolean> {
        let success = true
        const clients = await this.accountIntegrationRegistry.getEnabled()
        const allServices = await this.serviceRepository.findMany({})
        const allLocalAccounts = await this.userAccountRepository.findMany({})
        const serviceByName = new Map(allServices.map((s) => [s.name, s]))

        for (const client of clients) {
            try {
                const service = serviceByName.get(client.name)

                if (!service) {
                    continue
                }

                const clientUsers = await client.getAllUsers()

                if (!clientUsers) {
                    continue
                }

                const clientUserById = new Map(clientUsers.map((u) => [u.id, u]))
                const localAccounts = allLocalAccounts.filter((a) => a.serviceId === service.id)

                for (const localAccount of localAccounts) {
                    if (localAccount.status === UserAccountStatus.active) {
                        continue
                    }

                    if (!localAccount.userServiceAccountId) {
                        continue
                    }

                    if (!clientUserById.has(localAccount.userServiceAccountId)) {
                        await this.userAccountRepository.delete(localAccount.userId, localAccount.serviceId)

                        this.logger.log(
                            `Deleted stale local record for user '${localAccount.userId}' on service '${localAccount.serviceId}': ` +
                                `external account (id: '${localAccount.userServiceAccountId}') no longer exists`
                        )
                    }
                }
            } catch (error) {
                this.logger.error(`Failed to clean up stale records for client '${client.name}'`, {
                    stackTrace: error instanceof Error ? error.stack : String(error),
                })
                success = false
            }
        }

        return success
    }
    //#endregion Scheduled Tasks
}
