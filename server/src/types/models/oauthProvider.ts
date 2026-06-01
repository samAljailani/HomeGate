import { OAuthProviderName } from '@prisma/generated'
export { OAuthProviderName }

export type OAuthProviderModel = {
    id: number
    name: OAuthProviderName
    enabled: boolean
}

export type CreateOAuthProviderModel = Omit<OAuthProviderModel, 'id'>
