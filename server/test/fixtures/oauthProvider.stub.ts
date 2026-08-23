import { OAuthProviderModel } from '@/types/models/oauthProvider'
import { OAuthProviderName } from '@prisma/generated'

export function createOAuthProviderFixture(overrides: Partial<OAuthProviderModel> = {}): OAuthProviderModel {
    return {
        id: 1,
        name: OAuthProviderName.google,
        enabled: true,
        ...overrides,
    }
}
