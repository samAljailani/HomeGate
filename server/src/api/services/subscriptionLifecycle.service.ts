import { BadRequestException, ConflictException, Inject, Injectable, forwardRef } from '@nestjs/common'
import { UserService } from './user.service'
import { SubscriptionService } from './subscriptions.service'
import { IExternalUserAccountRepository, IServiceRepository, ISubscriptionRepository } from '@/data/repositories'
import { AccountType, FailedOperation, SubscriptionStatus } from '@/types/enums'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { SubscriptionModel } from '@/types/models/subscription'
import { ExternalUserAccountModel } from '@/types/models/externalUserAccount'
import { ServiceModel } from '@/types/models/service'
import { AccountIntegrationRegistry } from '@/core/integrations/accountIntegrationRegistry'
import { IAccountIntegrationProvider } from '@/core/integrations/IAccountIntegrationProvider'
import { SubscriptionProvisionerResolver } from '@/core/subscriptions/provisioners'
import { SubscriptionCascadeService } from '@/core/subscriptions/subscriptionCascade.service'

const ALL = Number.MAX_SAFE_INTEGER

/**
 * Scheduled reconciliation and bulk lifecycle operations. Integration work is confined to
 * MANAGED services; REFERENCED and NONE subscriptions are state-only here.
 */
@Injectable()
export class SubscriptionLifecycleService {
    constructor(
        @Inject(forwardRef(() => UserService))
        private readonly userService: UserService,

        @Inject(forwardRef(() => SubscriptionService))
        private readonly subscriptionService: SubscriptionService,

        @Inject(IServiceRepository)
        private readonly serviceRepository: IServiceRepository,

        @Inject(ISubscriptionRepository)
        private readonly subscriptionRepository: ISubscriptionRepository,

        @Inject(IExternalUserAccountRepository)
        private readonly externalAccountRepository: IExternalUserAccountRepository,

        @Inject(SubscriptionProvisionerResolver)
        private readonly provisioners: SubscriptionProvisionerResolver,

        @Inject(SubscriptionCascadeService)
        private readonly cascade: SubscriptionCascadeService,

        @Inject(AccountIntegrationRegistry)
        private readonly registry: AccountIntegrationRegistry,

        @Inject(LoggingProvider)
        private readonly logger: LoggingProvider
    ) {
        this.logger.setContext(this.constructor.name)
    }

    async disableAllForUser(userId: string): Promise<void> {
        const subscriptions = await this.subscriptionRepository.findMany(
            { userId, statuses: [SubscriptionStatus.active] },
            ALL
        )

        if (subscriptions.length === 0) return

        const user = await this.userService.getUserById({ userId })
        if (!user) return

        for (const subscription of subscriptions) {
            try {
                const service = await this.serviceRepository.findById(subscription.serviceId)

                if (service) {
                    const context = await this.subscriptionService.buildLifecycleContext(
                        subscription,
                        service,
                        user.email
                    )
                    await this.provisioners.resolve(service).disable(context)
                }
            } catch {
                this.logger.warn(
                    `Failed to disable external account for user ${userId}, serviceId ${subscription.serviceId}`
                )
            }

            await this.subscriptionRepository.update({
                userId: subscription.userId,
                serviceId: subscription.serviceId,
                status: SubscriptionStatus.disabled,
                autoRenew: false,
            })
        }

        this.logger.log(`Disabled ${subscriptions.length} subscription(s) for user ${userId}`)
    }

