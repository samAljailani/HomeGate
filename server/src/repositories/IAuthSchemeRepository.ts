import { AuthSchemeModel, AuthSchemeFilterOptions } from '@/types/models/authScheme'

export const IAuthSchemeRepository = Symbol('IAuthSchemeRepository')

export interface IAuthSchemeRepository {
    findById(id: number): Promise<AuthSchemeModel | null>
    findByName(name: string): Promise<AuthSchemeModel | null>
    findMany(filter: AuthSchemeFilterOptions): Promise<AuthSchemeModel[]>
}
