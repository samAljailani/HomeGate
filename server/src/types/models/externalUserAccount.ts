export type ExternalUserAccountModel = {
    id: string
    subscriptionId: string
    userId: string
    serviceId: number

    externalAccountId: string | null
    username: string | null
    email: string | null

    createdAt: Date
    updatedAt: Date
}

export type CreateExternalUserAccountModel = {
    subscriptionId: string
    userId: string
    serviceId: number

    externalAccountId?: string | null
    username?: string | null
    email?: string | null
}

export type UpdateExternalUserAccountModel = {
    subscriptionId: string

    externalAccountId?: string | null
    username?: string | null
    email?: string | null
}

export type ExternalUserAccountFilterOptions = {
    userId?: string
    serviceId?: number
    subscriptionId?: string
    username?: string
    externalAccountId?: string
}
