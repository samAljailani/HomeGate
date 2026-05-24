import { Injectable, Inject } from '@nestjs/common';
import { PrismaProvider } from '@/infrastructure/prisma.provider';
import { AuthScheme, AuthSchemeName } from '@prisma/generated';
import { AuthSchemeFilterOptions, AuthSchemeLoadRequestDto } from '@/types/dtos/authSchemeDto';
import { IAuthSchemeRepository } from './IAuthSchemeRepository';

@Injectable()
export class AuthSchemeRepository implements IAuthSchemeRepository {
    private db: PrismaProvider;
    constructor(@Inject(PrismaProvider) db: PrismaProvider) {
        this.db = db;
    }

    async get(request: AuthSchemeLoadRequestDto): Promise<AuthScheme | null> {
        return this.db.authScheme.findUnique({
            where: { id: request.id },
        });
    }

    async getByName(name: string): Promise<AuthScheme | null> {
        if (!Object.values(AuthSchemeName).includes(name as AuthSchemeName)) {
            return null;
        }
        return this.db.authScheme.findUnique({
            where: { name: name as AuthSchemeName },
        });
    }

    async getMany(filter: AuthSchemeFilterOptions): Promise<AuthScheme[]> {
        return this.db.authScheme.findMany({
            where: { ...filter },
        });
    }
}
