import { Injectable, Inject } from '@nestjs/common'
import { PrismaProvider } from '@/infrastructure/prisma.provider'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { BaseRepository } from './base.repository'
import { AuthSchemeName } from '@prisma/generated'
import type { AuthSchemeModel as PrismaAuthScheme } from '@prisma/generated/models'
import { IAuthSchemeRepository } from './IAuthSchemeRepository'
import { AuthSchemeModel, AuthSchemeFilterOptions } from '@/types/models/authScheme'

@Injectable()
export class AuthSchemeRepository extends BaseRepository implements IAuthSchemeRepository {
    constructor(
        @Inject(PrismaProvider) db: PrismaProvider,
        @Inject(LoggingProvider) logger: LoggingProvider
    ) {
        super(db, logger)
    }

    private mapAuthScheme(authScheme: PrismaAuthScheme): AuthSchemeModel {
        return {
            id: authScheme.id,
            name: authScheme.name,
        }
    }

    async findById(id: number): Promise<AuthSchemeModel | null> {
        try {
            const authScheme = await this.db.authScheme.findUnique({ where: { id } })
            return authScheme ? this.mapAuthScheme(authScheme) : null
        } catch (error) {
            this.logger.error(`findById failed for id: ${id}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            throw error
        }
    }

    async findByName(name: string): Promise<AuthSchemeModel | null> {
        if (!Object.values(AuthSchemeName).includes(name as AuthSchemeName)) {
            return null
        }
        try {
            const authScheme = await this.db.authScheme.findUnique({
                where: { name: name as AuthSchemeName },
            })
            return authScheme ? this.mapAuthScheme(authScheme) : null
        } catch (error) {
            this.logger.error(`findByName failed for name: ${name}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            throw error
        }
    }

    async findMany(filter: AuthSchemeFilterOptions): Promise<AuthSchemeModel[]> {
        try {
            const authSchemes = await this.db.authScheme.findMany({ where: { ...filter } })
            return authSchemes.map((authScheme) => this.mapAuthScheme(authScheme))
        } catch (error) {
            this.logger.error('findMany failed', {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            throw error
        }
    }
}
