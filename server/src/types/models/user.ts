export const UserStatus = {
    ACTIVE: 'ACTIVE',
    PENDING: 'PENDING',
    DISABLED: 'DISABLED',
    DELETED: 'DELETED'
} as const

export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus]

export type UserStatusCountModel = {
    status: UserStatus
    count: number
}

export type UserModel = {
    id: string
    email: string
    username: string
    firstName: string
    lastName: string
    isAdmin: boolean
    status: UserStatus
    avatarUrl: string | null
    createdAt: Date
}

export type CreateUserModel = Omit<UserModel, 'id' | 'isAdmin' | 'isDeleted' | 'isEnabled' | 'status' | 'createdAt' | 'avatarUrl'> & {
    avatarUrl?: string | null
}

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
