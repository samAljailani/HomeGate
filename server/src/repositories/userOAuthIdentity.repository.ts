import { Injectable, Inject } from '@nestjs/common'
import { PrismaProvider } from '@/infrastructure/prisma.provider'
import { OAuthIdentityFilterOptions } from '@/types/models/userOAuthIdentity'
import { IUserOAuthIdentityRepository } from './IUserOAuthIdentityRepository'
import type { UserOAuthIdentityModel as PrismaUserOAuthIdentity } from '@prisma/generated/models'
import {
    CreateUserOAuthIdentityModel,
    UpdateUserOAuthIdentityModel,
    UserOAuthIdentityModel,
} from '@/types/models/userOAuthIdentity'

@Injectable()
export class UserOAuthIdentityRepository implements IUserOAuthIdentityRepository {
    private db: PrismaProvider
    constructor(@Inject(PrismaProvider) db: PrismaProvider) {
        this.db = db
    }

    private mapIdentity(identity: PrismaUserOAuthIdentity): UserOAuthIdentityModel {
        return {
            id: identity.id,
            userId: identity.userId,
            providerId: identity.providerId,
            profileId: identity.profileId,
            createdAt: identity.createdAt,
        }
    }

    async find(providerId: number, profileId: string): Promise<UserOAuthIdentityModel | null> {
        const identity = await this.db.userOAuthIdentity.findUnique({
            where: {
                providerId_profileId: {
                    providerId: providerId,
                    profileId: profileId,
                },
            },
        })

        return identity ? this.mapIdentity(identity) : null
    }

    async findByUsername(username: string): Promise<UserOAuthIdentityModel[]> {
        const identities = await this.db.userOAuthIdentity.findMany({
            where: {
                user: { username },
            },
        })

        return identities.map((identity) => this.mapIdentity(identity))
    }

    async findMany(filter: OAuthIdentityFilterOptions, take?: number): Promise<UserOAuthIdentityModel[]> {
        const identities = await this.db.userOAuthIdentity.findMany({
            where: { ...filter },
            ...(take !== undefined && { take }),
        })

        return identities.map((identity) => this.mapIdentity(identity))
    }

    async create(request: CreateUserOAuthIdentityModel): Promise<UserOAuthIdentityModel | null> {
        const identity = await this.db.userOAuthIdentity.create({
            data: request,
        })

        return this.mapIdentity(identity)
    }

    async update(request: UpdateUserOAuthIdentityModel): Promise<UserOAuthIdentityModel | null> {
        const { id, ...data } = request
        const identity = await this.db.userOAuthIdentity.update({
            where: { id },
            data,
        })

        return this.mapIdentity(identity)
    }

    async delete(providerId: number, profileId: string): Promise<void> {
        await this.db.userOAuthIdentity.delete({
            where: {
                providerId_profileId: {
                    providerId: providerId,
                    profileId: profileId,
                },
            },
        })
    }

    async identityExists(providerId: number, profileId: string): Promise<boolean> {
        const count = await this.db.userOAuthIdentity.count({
            where: { providerId, profileId },
        })
        return count > 0
    }
}
