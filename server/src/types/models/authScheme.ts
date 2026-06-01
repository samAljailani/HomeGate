import { AuthSchemeName } from '@prisma/generated'
export { AuthSchemeName }

export type AuthSchemeModel = {
    id: number
    name: AuthSchemeName
}

export type CreateAuthSchemeModel = Omit<AuthSchemeModel, 'id'>
