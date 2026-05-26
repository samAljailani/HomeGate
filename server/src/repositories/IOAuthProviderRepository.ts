import { OAuthProvider } from '@prisma/generated'

import { OAuthProviderFilterOptions, OAuthProviderLoadRequestDto } from '@/types/dtos/oauthProviderDto'

export const IOAuthProviderRepository = Symbol('IOAuthProviderRepository')

export interface IOAuthProviderRepository {
    get(request: OAuthProviderLoadRequestDto): Promise<OAuthProvider | null>
    getByName(name: string): Promise<OAuthProvider | null>
    getMany(filter: OAuthProviderFilterOptions): Promise<OAuthProvider[]>
}
