import { Inject, Injectable } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { IServiceRepository, ISubscriptionRepository } from '@/data/repositories'
import { ServiceAccessService } from './serviceAccess.service'
import { SubscriptionCascadeService } from '@/core/subscriptions/subscriptionCascade.service'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { AppEvent } from '@/types/enums'
import { ServiceModel } from '@/types/models/service'

type CacheEntry = { allowed: boolean; cachedAt: number }

const CACHE_TTL_MS = 5 * 60 * 1000

@Injectable()
export class ForwardAuthService {
    private readonly cache = new Map<string, CacheEntry>()

    constructor(
        @Inject(IServiceRepository) private readonly serviceRepository: IServiceRepository,
        @Inject(ISubscriptionRepository) private readonly subscriptionRepository: ISubscriptionRepository,
        @Inject(ServiceAccessService) private readonly accessService: ServiceAccessService,
        @Inject(SubscriptionCascadeService) private readonly cascade: SubscriptionCascadeService,
        @Inject(LoggingProvider) private readonly logger: LoggingProvider
    ) {
        this.logger.setContext(this.constructor.name)
    }

    /** Resolve the service whose `url` matches the given hostname. */
    async resolveService(hostname: string): Promise<ServiceModel | null> {
        const services = await this.serviceRepository.findEnabled()

        for (const service of services) {
            if (!service.url) continue
            try {
                const serviceHost = new URL(service.url).hostname
                if (serviceHost === hostname) return service
            } catch {
                // malformed URL — skip
            }
        }
        return null
    }

    /** Check if the user has an active, entitled subscription and passes the access policy. */
    async isAuthorized(userId: string, service: ServiceModel): Promise<boolean> {
        const key = `${userId}:${service.id}`
        const cached = this.cache.get(key)

        if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
            return cached.allowed
        }

        const allowed = await this.evaluateAccess(userId, service)
        this.cache.set(key, { allowed, cachedAt: Date.now() })
        return allowed
    }

    private async evaluateAccess(userId: string, service: ServiceModel): Promise<boolean> {
        if (!(await this.accessService.canSubscribe(userId, service))) {
            return false
        }

        const subscription = await this.subscriptionRepository.find(userId, service.id)
        if (!subscription) return false

        const entitlement = await this.cascade.resolveEffectiveEntitlement(subscription)
        return entitlement.active
    }

    @OnEvent(AppEvent.SUBSCRIPTION_CHANGED, { async: true })
    @OnEvent(AppEvent.SERVICE_POLICY_CHANGED, { async: true })
    handleInvalidation(payload: { userId: string }): void {
        const prefix = `${payload.userId}:`
        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) {
                this.cache.delete(key)
            }
        }
    }
}