    /**
     * Enforces expiration policy on every active subscription.
     * - No expiry → disable and mark disabled
     * - Not yet expired → skip
     * - Expired with auto-renew → extend, then re-clamp anything derived from it
     * - Expired without auto-renew → disable and mark expired
     */
    async processSubscriptions(): Promise<boolean> {
        const subscriptions = await this.subscriptionRepository.findMany(
            { statuses: [SubscriptionStatus.active] },
            ALL
        )

        const now = Date.now()
        let success = true

        for (const subscription of subscriptions) {
            try {
                if (subscription.expiresAt && subscription.expiresAt.getTime() > now) {
                    continue
                }

                if (subscription.expiresAt && subscription.autoRenew) {
                    const renewedExpiresAt = this.subscriptionService.getDefaultExpirationDate(subscription.expiresAt)

                    const renewed = await this.subscriptionRepository.update({
                        userId: subscription.userId,
                        serviceId: subscription.serviceId,
                        expiresAt: renewedExpiresAt,
                        lastError: null,
                        failedAt: null,
                    })

                    if (renewed) {
                        await this.cascade.onExpiryChanged(renewed)
                    }

                    this.logger.log(
                        `Auto-renewed subscription for user '${subscription.userId}' on service ` +
                            `'${subscription.serviceId}'. New expiry: ${renewedExpiresAt.toISOString()}`
                    )

                    continue
                }

                const terminalStatus = subscription.expiresAt
                    ? SubscriptionStatus.expired
                    : SubscriptionStatus.disabled

                await this.disableExternalAccount(subscription)

                const updated = await this.subscriptionRepository.update({
                    userId: subscription.userId,
                    serviceId: subscription.serviceId,
                    status: terminalStatus,
                    lastError: subscription.expiresAt ? null : 'Active subscription had no expiration date',
                    failedAt: null,
                })

                if (updated) {
                    await this.cascade.onDeactivated(updated, terminalStatus)
                }

                if (subscription.expiresAt) {
                    this.logger.log(
                        `Expired subscription for user '${subscription.userId}' on service ` +
                            `'${subscription.serviceId}'`
                    )
                } else {
                    this.logger.warn(
                        `Disabled subscription for user '${subscription.userId}' on service ` +
                            `'${subscription.serviceId}': no expiration date was set`
                    )
                }
            } catch (error) {
                this.logger.error(
                    `Failed to process subscription for user '${subscription.userId}' and service ` +
                        `'${subscription.serviceId}'`,
                    { stackTrace: error instanceof Error ? error.stack : String(error) }
                )

                await this.subscriptionRepository.update({
                    userId: subscription.userId,
                    serviceId: subscription.serviceId,
                    status: SubscriptionStatus.failed,
                    lastError: this.subscriptionService.toSafeErrorMessage(error),
                    failedAt: new Date(),
                    failedOperation: FailedOperation.expiration,
                })
                success = false
            }
        }

        return success
    }

    private async disableExternalAccount(subscription: SubscriptionModel): Promise<void> {
        const service = await this.serviceRepository.findById(subscription.serviceId)

        if (!service) {
            throw new BadRequestException('Service does not exist')
        }

        const user = await this.userService.getUserById({ userId: subscription.userId })

        if (!user) {
            throw new BadRequestException('User does not exist')
        }

        const context = await this.subscriptionService.buildLifecycleContext(subscription, service, user.email)
        await this.provisioners.resolve(service).disable(context)
    }

    /**
     * Reconciles external accounts against local records for MANAGED services only.
     * Pass 1 corrects the external service from local state; pass 2 flags local records
     * whose external account has vanished.
     */
    async syncIntegrationAccounts(): Promise<boolean> {
        let success = true

        for (const { provider, service, accounts } of await this.loadManagedServiceAccounts()) {
            try {
                const externalUsers = await provider.getAllUsers()

                if (!externalUsers) {
                    this.logger.warn(
                        `Skipping account sync for '${service.name}': getAllUsers() returned null`
                    )
                    continue
                }

                await this.syncExternalToLocal(provider, externalUsers, accounts)
                await this.syncLocalToExternal(provider, externalUsers, accounts)
            } catch (error) {
                // One failing integration must not block the others.
                this.logger.error(`Failed to sync accounts for '${service.name}'`, {
                    stackTrace: error instanceof Error ? error.stack : String(error),
                })
                success = false
            }
        }

        return success
    }

