import {
    BadRequestException,
    ConflictException,
    Inject,
    Injectable,
    InternalServerErrorException,
    ServiceUnavailableException,
} from '@nestjs/common'
import { UserService } from './user.service'
import { IServiceRepository, IUserAccountRepository } from '@/data/repositories'
import {
    SubscriptionCreateRequestDto,
    SubscriptionDeleteRequestDto,
    SubscriptionDisableRequestDto,
} from '@/types/dtos/subscriptionsDto'
import { ApplicationClientRegistry } from '@/core/clients/applicationClientRegistry'
import { ApplicationClientNames, UserAccountStatus } from '@/types/enums'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { UserAccountModel } from '@/types/models/userAccount'
import { IApplicationManager } from '@/core/clients/IApplicationManager'
import { UserResponseDto } from '@/types/dtos/userDto'

@Injectable()
export class SubscriptionService {
    constructor(
        @Inject(UserService)
        private readonly userService: UserService,

        @Inject(IServiceRepository)
        private readonly serviceRepository: IServiceRepository,

        @Inject(IUserAccountRepository)
        private readonly userAccountRepository: IUserAccountRepository,

        @Inject(ApplicationClientRegistry)
        private readonly applicationClientRegistry: ApplicationClientRegistry,

        @Inject(LoggingProvider)
        private readonly logger: LoggingProvider
    ) {
        this.logger.setContext(this.constructor.name)
    }

    async subscribe(request: SubscriptionCreateRequestDto, userId: string): Promise<UserAccountModel> {
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

        // TODO: if an account is expired or cancelled, then consider enabling rather than creating a new account.
        const client = await this.getServiceClient(service.name)

        if (
            client.requiredInputs.password &&
            (!request.servicePassword || request.servicePassword !== request.confirmServicePassword)
        ) {
            throw new BadRequestException('Passwords do not match')
        }

        if (client.requiredInputs.email && request.email?.toLowerCase() !== user.email.toLowerCase()) {
            throw new BadRequestException("Email address must match the user's HomeGate account email address")
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

            return activeUserAccount
        } catch (error) {
            await this.markSubscriptionFailed(userId, request.serviceId, this.toSafeErrorMessage(error))

            throw error
        }
    }

