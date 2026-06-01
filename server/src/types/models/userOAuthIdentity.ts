export type UserOAuthIdentityModel = {
    id: string
    userId: string
    providerId: number
    profileId: string
    createdAt: Date
}

export type CreateUserOAuthIdentityModel = Omit<UserOAuthIdentityModel, 'id' | 'createdAt'>

export type UpdateUserOAuthIdentityModel = Omit<UserOAuthIdentityModel, 'createdAt'>
