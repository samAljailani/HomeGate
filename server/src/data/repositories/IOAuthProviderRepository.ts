import { OAuthProviderModel, OAuthProviderFilterOptions } from '@/types/models/oauthProvider'

export const IOAuthProviderRepository = Symbol('IOAuthProviderRepository')

export interface IOAuthProviderRepository {
    findById(id: number): Promise<OAuthProviderModel | null>
    findByName(name: string): Promise<OAuthProviderModel | null>
    findMany(filter: OAuthProviderFilterOptions): Promise<OAuthProviderModel[]>
}
