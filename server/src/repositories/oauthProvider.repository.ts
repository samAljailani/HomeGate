import { Injectable, Inject } from '@nestjs/common'
import { PrismaProvider } from '@/infrastructure/prisma.provider'
import { OAuthProviderName } from '@prisma/generated'
import type { OAuthProviderModel as PrismaOAuthProvider } from '@prisma/generated/models'
import { IOAuthProviderRepository } from './IOAuthProviderRepository'
import { OAuthProviderModel, OAuthProviderFilterOptions } from '@/types/models/oauthProvider'

@Injectable()
export class OAuthProviderRepository implements IOAuthProviderRepository {
    private db: PrismaProvider
    constructor(@Inject(PrismaProvider) db: PrismaProvider) {
        this.db = db
    }

    private mapOAuthProvider(provider: PrismaOAuthProvider): OAuthProviderModel {
        return {
            id: provider.id,
            name: provider.name,
            enabled: provider.enabled,
        }
    }

    async findById(id: number): Promise<OAuthProviderModel | null> {
        const provider = await this.db.oAuthProvider.findUnique({
            where: { id: id },
        })

        return provider ? this.mapOAuthProvider(provider) : null
    }

    async findByName(name: string): Promise<OAuthProviderModel | null> {
        if (!Object.values(OAuthProviderName).includes(name as OAuthProviderName)) {
            return null
        }
        const provider = await this.db.oAuthProvider.findUnique({
            where: { name: name as OAuthProviderName },
        })

        return provider ? this.mapOAuthProvider(provider) : null
    }

    async findMany(filter: OAuthProviderFilterOptions): Promise<OAuthProviderModel[]> {
        const providers = await this.db.oAuthProvider.findMany({
            where: { ...filter },
        })

        return providers.map((provider) => this.mapOAuthProvider(provider))
    }
}
