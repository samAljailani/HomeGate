import { BadRequestException, Inject, Injectable } from '@nestjs/common'
import { AccountType, SubscriptionStatus } from '@/types/enums'
import { ISubscriptionRepository } from '@/data/repositories'
import {
    ExternalAccountStatus,
    ISubscriptionProvisioner,
    LifecycleContext,
    ProvisionContext,
    ProvisionResult,
} from './ISubscriptionProvisioner'

/**
 * For services that authenticate against another service's account (e.g. Jellyseerr via Jellyfin).
 * There is nothing to provision; the only rule is that the account source must be active.
 */
@Injectable()
export class ReferencedAccountProvisioner implements ISubscriptionProvisioner {
    readonly accountType = AccountType.REFERENCED

    constructor(@Inject(ISubscriptionRepository) private readonly subscriptionRepository: ISubscriptionRepository) {}

    async validate(ctx: ProvisionContext): Promise<void> {
        const sourceServiceId = ctx.service.accountSourceServiceId

        if (sourceServiceId === null) {
            throw new BadRequestException(
                `Service '${ctx.service.name}' is misconfigured: a referenced service must name an account source`
            )
        }

        const source = await this.subscriptionRepository.find(ctx.user.userId, sourceServiceId)

        if (!source || source.status !== SubscriptionStatus.active) {
            throw new BadRequestException(
                `A subscription to the account provider for '${ctx.service.name}' is required before subscribing`
            )
        }
    }

    async provision(_ctx: ProvisionContext): Promise<ProvisionResult> {
        return { account: null }
    }

    async deprovision(_ctx: LifecycleContext): Promise<void> {}

    async disable(_ctx: LifecycleContext): Promise<void> {}

    async enable(_ctx: LifecycleContext): Promise<void> {}

    async resetPassword(_ctx: LifecycleContext, _newPassword: string): Promise<void> {
        throw new Error('NOT_SUPPORTED')
    }

    async getExternalAccountStatus(_ctx: LifecycleContext): Promise<ExternalAccountStatus> {
        return 'not-applicable'
    }
}
