export type UserAccountModel = {
    userId: string
    userServiceAccountId: string
    serviceId: number
    username: string
    isActive: boolean
    autoRenew: boolean
    createdAt: Date
    expiresAt: Date
}

export type CreateUserAccountModel = Omit<UserAccountModel, 'createdAt'>

export type UpdateUserAccountModel = Omit<UserAccountModel, 'createdAt'>

export class UserAccountFilterOptions {
    userId?: string
    serviceId?: number
    isActive?: boolean
}