    /** Deletes local records for non-active subscriptions whose external account is gone. */
    async cleanupStaleLocalAccounts(): Promise<boolean> {
        let success = true

        for (const { provider, service, accounts } of await this.loadManagedServiceAccounts()) {
            try {
                const externalUsers = await provider.getAllUsers()

                if (!externalUsers) {
                    continue
                }

                const externalById = new Map(externalUsers.map((u) => [u.id, u]))

                for (const { account, subscription } of accounts) {
                    if (subscription.status === SubscriptionStatus.active || !account?.externalAccountId) {
                        continue
                    }

                    if (!externalById.has(account.externalAccountId)) {
                        await this.subscriptionRepository.delete(subscription.userId, subscription.serviceId)

                        this.logger.log(
                            `Deleted stale local record for user '${subscription.userId}' on service ` +
                                `'${subscription.serviceId}': external account ` +
                                `(id: '${account.externalAccountId}') no longer exists`
                        )
                    }
                }
            } catch (error) {
                this.logger.error(`Failed to clean up stale records for '${service.name}'`, {
                    stackTrace: error instanceof Error ? error.stack : String(error),
                })
                success = false
            }
        }

        return success
    }

    /** Joins each enabled MANAGED service to its provider and its local subscription/account pairs. */
    private async loadManagedServiceAccounts(): Promise<
        {
            provider: IAccountIntegrationProvider
            service: ServiceModel
            accounts: { subscription: SubscriptionModel; account: ExternalUserAccountModel | null }[]
        }[]
    > {
        const services = await this.serviceRepository.findMany(
            { enabled: true, accountType: AccountType.MANAGED },
            ALL
        )

        const result = []

        for (const service of services) {
            const provider = this.registry.get(service.integrationProvider)

            if (!provider) {
                this.logger.warn(`Skipping '${service.name}': no registered account integration provider`)
                continue
            }

            const subscriptions = await this.subscriptionRepository.findMany({ serviceId: service.id }, ALL)
            const externalAccounts = await this.externalAccountRepository.findMany({ serviceId: service.id }, ALL)
            const accountBySubscriptionId = new Map(externalAccounts.map((a) => [a.subscriptionId, a]))

            result.push({
                provider,
                service,
                accounts: subscriptions.map((subscription) => ({
                    subscription,
                    account: accountBySubscriptionId.get(subscription.id) ?? null,
                })),
            })
        }

        return result
    }

    private async syncExternalToLocal(
        provider: IAccountIntegrationProvider,
        externalUsers: NonNullable<Awaited<ReturnType<IAccountIntegrationProvider['getAllUsers']>>>,
        accounts: { subscription: SubscriptionModel; account: ExternalUserAccountModel | null }[]
    ): Promise<void> {
        const localByExternalId = new Map(
            accounts
                .filter((a) => a.account?.externalAccountId)
                .map((a) => [a.account!.externalAccountId!, a.subscription])
        )

        // Zero local records against a populated service means a misconfiguration, not mass orphaning.
        // Deleting here would be unrecoverable, so refuse the sweep and surface it instead.
        if (localByExternalId.size === 0 && externalUsers.length > 0) {
            this.logger.error(
                `Refusing to reconcile '${provider.name}': it has ${externalUsers.length} account(s) but HomeGate ` +
                    `has no local records for it. Verify the database before running this task again.`
            )
            return
        }

        for (const externalUser of externalUsers) {
            const subscription = localByExternalId.get(externalUser.id)

            if (!subscription) {
                if (externalUser.isAdmin) {
                    continue
                }

                // Accounts only legitimately exist because HomeGate created them.
                await provider.deleteUser({
                    userServiceAccountId: externalUser.id,
                    username: externalUser.username,
                    email: undefined,
                })

                this.logger.warn(
                    `Orphaned account on '${provider.name}': deleted external user '${externalUser.username}' ` +
                        `(id: '${externalUser.id}') — no local record found`
                )
                continue
            }

            const localIsActive = subscription.status === SubscriptionStatus.active

            if (localIsActive && !externalUser.isActive) {
                await provider.enableUser({
                    userServiceAccountId: externalUser.id,
                    username: externalUser.username,
                    email: undefined,
                })

                this.logger.warn(
                    `Drift on '${provider.name}': re-enabled external user '${externalUser.username}' — ` +
                        `local record is active but the external account was disabled`
                )
                continue
            }

            if (!localIsActive && externalUser.isActive) {
                await provider.disableUser({
                    userServiceAccountId: externalUser.id,
                    username: externalUser.username,
                    email: undefined,
                })

                this.logger.warn(
                    `Drift on '${provider.name}': disabled external user '${externalUser.username}' — ` +
                        `local status is '${subscription.status}' but the external account was active`
                )
            }
        }
    }

