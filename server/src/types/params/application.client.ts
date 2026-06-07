export type ApplicationUserModel = {
    id: string // external service user id
    username: string
    isActive: boolean
}

export type CreateApplicationUserParam = {
    username: string
    password?: string
    displayName?: string
}

export type UpdateApplicationUserParam = {
    username?: string
    password?: string
    displayName?: string
    isActive?: boolean
}
