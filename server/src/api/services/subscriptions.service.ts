import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Inject,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
    forwardRef,
} from '@nestjs/common'
import { UserService } from './user.service'
import { IExternalUserAccountRepository, IServiceRepository, ISubscriptionRepository } from '@/data/repositories'
import {
    SubscriptionCreateRequestDto,
    SubscriptionPatchRequestDto,
    SubscriptionResponseDto,
} from '@/types/dtos/subscriptionsDto'
import { AccountType, FailedOperation, SubscriptionStatus } from '@/types/enums'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { SubscriptionModel } from '@/types/models/subscription'
import { ExternalUserAccountModel } from '@/types/models/externalUserAccount'
import { ServiceModel } from '@/types/models/service'
import { SubscriptionProvisionerResolver, LifecycleContext } from '@/core/subscriptions/provisioners'
import { SubscriptionCascadeService } from '@/core/subscriptions/subscriptionCascade.service'
import { ServiceAccessService } from './serviceAccess.service'

/**
 * Account-type agnostic orchestrator. It deliberately does not depend on AccountIntegrationRegistry:
 * anything integration specific belongs to a provisioner, so REFERENCED and NONE services can never
 * trigger an integration lookup.
 */
@Injectable()
export class SubscriptionService {
    constructor(
        @Inject(forwardRef(() => UserService))
        private readonly userService: UserService,

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

        @Inject(ServiceAccessService)
        private readonly accessService: ServiceAccessService,

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

        await this.accessService.assertCanSubscribe(userId, service)

        const existing = await this.subscriptionRepository.find(userId, request.serviceId)

        if (existing && !this.isResubscribeAllowed(existing)) {
            if (existing.status === SubscriptionStatus.disabled) {
                throw new ConflictException('User is not allowed to subscribe')
            }

            throw new ConflictException('User already subscribed to the service')
        }

        const existingAccount = existing
            ? await this.externalAccountRepository.findBySubscriptionId(existing.id)
            : null

        const provisioner = this.provisioners.resolve(service)
        const context = {
            user: { userId, email: user.email },
            service,
            request: {
                username: request.serviceUsername,
                password: request.servicePassword,
                email: request.email,
            },
            existingSubscription: existing,
            existingAccount,
        }

        await provisioner.validate(context)

        const expiresAt = this.getDefaultExpirationDate()
        const subscription = await this.upsertProvisioning(existing, userId, request.serviceId, request.autoRenew, expiresAt)

        try {
            const result = await provisioner.provision(context)

            if (result.account) {
                await this.upsertExternalAccount(subscription, result.account)
            }

            const activated = await this.subscriptionRepository.update({
                userId,
                serviceId: request.serviceId,
                status: SubscriptionStatus.active,
                provisionedAt: new Date(),
                lastError: null,
                failedAt: null,
                failedOperation: null,
            })

            if (!activated) {
                throw new InternalServerErrorException('Failed to activate subscription')
            }

            this.logger.log(`User '${userId}' subscribed to service '${service.id}' (${service.accountType})`)

            if (service.accountType === AccountType.MANAGED) {
                await this.cascade.onActivated(activated)
            }

            return this.mapSubscription(activated, result.account?.username ?? existingAccount?.username ?? null)
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

    private async upsertProvisioning(
        existing: SubscriptionModel | null,
        userId: string,
        serviceId: number,
        autoRenew: boolean | undefined,
        expiresAt: Date
    ): Promise<SubscriptionModel> {
        if (!existing) {
            const created = await this.subscriptionRepository.create({
                userId,
                serviceId,
                status: SubscriptionStatus.provisioning,
                ...(autoRenew !== undefined && { autoRenew }),
                expiresAt,
            })

            if (!created) {
                throw new InternalServerErrorException('Failed to create subscription record')
            }

            return created
        }

        const updated = await this.subscriptionRepository.update({
            userId,
            serviceId,
            status: SubscriptionStatus.provisioning,
            ...(autoRenew !== undefined && { autoRenew }),
            expiresAt,
            lastError: null,
            failedAt: null,
            cancelledAt: null,
        })

        if (!updated) {
            throw new InternalServerErrorException('Failed to update subscription record')
        }

        return updated
    }

    private async upsertExternalAccount(
        subscription: SubscriptionModel,
        account: { externalAccountId: string | null; username: string | null; email: string | null }
    ): Promise<void> {
        const existing = await this.externalAccountRepository.findBySubscriptionId(subscription.id)

        if (existing) {
            await this.externalAccountRepository.update({ subscriptionId: subscription.id, ...account })
            return
        }

        await this.externalAccountRepository.create({
            subscriptionId: subscription.id,
            userId: subscription.userId,
            serviceId: subscription.serviceId,
            ...account,
        })
    }

    async delete(subscriptionId: string, currentUserId: string, deleteImmediately?: boolean): Promise<boolean> {
        const subscription = await this.getRawById(subscriptionId)

        const [user, currentUser] = await Promise.all([
            this.userService.getUserById({ userId: subscription.userId }),
            this.userService.getUserById({ userId: currentUserId }),
        ])

        if (!user || !currentUser) {
            throw new BadRequestException(`User does not exist, userId: ${currentUserId}`)
        }

        if (!currentUser.isAdmin && currentUserId !== subscription.userId) {
            throw new BadRequestException('A non-admin user cannot delete a subscription for another user.')
        }

        const service = await this.serviceRepository.findById(subscription.serviceId)

        if (!service) {
            throw new BadRequestException('Service does not exist')
        }

        if (!this.isCurrentlyActive(subscription)) {
            throw new ConflictException('User is not subscribed to the service')
        }

        try {
            if (deleteImmediately !== true) {
                if (subscription.autoRenew) {
                    const updated = await this.subscriptionRepository.update({
                        userId: subscription.userId,
                        serviceId: subscription.serviceId,
                        autoRenew: false,
                    })

                    if (!updated) {
                        throw new InternalServerErrorException(
                            `Failed to cancel auto-renew for user '${user.id}' and service '${service.id}'`
                        )
                    }

                    this.logger.log(
                        `User '${user.id}' cancelled auto-renew for service '${service.id}'. ` +
                            `Access remains active until ${updated.expiresAt?.toISOString()}`
                    )

                    return true
                }

                this.logger.log(`User '${user.id}' already had auto-renew disabled for service '${service.id}'`)

                return true
            }

            await this.subscriptionRepository.update({
                userId: subscription.userId,
                serviceId: subscription.serviceId,
                status: SubscriptionStatus.cancelling,
            })

            const context = await this.buildLifecycleContext(subscription, service, user.email)
            await this.provisioners.resolve(service).deprovision(context)

            const cancelled = await this.subscriptionRepository.update({
                userId: subscription.userId,
                serviceId: subscription.serviceId,
                status: SubscriptionStatus.cancelled,
                cancelledAt: new Date(),
                lastError: null,
            })

            if (context.account) {
                await this.externalAccountRepository.delete(subscription.id)
            }

            // Cancelling a referenced subscription must never affect its account source.
            if (cancelled) {
                await this.cascade.onDeactivated(cancelled, SubscriptionStatus.cancelled)
            }

            this.logger.log(`User '${user.id}' immediately cancelled subscription for service '${service.id}'`)

            return true
        } catch (error) {
            this.logger.error(`Failed to cancel subscription for user '${user.id}' and service '${service.id}'`, {
                stackTrace: error instanceof Error ? error.stack : String(error),
            })

            await this.markSubscriptionFailed(
                subscription.userId,
                subscription.serviceId,
                this.toSafeErrorMessage(error),
                FailedOperation.cancellation
            )

            return false
        }
    }

    async getById(subscriptionId: string): Promise<SubscriptionResponseDto> {
        const subscription = await this.getRawById(subscriptionId)
        const [details] = await this.hydrateSubscriptionDetails([subscription])

        return details!
    }

    private async getRawById(subscriptionId: string): Promise<SubscriptionModel> {
        const subscription = await this.subscriptionRepository.findById(subscriptionId)

        if (!subscription) {
            throw new NotFoundException('Subscription not found')
        }

        return subscription
    }

    /**
     * Applies a partial state update (policy object) to a subscription.
     * - `enabled` transitions between active and disabled, including the external account when there is one.
     * - `autoRenew` toggles automatic renewal.
     */
    async update(subscriptionId: string, patch: SubscriptionPatchRequestDto): Promise<SubscriptionResponseDto> {
        if (patch.enabled === undefined && patch.autoRenew === undefined) {
            throw new BadRequestException('No fields provided to update')
        }

        const subscription = await this.getRawById(subscriptionId)

        if (patch.enabled !== undefined) {
            const status = patch.enabled ? SubscriptionStatus.active : SubscriptionStatus.disabled
            await this.setDisabledStatus(subscription.userId, subscription.serviceId, status)
        }

        if (patch.autoRenew !== undefined) {
            const updated = await this.subscriptionRepository.update({
                userId: subscription.userId,
                serviceId: subscription.serviceId,
                autoRenew: patch.autoRenew,
            })

            if (!updated) {
                throw new BadRequestException('Failed to update auto-renew')
            }

            this.logger.log(`Admin set autoRenew=${patch.autoRenew} for subscription '${subscriptionId}'`)
        }

        return this.getById(subscriptionId)
    }

    /** Toggles auto-renew for the subscription owner (self-service). Admins use `update`. */
    async setAutoRenew(
        subscriptionId: string,
        currentUserId: string,
        autoRenew: boolean
    ): Promise<SubscriptionResponseDto> {
        const subscription = await this.getRawById(subscriptionId)

        if (subscription.userId !== currentUserId) {
            throw new ForbiddenException('You can only modify your own subscription')
        }

        const updated = await this.subscriptionRepository.update({
            userId: subscription.userId,
            serviceId: subscription.serviceId,
            autoRenew,
        })

        if (!updated) {
            throw new BadRequestException('Failed to update auto-renew')
        }

        this.logger.log(`User '${currentUserId}' set autoRenew=${autoRenew} for subscription '${subscriptionId}'`)

        return this.getById(subscriptionId)
    }

    /** Resets the external account password. Rejected for account types that own no account. */
    async resetAccountPassword(
        subscriptionId: string,
        currentUserId: string,
        newPassword: string
    ): Promise<boolean> {
        const subscription = await this.getRawById(subscriptionId)

        if (subscription.userId !== currentUserId) {
            throw new ForbiddenException('You can only reset a password on your own subscription')
        }

        const service = await this.serviceRepository.findById(subscription.serviceId)

        if (!service) {
            throw new BadRequestException('Service does not exist')
        }

        if (service.accountType !== AccountType.MANAGED) {
            throw new BadRequestException('This subscription has no password to reset')
        }

        const user = await this.userService.getUserById({ userId: subscription.userId })

        if (!user) {
            throw new BadRequestException('User does not exist')
        }

        const context = await this.buildLifecycleContext(subscription, service, user.email)
        await this.provisioners.resolve(service).resetPassword(context, newPassword)

        this.logger.log(`User '${currentUserId}' reset password for subscription '${subscriptionId}'`)

        return true
    }

    async renew(subscriptionId: string): Promise<SubscriptionResponseDto> {
        const subscription = await this.getRawById(subscriptionId)

        const baseDate =
            subscription.expiresAt && subscription.expiresAt.getTime() > Date.now()
                ? subscription.expiresAt
                : new Date()
        const newExpiresAt = this.getDefaultExpirationDate(baseDate)

        const updated = await this.subscriptionRepository.update({
            userId: subscription.userId,
            serviceId: subscription.serviceId,
            expiresAt: newExpiresAt,
            lastError: null,
        })

        if (!updated) {
            throw new BadRequestException('Failed to renew subscription')
        }

        await this.cascade.onExpiryChanged(updated)

        this.logger.log(
            `Admin renewed subscription '${subscriptionId}' for user '${subscription.userId}' on service ` +
                `'${subscription.serviceId}'. New expiry: ${newExpiresAt.toISOString()}`
        )

        const [details] = await this.hydrateSubscriptionDetails([updated])

        return details!
    }

    async listAll(take?: number, skip?: number): Promise<SubscriptionResponseDto[]> {
        const subscriptions = await this.subscriptionRepository.findMany({}, take, skip)

        return this.hydrateSubscriptionDetails(subscriptions)
    }

    async listByUser(userId: string, take?: number, skip?: number): Promise<SubscriptionResponseDto[]> {
        const subscriptions = await this.subscriptionRepository.findMany({ userId }, take, skip)

        return this.hydrateSubscriptionDetails(subscriptions)
    }

    /** Transitions a subscription between active and disabled, including the external account. */
    async setDisabledStatus(userId: string, serviceId: number, status: SubscriptionStatus): Promise<boolean> {
        const isDisableOperation = status === SubscriptionStatus.disabled

        const user = await this.userService.getUserById({ userId })

        if (!user) {
            throw new BadRequestException(`User does not exist, userId: ${userId}`)
        }

        const service = await this.serviceRepository.findById(serviceId)

        if (!service) {
            throw new BadRequestException('Service does not exist')
        }

        const subscription = await this.subscriptionRepository.find(userId, serviceId)

        if (!subscription) {
            throw new ConflictException('User is not subscribed to the service')
        }

        if (isDisableOperation && !this.isCurrentlyActive(subscription)) {
            throw new ConflictException('User account is not currently active')
        }

        if (!isDisableOperation && subscription.status !== SubscriptionStatus.disabled) {
            throw new ConflictException('User account is not currently disabled')
        }

        const provisioner = this.provisioners.resolve(service)
        const context = await this.buildLifecycleContext(subscription, service, user.email)
        const operationLabel = isDisableOperation ? 'disable' : 'enable'

        try {
            await this.subscriptionRepository.update({
                userId,
                serviceId,
                status: isDisableOperation ? SubscriptionStatus.disabling : SubscriptionStatus.enabling,
            })

            if (isDisableOperation) {
                await provisioner.disable(context)
            } else {
                // A vanished external account means the local record is stale and should go.
                if ((await provisioner.getExternalAccountStatus(context)) === 'missing' && context.account !== null) {
                    await this.subscriptionRepository.delete(userId, serviceId)

                    this.logger.warn(
                        `External account for user '${user.id}' on service '${service.id}' no longer exists. ` +
                            `Stale local record deleted.`
                    )

                    return true
                }

                await provisioner.enable(context)
            }

            const updated = await this.subscriptionRepository.update({
                userId,
                serviceId,
                status,
                lastError: null,
            })

            if (updated) {
                if (isDisableOperation) {
                    await this.cascade.onDeactivated(updated, SubscriptionStatus.disabled)
                } else {
                    await this.cascade.onReactivated(updated)
                }
            }

            this.logger.log(`User '${user.id}' subscription for service '${service.id}' was ${operationLabel}d`)

            return true
        } catch (error) {
            this.logger.error(
                `Failed to ${operationLabel} subscription for user '${user.id}' and service '${service.id}'`,
                { stackTrace: error instanceof Error ? error.stack : String(error) }
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

    async buildLifecycleContext(
        subscription: SubscriptionModel,
        service: ServiceModel,
        email: string,
        account?: ExternalUserAccountModel | null
    ): Promise<LifecycleContext> {
        const resolved =
            account !== undefined
                ? account
                : service.accountType === AccountType.MANAGED
                ? await this.externalAccountRepository.findBySubscriptionId(subscription.id)
                : null

        return {
            user: { userId: subscription.userId, email },
            service,
            subscription,
            account: resolved ?? null,
        }
    }

    async markSubscriptionFailed(
        userId: string,
        serviceId: number,
        lastError: string,
        failedOperation: FailedOperation
    ): Promise<void> {
        await this.subscriptionRepository.update({
            userId,
            serviceId,
            status: SubscriptionStatus.failed,
            failedAt: new Date(),
            failedOperation,
            lastError,
        })
    }

    // #region Mappers

    private mapSubscription(model: SubscriptionModel, username: string | null): SubscriptionResponseDto {
        return {
            id: model.id,
            userId: model.userId,
            serviceId: model.serviceId,
            username,
            status: model.status,
            autoRenew: model.autoRenew,
            createdAt: model.createdAt,
            updatedAt: model.updatedAt,
            expiresAt: model.expiresAt,
            provisionedAt: model.provisionedAt,
            cancelledAt: model.cancelledAt,
        }
    }

    /** Batch-resolves owner, service and external account details for listings. */
    private async hydrateSubscriptionDetails(
        subscriptions: SubscriptionModel[]
    ): Promise<SubscriptionResponseDto[]> {
        const userIds = [...new Set(subscriptions.map((s) => s.userId))]
        const serviceIds = [...new Set(subscriptions.map((s) => s.serviceId))]

        const [users, services, accounts] = await Promise.all([
            Promise.all(userIds.map((id) => this.userService.getUserById({ userId: id }))),
            Promise.all(serviceIds.map((id) => this.serviceRepository.findById(id))),
            Promise.all(
                subscriptions.map((s) => this.externalAccountRepository.findBySubscriptionId(s.id))
            ),
        ])

        const userMap = new Map(users.filter((u) => u != null).map((u) => [u.id, u]))
        const serviceMap = new Map(services.filter((s) => s != null).map((s) => [s.id, s]))
        const accountMap = new Map(
            accounts.filter((a) => a != null).map((a) => [a.subscriptionId, a])
        )

        return subscriptions.map((subscription) => {
            const user = userMap.get(subscription.userId)
            const service = serviceMap.get(subscription.serviceId)
            const account = accountMap.get(subscription.id)

            return {
                ...this.mapSubscription(subscription, account?.username ?? null),
                ...(user ? { userUsername: user.username, userEmail: user.email } : {}),
                ...(service ? { serviceName: service.name } : {}),
            }
        })
    }

    // #endregion Mappers

    isCurrentlyActive(subscription: SubscriptionModel): boolean {
        return (
            subscription.status === SubscriptionStatus.active &&
            !!subscription.expiresAt &&
            subscription.expiresAt.getTime() > Date.now()
        )
    }

    getDefaultExpirationDate(startTime?: Date): Date {
        const expiresAt = startTime ? new Date(startTime.getTime()) : new Date()
        expiresAt.setDate(expiresAt.getDate() + 30)

        return expiresAt
    }

    toSafeErrorMessage(error: unknown): string {
        if (error instanceof Error) {
            return error.message
        }

        return 'Unknown subscription error'
    }

    private isResubscribeAllowed(subscription: SubscriptionModel | null): boolean {
        if (subscription === null) return false
        if (subscription.status === SubscriptionStatus.active) return false
        if (subscription.status === SubscriptionStatus.failed) {
            return subscription.failedOperation === FailedOperation.provisioning
        }

        return [SubscriptionStatus.cancelled, SubscriptionStatus.expired].includes(subscription.status)
    }
}
