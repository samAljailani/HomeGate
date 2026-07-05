import { UserAccountStatus } from '@/types/enums'

export type UserAccountModel = {
    userId: string
    serviceId: number

    userServiceAccountId: string | null
    username: string

    status: UserAccountStatus
    autoRenew: boolean

    createdAt: Date
    updatedAt: Date

    expiresAt: Date | null
    provisionedAt: Date | null
    failedAt: Date | null
    cancelledAt: Date | null

    lastError: string | null
    retryCount: number
}

export type CreateUserAccountModel = {
    userId: string
    serviceId: number
    userServiceAccountId: string | null
    username: string

    expiresAt?: Date | null
    autoRenew?: boolean

    status: UserAccountStatus
}

export type UpdateUserAccountModel = {
    userId: string
    serviceId: number

    userServiceAccountId?: string | null
    username?: string
    status?: UserAccountStatus
    autoRenew?: boolean

    expiresAt?: Date | null
    provisionedAt?: Date | null
    failedAt?: Date | null
    cancelledAt?: Date | null

    lastError?: string | null
    retryCount?: number
}

export type UserAccountFilterOptions = {
    userId?: string
    serviceId?: number
    username?: string
    status?: UserAccountStatus
    statuses?: UserAccountStatus[]
    expiresBefore?: Date
    expiresAfter?: Date
}