    async delete(request: SubscriptionDeleteRequestDto, currentUserId: string): Promise<boolean> {
        const user = await this.userService.getUserById({ userId: request.userId })
        const currentUser = await this.userService.getUserById({ userId: currentUserId })

        if (!user || !currentUser) {
            throw new BadRequestException(`User does not exist, userId: ${currentUserId ?? request.userId}`)
        }

        if (!currentUser.isAdmin && currentUserId !== request.userId) {
            throw new BadRequestException(`A non-admin user cannot delete a subscription for another user.`)
        }

        const service = await this.serviceRepository.findById(request.serviceId)

        if (!service) {
            throw new BadRequestException('Service does not exist')
        }

        const existingUserServiceAccount = await this.userAccountRepository.find(request.userId, request.serviceId)

        if (!existingUserServiceAccount || !this.isCurrentlyActive(existingUserServiceAccount)) {
            throw new ConflictException('User is not subscribed to the service')
        }

        try {
            if (request.deleteImmediately === true) {
                const client = await this.getServiceClient(service.name)

                await this.userAccountRepository.update({
                    userId: request.userId,
                    serviceId: request.serviceId,
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
                    userId: request.userId,
                    serviceId: request.serviceId,
                    status: UserAccountStatus.cancelled,
                    cancelledAt: new Date(),
                    lastError: null,
                })

                this.logger.log(`User '${user.id}' immediately cancelled subscription for service '${service.id}'`)

                return true
            }

            if (existingUserServiceAccount.autoRenew) {
                const updatedUserServiceAccount = await this.userAccountRepository.update({
                    userId: request.userId,
                    serviceId: request.serviceId,
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

            await this.markSubscriptionFailed(request.userId, request.serviceId, this.toSafeErrorMessage(error))

            throw error
        }
    }

    async disable(request: SubscriptionDisableRequestDto, currentUserId: string): Promise<boolean> {
        const currentUser = await this.userService.getUserById({ userId: currentUserId })

        if (!currentUser || !currentUser.isAdmin) {
            throw new BadRequestException('Unauthorized: admin access required to disable a subscription')
        }

        return this.updateUserDisabledStatus(request.userId, request.serviceId, UserAccountStatus.disabled)
    }

    async enable(request: SubscriptionDisableRequestDto, currentUserId: string): Promise<boolean> {
        const currentUser = await this.userService.getUserById({ userId: currentUserId })

        if (!currentUser || !currentUser.isAdmin) {
            throw new BadRequestException('Unauthorized: admin access required to enable a subscription')
        }

        return this.updateUserDisabledStatus(request.userId, request.serviceId, UserAccountStatus.active)
    }

    private async getServiceClient(serviceName: string) {
        const enabledServices = await this.applicationClientRegistry.getEnabled()

        const client = enabledServices.find((x) => x.name === (serviceName as ApplicationClientNames))

        if (!client) {
            throw new BadRequestException('Service client not available')
        }

        return client
    }

    private async markSubscriptionFailed(userId: string, serviceId: number, lastError: string): Promise<void> {
        await this.userAccountRepository.update({
            userId,
            serviceId,
            status: UserAccountStatus.failed,
            failedAt: new Date(),
            lastError,
        })
    }

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
        return (
            userAccount !== null &&
            [UserAccountStatus.failed, UserAccountStatus.cancelled, UserAccountStatus.expired].includes(
                userAccount.status
            )
        )
    }

    private async disableUserAccount(
        userAccount: UserAccountModel,
        cachedClients: Map<number, IApplicationManager>,
        cachedUsers: Map<string, UserResponseDto>
    ): Promise<void> {
        let client = cachedClients.get(userAccount.serviceId)

        if (!client) {
            const service = await this.serviceRepository.findById(userAccount.serviceId)

            if (!service) {
                throw new BadRequestException('Service does not exist')
            }

            client = await this.getServiceClient(service.name)
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

    private async setAccountStatus(userId: string, serviceId: number, status: UserAccountStatus) {
        try {
            await this.userAccountRepository.update({
                userId,
                serviceId: serviceId,
                status: status,
            })
        } catch (error) {
            this.logger.error(
                `Failed to set subscription status: '${status}' for '${userId}' on service '${serviceId}'`,
                {
                    stackTrace: error instanceof Error ? error.stack : String(error),
                }
            )
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
            const client = await this.getServiceClient(service.name)

            await this.userAccountRepository.update({
                userId,
                serviceId,
                status: transitionStatus,
            })

            if (isDisableOperation) {
                // Reuse disableUserAccount with pre-populated caches to avoid redundant fetches.
                const cachedClients: Map<number, IApplicationManager> = new Map([[service.id, client]])
                const cachedUsers: Map<string, UserResponseDto> = new Map([[user.id, user]])
                await this.disableUserAccount(existingUserServiceAccount, cachedClients, cachedUsers)
            } else {
                const enabled = await client.enableUser({
                    userServiceAccountId: existingUserServiceAccount.userServiceAccountId ?? undefined,
                    username: existingUserServiceAccount.username,
                    email: user.email,
                })

                if (!enabled) {
                    throw new InternalServerErrorException('Failed to enable external service account')
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

            await this.setAccountStatus(userId, serviceId, UserAccountStatus.failed)

            throw error
        }
    }
    // #region subscription processing
    public async cleanUpSubscriptions(): Promise<void> {
        try {
            await this.updateActiveSubscriptions()
        } catch (error) {
            this.logger.error('An error occurred cleaning up subscriptions', {
                stackTrace: error instanceof Error ? error.stack : String(error),
            })

            throw new InternalServerErrorException('An error occurred cleaning up subscriptions')
        }
    }

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
    public async syncClientAccounts(): Promise<void> {
        const clients = await this.applicationClientRegistry.getEnabled()

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
            }
        }
    }

    /**
     * Pass 1: for each account on the external service, enforce local state.
     * - No local record → disable external (orphan)
     * - Local active, external disabled → enable external (drift)
     * - Local not active, external active → disable external (drift)
     */
    private async syncExternalToLocal(
        client: IApplicationManager,
        clientUsers: Awaited<ReturnType<IApplicationManager['getAllUsers']>> & {},
        localAccounts: UserAccountModel[]
    ): Promise<void> {
        const localByExternalId = new Map(
            localAccounts.filter((a) => a.userServiceAccountId !== null).map((a) => [a.userServiceAccountId!, a])
        )

        for (const clientUser of clientUsers) {
            const localAccount = localByExternalId.get(clientUser.id)

            if (!localAccount) {
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
        client: IApplicationManager,
        clientUsers: Awaited<ReturnType<IApplicationManager['getAllUsers']>> & {},
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
                    `External account not found on service '${client.name}' during sync`
                )

                this.logger.warn(
                    `Active local record for user '${localAccount.userId}' on service '${client.name}' ` +
                        `has no matching external account — marked as failed`
                )
            }
        }
    }

    private async updateActiveSubscriptions(): Promise<void> {
        const subscriptions = await this.userAccountRepository.findMany({
            statuses: [UserAccountStatus.active],
        })

        const cachedClients: Map<number, IApplicationManager> = new Map()
        const cachedUsers: Map<string, UserResponseDto> = new Map()
        const now = Date.now()

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
                })
            }
        }
    }

    // #endregion subscription processing
}
