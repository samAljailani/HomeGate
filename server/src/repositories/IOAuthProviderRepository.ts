import { OAuthProviderModel } from '@/types/models/oauthProvider'
import { OAuthProviderFilterOptions } from '@/types/dtos/oauthProviderDto'

export const IOAuthProviderRepository = Symbol('IOAuthProviderRepository')

export interface IOAuthProviderRepository {
    findById(id: number): Promise<OAuthProviderModel | null>
    findByName(name: string): Promise<OAuthProviderModel | null>
    findMany(filter: OAuthProviderFilterOptions): Promise<OAuthProviderModel[]>
}