    private async syncLocalToExternal(
        provider: IAccountIntegrationProvider,
        externalUsers: NonNullable<Awaited<ReturnType<IAccountIntegrationProvider['getAllUsers']>>>,
        accounts: { subscription: SubscriptionModel; account: ExternalUserAccountModel | null }[]
    ): Promise<void> {
        const externalById = new Map(externalUsers.map((u) => [u.id, u]))

        for (const { subscription, account } of accounts) {
            if (subscription.status !== SubscriptionStatus.active || !account?.externalAccountId) {
                continue
            }

            if (!externalById.has(account.externalAccountId)) {
                await this.subscriptionService.markSubscriptionFailed(
                    subscription.userId,
                    subscription.serviceId,
                    `External account not found on '${provider.name}' during sync`,
                    FailedOperation.sync
                )

                this.logger.warn(
                    `Active local record for user '${subscription.userId}' on '${provider.name}' has no ` +
                        `matching external account — marked as failed`
                )
            }
        }
    }

    /**
     * Retries a previously failed cancellation, expiration or sync on behalf of an admin.
     * Failed provisioning must be retried through `subscribe()` instead.
     */
    async retryFailedOperation(userId: string, serviceId: number, currentUserId: string): Promise<boolean> {
        const currentUser = await this.userService.getUserById({ userId: currentUserId })

        if (!currentUser?.isAdmin) {
            throw new BadRequestException('Unauthorized: admin access required to retry a failed operation')
        }

        const subscription = await this.subscriptionRepository.find(userId, serviceId)

        if (!subscription || subscription.status !== SubscriptionStatus.failed) {
            throw new ConflictException('Account is not in a failed state')
        }

        if (!subscription.failedOperation || subscription.failedOperation === FailedOperation.provisioning) {
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

        const provisioner = this.provisioners.resolve(service)
        const context = await this.subscriptionService.buildLifecycleContext(subscription, service, user.email)
        const { failedOperation } = subscription

        try {
            const externalStatus = await provisioner.getExternalAccountStatus(context)
            const externalMissing = externalStatus === 'missing'

            if (failedOperation === FailedOperation.cancellation) {
                if (!externalMissing) {
                    await provisioner.deprovision(context)
                }

                await this.clearFailure(userId, serviceId, SubscriptionStatus.cancelled, true)

                this.logger.log(
                    `Retry cancellation succeeded for user '${user.id}' on service '${service.id}'` +
                        (externalMissing ? ' (external account was already deleted)' : '')
                )

                return true
            }

            if (failedOperation === FailedOperation.expiration) {
                // Already-inactive accounts need no second disable call.
                if (externalStatus === 'active') {
                    await provisioner.disable(context)
                }

                await this.clearFailure(userId, serviceId, SubscriptionStatus.expired, false)

                this.logger.log(
                    `Retry expiration succeeded for user '${user.id}' on service '${service.id}'` +
                        (externalStatus === 'active' ? '' : ' (external account was already disabled or gone)')
                )

                return true
            }

            // FailedOperation.sync — the external account was missing during a sync pass.
            const status = externalMissing ? SubscriptionStatus.cancelled : SubscriptionStatus.active
            await this.clearFailure(userId, serviceId, status, externalMissing)

            this.logger.log(
                `Retry sync for user '${user.id}' on service '${service.id}': external account ` +
                    (externalMissing ? 'confirmed gone, marked as cancelled' : 'found, restored to active')
            )

            return true
        } catch (error) {
            this.logger.error(
                `Failed to retry operation '${failedOperation}' for user '${user.id}' on service '${service.id}'`,
                { stackTrace: error instanceof Error ? error.stack : String(error) }
            )

            throw error
        }
    }

    private async clearFailure(
        userId: string,
        serviceId: number,
        status: SubscriptionStatus,
        cancelled: boolean
    ): Promise<void> {
        await this.subscriptionRepository.update({
            userId,
            serviceId,
            status,
            lastError: null,
            failedAt: null,
            failedOperation: null,
            ...(cancelled && { cancelledAt: new Date() }),
        })
    }
}
