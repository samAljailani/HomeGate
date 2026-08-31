import { AccountType } from '@/types/enums'
import { ServiceModel } from '@/types/models/service'
import { SubscriptionModel } from '@/types/models/subscription'
import { ExternalUserAccountModel } from '@/types/models/externalUserAccount'
import { ApplicationUserModel } from '@/types/params/accountIntegration'

export const SUBSCRIPTION_PROVISIONER = Symbol('SUBSCRIPTION_PROVISIONER')

export type ProvisionSubject = {
    userId: string
    email: string
}

export type ProvisionRequest = {
    username?: string | undefined
    password?: string | undefined
    email?: string | undefined
}

export type ProvisionContext = {
    user: ProvisionSubject
    service: ServiceModel
    request: ProvisionRequest
    existingSubscription: SubscriptionModel | null
    existingAccount: ExternalUserAccountModel | null
    /** Set by validate() when the previous vendor account survived, so provision() need not re-probe. */
    reusableAccount?: ApplicationUserModel | null | undefined
}

export type ProvisionedAccount = {
    externalAccountId: string | null
    username: string | null
    email: string | null
}

export type ProvisionResult = {
    /** Null when this account type owns no external account, so the orchestrator writes no account row. */
    account: ProvisionedAccount | null
}

export type LifecycleContext = {
    user: ProvisionSubject
    service: ServiceModel
    subscription: SubscriptionModel
    /** All external accounts linked to the subscription; empty when the service owns no account. */
    accounts: ExternalUserAccountModel[]
}

/** 'not-applicable' when the account type owns no external account at all. */
export type ExternalAccountStatus = 'missing' | 'active' | 'inactive' | 'not-applicable'

/**
 * Encapsulates everything account-type specific about a subscription's lifecycle.
 * Only the MANAGED implementation may touch AccountIntegrationRegistry.
 */
export interface ISubscriptionProvisioner {
    readonly accountType: AccountType

    /** Rejects the request before any side effects occur. */
    validate(ctx: ProvisionContext): Promise<void>

    provision(ctx: ProvisionContext): Promise<ProvisionResult>

    /** Permanently removes every linked external account. Skips accounts that no longer exist upstream. */
    deprovision(ctx: LifecycleContext): Promise<void>

    /** Disables every still-active linked external account. */
    disable(ctx: LifecycleContext): Promise<void>

    /** Enables every linked external account that is present upstream but not yet active. */
    enable(ctx: LifecycleContext): Promise<void>

    resetPassword(ctx: LifecycleContext, account: ExternalUserAccountModel, newPassword: string): Promise<void>

    getExternalAccountStatus(ctx: LifecycleContext, account: ExternalUserAccountModel): Promise<ExternalAccountStatus>
}
