import { AuthScheme } from '@prisma/generated'

import { AuthSchemeFilterOptions, AuthSchemeLoadRequestDto } from '@/types/dtos/authSchemeDto'

export const IAuthSchemeRepository = Symbol('IAuthSchemeRepository')

export interface IAuthSchemeRepository {
    get(request: AuthSchemeLoadRequestDto): Promise<AuthScheme | null>
    getByName(name: string): Promise<AuthScheme | null>
    getMany(filter: AuthSchemeFilterOptions): Promise<AuthScheme[]>
}
