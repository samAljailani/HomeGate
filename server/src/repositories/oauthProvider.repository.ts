import { Injectable, Inject } from '@nestjs/common';
import { PrismaProvider } from '@/infrastructure/prisma.provider';
import { OAuthProvider } from '@prisma/generated';
import { OAuthProviderFilterOptions, OAuthProviderLoadRequestDto } from '@/types/dtos/oauthProviderDto';
import { IOAuthProviderRepository } from './IOAuthProviderRepository';

@Injectable()
export class OAuthProviderRepository implements IOAuthProviderRepository {
    private db: PrismaProvider;
    constructor(@Inject(PrismaProvider) db: PrismaProvider) {
        this.db = db;
    }

    async get(request: OAuthProviderLoadRequestDto): Promise<OAuthProvider | null> {
        return this.db.oAuthProvider.findUnique({
            where: { id: request.id },
        });
    }

    async getByName(name: string): Promise<OAuthProvider | null> {
        return this.db.oAuthProvider.findUnique({
            where: { name },
        });
    }

    async getMany(filter: OAuthProviderFilterOptions): Promise<OAuthProvider[]> {
        return this.db.oAuthProvider.findMany({
            where: { ...filter },
        });
    }
}
