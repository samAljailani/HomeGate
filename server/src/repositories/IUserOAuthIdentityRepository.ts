import {
    CreateUserOAuthIdentityModel,
    UserOAuthIdentityModel,
    OAuthIdentityFilterOptions,
} from '@/types/models/userOAuthIdentity'

export const IUserOAuthIdentityRepository = Symbol('IUserOAuthIdentityRepository')

export interface IUserOAuthIdentityRepository {
    find(providerId: number, profileId: string): Promise<UserOAuthIdentityModel | null>
    findByUsername(username: string): Promise<UserOAuthIdentityModel[]>
    findMany(filter: OAuthIdentityFilterOptions, take?: number): Promise<UserOAuthIdentityModel[]>
    create(request: CreateUserOAuthIdentityModel): Promise<UserOAuthIdentityModel | null>
    delete(providerId: number, profileId: string): Promise<void>
    identityExists(providerId: number, profileId: string): Promise<boolean>
}
