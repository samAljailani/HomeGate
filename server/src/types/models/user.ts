export type UserModel = {
    id: string
    email: string
    username: string
    firstName: string
    lastName: string
    isAdmin: boolean
    isDeleted: boolean
    createdAt: Date
}

export type CreateUserModel = Omit<UserModel, 'id' | 'isAdmin' | 'isDeleted' | 'createdAt'>

export type UpdateUserModel = Omit<UserModel, 'isAdmin' | 'isDeleted' | 'createdAt' | 'email'>

export class UserFilterOptions {
    id?: string
    email?: string
    username?: string
    firstName?: string
    lastName?: string
    isAdmin?: boolean
    isDeleted?: boolean
}
