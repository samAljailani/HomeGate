import { Injectable } from '@nestjs/common'
import { AccountType } from '@/types/enums'
import {
    ExternalAccountStatus,
    ISubscriptionProvisioner,
    LifecycleContext,
    ProvisionContext,
    ProvisionResult,
} from './ISubscriptionProvisioner'

/**
 * For services HomeGate holds no account for at all. The subscription is purely an access grant,
 * so every lifecycle hook is a no-op and no integration is ever consulted.
 */
@Injectable()
export class NoAccountProvisioner implements ISubscriptionProvisioner {
    readonly accountType = AccountType.NONE

    async validate(_ctx: ProvisionContext): Promise<void> {}

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
