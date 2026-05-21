import { UserOAuthIdentity } from '@prisma/generated';
import { OAuthIdentityCreateRequestDto, OAuthIdentityDeleteRequestDto, OAuthIdentityFilterOptions, OAuthIdentityLoadRequestDto } from '@/types/dtos/userOAuthIdentityDto';

export const IUserOAuthIdentityRepository = Symbol('IUserOAuthIdentityRepository');

export interface IUserOAuthIdentityRepository {
    get(request: OAuthIdentityLoadRequestDto): Promise<UserOAuthIdentity | null>;
    getMany(filter: OAuthIdentityFilterOptions, take?: number): Promise<UserOAuthIdentity[]>;
    post(request: OAuthIdentityCreateRequestDto): Promise<UserOAuthIdentity | null>;
    delete(request: OAuthIdentityDeleteRequestDto): Promise<void>;
    existsByProviderAndProfileId(provider_id: number, profile_id: string): Promise<boolean>;
    getByUsername(username: string): Promise<UserOAuthIdentity[]>;
}
