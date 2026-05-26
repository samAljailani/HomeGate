import { Injectable, Inject } from '@nestjs/common'
import { PrismaProvider } from '@/infrastructure/prisma.provider'
import { UserOAuthIdentity } from '@prisma/generated'
import {
    OAuthIdentityCreateRequestDto,
    OAuthIdentityDeleteRequestDto,
    OAuthIdentityFilterOptions,
    OAuthIdentityLoadRequestDto,
} from '@/types/dtos/userOAuthIdentityDto'
import { IUserOAuthIdentityRepository } from './IUserOAuthIdentityRepository'

@Injectable()
export class UserOAuthIdentityRepository implements IUserOAuthIdentityRepository {
    private db: PrismaProvider
    constructor(@Inject(PrismaProvider) db: PrismaProvider) {
        this.db = db
    }

    async get(request: OAuthIdentityLoadRequestDto): Promise<UserOAuthIdentity | null> {
        const user = await this.db.userOAuthIdentity.findUnique({
            where: {
                providerId_profileId: {
                    providerId: request.providerId,
                    profileId: request.profileId,
                },
            },
        })

        return user
    }

    async getMany(filter: OAuthIdentityFilterOptions, take?: number): Promise<UserOAuthIdentity[]> {
        return this.db.userOAuthIdentity.findMany({
            where: { ...filter },
            ...(take !== undefined && { take }),
        })
    }

    async post(request: OAuthIdentityCreateRequestDto): Promise<UserOAuthIdentity | null> {
        const user = await this.db.userOAuthIdentity.create({
            data: request,
        })

        return user
    }

    async delete(request: OAuthIdentityDeleteRequestDto): Promise<void> {
        await this.db.userOAuthIdentity.delete({
            where: {
                providerId_profileId: {
                    providerId: request.providerId,
                    profileId: request.profileId,
                },
            },
        })
    }

    async existsByProviderAndProfileId(providerId: number, profileId: string): Promise<boolean> {
        const count = await this.db.userOAuthIdentity.count({
            where: { providerId, profileId },
        })
        return count > 0
    }

    async getByUsername(username: string): Promise<UserOAuthIdentity[]> {
        return this.db.userOAuthIdentity.findMany({
            where: {
                user: { username },
            },
        })
    }
}
