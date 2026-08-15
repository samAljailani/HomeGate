import { OAuthProviderModel, OAuthProviderFilterOptions } from '@/types/models/oauthProvider'
import { OAuthProviderName } from '@prisma/generated'

export const IOAuthProviderRepository = Symbol('IOAuthProviderRepository')

export interface IOAuthProviderRepository {
    findById(id: number): Promise<OAuthProviderModel | null>
    findByName(name: string): Promise<OAuthProviderModel | null>
    findMany(filter: OAuthProviderFilterOptions, take?: number, skip?: number): Promise<OAuthProviderModel[]>
    count(filter: OAuthProviderFilterOptions): Promise<number>
    setEnabled(name: OAuthProviderName, enabled: boolean): Promise<OAuthProviderModel | null>
}
