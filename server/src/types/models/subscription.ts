import { FailedOperation, SubscriptionStatus } from '@/types/enums'

export type SubscriptionModel = {
    id: string
    userId: string
    serviceId: number

    status: SubscriptionStatus
    autoRenew: boolean

    /** Set when this subscription was created automatically from a REFERENCED service's account source. */
    derivedFromSubscriptionId: string | null

    createdAt: Date
    updatedAt: Date

    expiresAt: Date | null
    provisionedAt: Date | null
    failedAt: Date | null
    cancelledAt: Date | null

    lastError: string | null
    failedOperation: FailedOperation | null
    retryCount: number
}

export type CreateSubscriptionModel = {
    userId: string
    serviceId: number

    status: SubscriptionStatus
    autoRenew?: boolean
    expiresAt?: Date | null

    derivedFromSubscriptionId?: string | null
    provisionedAt?: Date | null
}

export type UpdateSubscriptionModel = {
    userId: string
    serviceId: number

    status?: SubscriptionStatus
    autoRenew?: boolean

    derivedFromSubscriptionId?: string | null

    expiresAt?: Date | null
    provisionedAt?: Date | null
    failedAt?: Date | null
    cancelledAt?: Date | null

    lastError?: string | null
    failedOperation?: FailedOperation | null
    retryCount?: number
}

export type SubscriptionFilterOptions = {
    userId?: string
    serviceId?: number
    serviceIds?: number[]
    status?: SubscriptionStatus
    statuses?: SubscriptionStatus[]
    derivedFromSubscriptionId?: string
    expiresBefore?: Date
    expiresAfter?: Date
}
