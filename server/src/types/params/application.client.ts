export type ApplicationUserModel = {
    id: string // external service user id
    username: string
    isActive: boolean
}

export type CreateApplicationUserResult = {
    user: ApplicationUserModel | null
    ok: boolean
}

export type GetApplicationUserResult = {
    user: ApplicationUserModel | null
    ok: boolean
}

export type FilterApplicationUserParam = {
    username: string | undefined
    email: string | undefined
    userServiceAccountId: string | undefined
}

export type CreateApplicationUserParam = {
    username: string
    password?: string | undefined
    email?: string | undefined
    displayName?: string | undefined
}

export type UpdateApplicationUserParam = {
    username?: string
    password?: string
    email?: string
    displayName?: string
    isActive?: boolean
}

export type ApplicationUserRequirements = {
    username: boolean
    password: boolean
    email: boolean
    displayName: boolean
}
