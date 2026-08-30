import { ForbiddenException, Inject, Injectable } from '@nestjs/common'
import { IUserServicePolicyRepository } from '@/data/repositories'
import { PolicyEffect } from '@/types/enums'
import { ServiceModel } from '@/types/models/service'
import { LoggingProvider } from '@/infrastructure/logger.provider'

@Injectable()
export class ServiceAccessService {
    constructor(
        @Inject(IUserServicePolicyRepository)
        private readonly policyRepository: IUserServicePolicyRepository,
        @Inject(LoggingProvider)
        private readonly logger: LoggingProvider
    ) {
        this.logger.setContext(this.constructor.name)
    }

    /** DENY → ALLOW → service.defaultAllowed → deny. */
    async canSubscribe(userId: string, service: ServiceModel): Promise<boolean> {
        const policy = await this.policyRepository.find(userId, service.id)
        if (policy) return policy.effect === PolicyEffect.ALLOW
        return service.defaultAllowed
    }

    async assertCanSubscribe(userId: string, service: ServiceModel): Promise<void> {
        if (!(await this.canSubscribe(userId, service))) {
            this.logger.warn(
                `Access denied for user '${userId}' on service '${service.slug}' (id ${service.id}): not allowed by policy`
            )
            throw new ForbiddenException('You do not have access to this service')
        }
    }

    /** Batch-resolve access for a list of services, returning the set of allowed service IDs. */
    async resolveAccess(userId: string, services: ServiceModel[]): Promise<Map<number, boolean>> {
        const policies = await this.policyRepository.findByUserId(userId)
        const policyMap = new Map(policies.map((p) => [p.serviceId, p.effect]))

        const result = new Map<number, boolean>()
        for (const service of services) {
            const effect = policyMap.get(service.id)
            if (effect === PolicyEffect.DENY) {
                result.set(service.id, false)
            } else if (effect === PolicyEffect.ALLOW) {
                result.set(service.id, true)
            } else {
                result.set(service.id, service.defaultAllowed)
            }
        }
        return result
    }
}
