import { Injectable, Inject } from '@nestjs/common'
import { PrismaProvider } from '@/infrastructure/prisma.provider'
import { AuthSchemeName } from '@prisma/generated'
import type { AuthSchemeModel as PrismaAuthScheme } from '@prisma/generated/models'
import { AuthSchemeFilterOptions } from '@/types/dtos/authSchemeDto'
import { IAuthSchemeRepository } from './IAuthSchemeRepository'
import { AuthSchemeModel } from '@/types/models/authScheme'

@Injectable()
export class AuthSchemeRepository implements IAuthSchemeRepository {
    private db: PrismaProvider
    constructor(@Inject(PrismaProvider) db: PrismaProvider) {
        this.db = db
    }

    private mapAuthScheme(authScheme: PrismaAuthScheme): AuthSchemeModel {
        return {
            id: authScheme.id,
            name: authScheme.name,
        }
    }

    async findById(id: number): Promise<AuthSchemeModel | null> {
        const authScheme = await this.db.authScheme.findUnique({
            where: { id },
        })

        return authScheme ? this.mapAuthScheme(authScheme) : null
    }

    async findByName(name: string): Promise<AuthSchemeModel | null> {
        if (!Object.values(AuthSchemeName).includes(name as AuthSchemeName)) {
            return null
        }
        const authScheme = await this.db.authScheme.findUnique({
            where: { name: name as AuthSchemeName },
        })

        return authScheme ? this.mapAuthScheme(authScheme) : null
    }

    async findMany(filter: AuthSchemeFilterOptions): Promise<AuthSchemeModel[]> {
        const authSchemes = await this.db.authScheme.findMany({
            where: { ...filter },
        })

        return authSchemes.map((authScheme) => this.mapAuthScheme(authScheme))
    }
}
