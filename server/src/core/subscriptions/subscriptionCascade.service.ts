import { Inject, Injectable } from '@nestjs/common'
import { AccountType, SubscriptionStatus } from '@/types/enums'
import { IServiceRepository, ISubscriptionRepository } from '@/data/repositories'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { SubscriptionModel } from '@/types/models/subscription'
import { ServiceModel } from '@/types/models/service'

/**
 * Propagates state between a MANAGED subscription and the REFERENCED subscriptions that draw on it,
 * and owns the entitlement clamp. A referenced subscription can never outlive its account source.
 */
@Injectable()
export class SubscriptionCascadeService {
    constructor(
        @Inject(ISubscriptionRepository) private readonly subscriptionRepository: ISubscriptionRepository,
        @Inject(IServiceRepository) private readonly serviceRepository: IServiceRepository,
        @Inject(LoggingProvider) private readonly logger: LoggingProvider
    ) {
        this.logger.setContext(this.constructor.name)
    }

    /**
     * Effective expiry is the earlier of the subscription's own expiry and its source's, and the
     * entitlement only stands while the source is active.
     */
    async resolveEffectiveEntitlement(
        subscription: SubscriptionModel
    ): Promise<{ active: boolean; expiresAt: Date | null }> {
        const ownActive = subscription.status === SubscriptionStatus.active
        const notExpired = subscription.expiresAt === null || subscription.expiresAt.getTime() > Date.now()

        if (subscription.derivedFromSubscriptionId === null) {
            return { active: ownActive && notExpired, expiresAt: subscription.expiresAt }
        }

        const source = await this.subscriptionRepository.findById(subscription.derivedFromSubscriptionId)

        if (!source) {
            return { active: false, expiresAt: subscription.expiresAt }
        }

        const expiresAt = this.earliest(subscription.expiresAt, source.expiresAt)
        const sourceActive =
            source.status === SubscriptionStatus.active &&
            (source.expiresAt === null || source.expiresAt.getTime() > Date.now())

        return {
            active: ownActive && notExpired && sourceActive,
            expiresAt,
        }
    }

    private earliest(a: Date | null, b: Date | null): Date | null {
        if (a === null) return b
        if (b === null) return a

        return a.getTime() <= b.getTime() ? a : b
    }

    /** Creates subscriptions for every REFERENCED service that draws on the newly activated service. */
    async onActivated(source: SubscriptionModel): Promise<void> {
        const referencing = await this.serviceRepository.findMany(
            { accountSourceServiceId: source.serviceId, enabled: true },
            Number.MAX_SAFE_INTEGER
        )

        for (const service of referencing) {
            if (service.accountType !== AccountType.REFERENCED) {
                continue
            }

            const existing = await this.subscriptionRepository.find(source.userId, service.id)

            if (existing) {
                await this.subscriptionRepository.update({
                    userId: source.userId,
                    serviceId: service.id,
                    status: SubscriptionStatus.active,
                    expiresAt: source.expiresAt,
                    autoRenew: source.autoRenew,
                    derivedFromSubscriptionId: source.id,
                    cancelledAt: null,
                    lastError: null,
                    failedAt: null,
                })
            } else {
                await this.subscriptionRepository.create({
                    userId: source.userId,
                    serviceId: service.id,
                    status: SubscriptionStatus.active,
                    expiresAt: source.expiresAt,
                    autoRenew: source.autoRenew,
                    derivedFromSubscriptionId: source.id,
                    provisionedAt: new Date(),
                })
            }

            this.logger.log(
                `Derived subscription for user '${source.userId}' on referenced service '${service.id}' is active`
            )
        }
    }

    /**
     * Mirrors the account source's live subscriptions onto a newly created REFERENCED service, so
     * existing subscribers gain access without a manual sign-up. Returns the affected user IDs.
     */
    async onReferencedServiceCreated(
        service: Pick<ServiceModel, 'id' | 'slug' | 'accountSourceServiceId'>
    ): Promise<string[]> {
        const sourceServiceId = service.accountSourceServiceId
        if (sourceServiceId === null) return []

        const now = Date.now()
        const sources = await this.subscriptionRepository.findMany(
            { serviceId: sourceServiceId, status: SubscriptionStatus.active },
            Number.MAX_SAFE_INTEGER
        )

        const impacted = new Set<string>()

        for (const source of sources) {
            if (source.expiresAt !== null && source.expiresAt.getTime() <= now) {
                continue
            }

            const existing = await this.subscriptionRepository.find(source.userId, service.id)

            if (existing) {
                await this.subscriptionRepository.update({
                    userId: source.userId,
                    serviceId: service.id,
                    status: SubscriptionStatus.active,
                    autoRenew: source.autoRenew,
                    expiresAt: source.expiresAt,
                    derivedFromSubscriptionId: source.id,
                    cancelledAt: null,
                    lastError: null,
                    failedAt: null,
                })
            } else {
                await this.subscriptionRepository.create({
                    userId: source.userId,
                    serviceId: service.id,
                    status: SubscriptionStatus.active,
                    autoRenew: source.autoRenew,
                    expiresAt: source.expiresAt,
                    derivedFromSubscriptionId: source.id,
                    provisionedAt: new Date(),
                })
            }

            impacted.add(source.userId)
            this.logger.log(
                `Derived subscription for user '${source.userId}' on referenced service '${service.slug}' mirrors account source`
            )
        }

        return [...impacted]
    }

    /** Applies a terminal or paused status to everything derived from this subscription. */
    async onDeactivated(source: SubscriptionModel, status: SubscriptionStatus): Promise<void> {
        const derived = await this.findDerived(source.id)

        for (const subscription of derived) {
            await this.subscriptionRepository.update({
                userId: subscription.userId,
                serviceId: subscription.serviceId,
                status,
                ...(status === SubscriptionStatus.cancelled && { cancelledAt: new Date() }),
            })

            this.logger.log(
                `Derived subscription '${subscription.id}' cascaded to '${status}' from source '${source.id}'`
            )
        }
    }

    /** Restores derived subscriptions when the source becomes active again, re-clamping expiry. */
    async onReactivated(source: SubscriptionModel): Promise<void> {
        const derived = await this.findDerived(source.id)

        for (const subscription of derived) {
            await this.subscriptionRepository.update({
                userId: subscription.userId,
                serviceId: subscription.serviceId,
                status: SubscriptionStatus.active,
                expiresAt: this.earliest(subscription.expiresAt, source.expiresAt),
                cancelledAt: null,
                lastError: null,
                failedAt: null,
            })

            this.logger.log(`Derived subscription '${subscription.id}' reactivated from source '${source.id}'`)
        }
    }

    /** Re-clamps derived expiry after the source renews or expires. */
    async onExpiryChanged(source: SubscriptionModel): Promise<void> {
        const derived = await this.findDerived(source.id)

        for (const subscription of derived) {
            const clamped = this.earliest(subscription.expiresAt, source.expiresAt)

            if (clamped?.getTime() === subscription.expiresAt?.getTime()) {
                continue
            }

            await this.subscriptionRepository.update({
                userId: subscription.userId,
                serviceId: subscription.serviceId,
                expiresAt: source.expiresAt,
            })
        }
    }

    private async findDerived(sourceSubscriptionId: string): Promise<SubscriptionModel[]> {
        return this.subscriptionRepository.findMany(
            { derivedFromSubscriptionId: sourceSubscriptionId },
            Number.MAX_SAFE_INTEGER
        )
    }
}
