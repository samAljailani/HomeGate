export const UserStatus = {
    PENDING: 'PENDING',
    ACTIVE: 'ACTIVE',
} as const

export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus]

export type UserModel = {
    id: string
    email: string
    username: string
    firstName: string
    lastName: string
    isAdmin: boolean
    isDeleted: boolean
    isEnabled: boolean
    status: UserStatus
    createdAt: Date
}

export type CreateUserModel = Omit<UserModel, 'id' | 'isAdmin' | 'isDeleted' | 'isEnabled' | 'status' | 'createdAt'>

export type UpdateUserModel = Omit<UserModel, 'isAdmin' | 'isDeleted' | 'isEnabled' | 'status' | 'createdAt' | 'email'>

export class UserFilterOptions {
    id?: string
    email?: string
    username?: string
    firstName?: string
    lastName?: string
    isAdmin?: boolean
    isDeleted?: boolean
    isEnabled?: boolean
    status?: UserStatus
}
