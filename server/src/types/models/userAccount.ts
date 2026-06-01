export type UserAccountModel = {
    userId: string
    serviceId: number
    username: string
    isActive: boolean
    createdAt: Date
}

export type CreateUserAccountModel = Omit<UserAccountModel, 'createdAt'>

export type UpdateUserAccountModel = Omit<UserAccountModel, 'createdAt'>

export class UserAccountFilterOptions {
    userId?: string
    serviceId?: number
    isActive?: boolean
}
