import { Injectable, Inject } from '@nestjs/common'
import { PrismaProvider } from '@/infrastructure/prisma.provider'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { BaseRepository } from './base.repository'
import { OAuthProviderName } from '@prisma/generated'
import type { OAuthProviderModel as PrismaOAuthProvider } from '@prisma/generated/models'
import { IOAuthProviderRepository } from './IOAuthProviderRepository'
import { OAuthProviderModel, OAuthProviderFilterOptions } from '@/types/models/oauthProvider'
import { mapPrismaError } from './util'
import { repositoryErrorMessages } from './resources'

@Injectable()
export class OAuthProviderRepository extends BaseRepository implements IOAuthProviderRepository {
    constructor(@Inject(PrismaProvider) db: PrismaProvider, @Inject(LoggingProvider) logger: LoggingProvider) {
        super(db, logger)
    }

    private mapOAuthProvider(provider: PrismaOAuthProvider): OAuthProviderModel {
        return {
            id: provider.id,
            name: provider.name,
            enabled: provider.enabled,
        }
    }

    async findById(id: number): Promise<OAuthProviderModel | null> {
        try {
            const provider = await this.db.oAuthProvider.findUnique({ where: { id } })
            return provider ? this.mapOAuthProvider(provider) : null
        } catch (error) {
            this.logger.error(`findById failed for id: ${id}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.oauthProvider)
        }
    }

    async findByName(name: string): Promise<OAuthProviderModel | null> {
        if (!Object.values(OAuthProviderName).includes(name as OAuthProviderName)) {
            return null
        }
        try {
            const provider = await this.db.oAuthProvider.findUnique({
                where: { name: name as OAuthProviderName },
            })
            return provider ? this.mapOAuthProvider(provider) : null
        } catch (error) {
            this.logger.error(`findByName failed for name: ${name}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.oauthProvider)
        }
    }

    async findMany(filter: OAuthProviderFilterOptions): Promise<OAuthProviderModel[]> {
        try {
            const providers = await this.db.oAuthProvider.findMany({ where: { ...filter } })
            return providers.map((provider) => this.mapOAuthProvider(provider))
        } catch (error) {
            this.logger.error('findMany failed', {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.oauthProvider)
        }
    }
}
