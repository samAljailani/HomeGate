import { Injectable, Inject } from '@nestjs/common'
import { PrismaProvider } from '@/infrastructure/prisma.provider'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { BaseRepository } from './base.repository'
import { OAuthIdentityFilterOptions } from '@/types/models/userOAuthIdentity'
import { IUserOAuthIdentityRepository } from './IUserOAuthIdentityRepository'
import type { UserOAuthIdentityModel as PrismaUserOAuthIdentity } from '@prisma/generated/models'
import {
    CreateUserOAuthIdentityModel,
    UpdateUserOAuthIdentityModel,
    UserOAuthIdentityModel,
} from '@/types/models/userOAuthIdentity'
import { mapPrismaError } from './util'
import { repositoryErrorMessages } from './resources'

@Injectable()
export class UserOAuthIdentityRepository extends BaseRepository implements IUserOAuthIdentityRepository {
    constructor(
        @Inject(PrismaProvider) db: PrismaProvider,
        @Inject(LoggingProvider) logger: LoggingProvider
    ) {
        super(db, logger)
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
        try {
            const identity = await this.db.userOAuthIdentity.findUnique({
                where: { providerId_profileId: { providerId, profileId } },
            })
            return identity ? this.mapIdentity(identity) : null
        } catch (error) {
            this.logger.error(`find failed for providerId: ${providerId}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.userOAuthIdentity)
        }
    }

    async findByUsername(username: string): Promise<UserOAuthIdentityModel[]> {
        try {
            const identities = await this.db.userOAuthIdentity.findMany({
                where: { user: { username } },
            })
            return identities.map((identity) => this.mapIdentity(identity))
        } catch (error) {
            this.logger.error(`findByUsername failed for username: ${username}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.userOAuthIdentity)
        }
    }

    async findMany(filter: OAuthIdentityFilterOptions, take?: number): Promise<UserOAuthIdentityModel[]> {
        try {
            const identities = await this.db.userOAuthIdentity.findMany({
                where: { ...filter },
                ...(take !== undefined && { take }),
            })
            return identities.map((identity) => this.mapIdentity(identity))
        } catch (error) {
            this.logger.error('findMany failed', {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.userOAuthIdentity)
        }
    }

    async create(request: CreateUserOAuthIdentityModel): Promise<UserOAuthIdentityModel | null> {
        try {
            const identity = await this.db.userOAuthIdentity.create({ data: request })
            return this.mapIdentity(identity)
        } catch (error) {
            this.logger.error('create failed', {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.userOAuthIdentity)
        }
    }

    async update(request: UpdateUserOAuthIdentityModel): Promise<UserOAuthIdentityModel | null> {
        try {
            const { id, ...data } = request
            const identity = await this.db.userOAuthIdentity.update({ where: { id }, data })
            return this.mapIdentity(identity)
        } catch (error) {
            this.logger.error(`update failed for id: ${request.id}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.userOAuthIdentity)
        }
    }

    async delete(providerId: number, profileId: string): Promise<void> {
        try {
            await this.db.userOAuthIdentity.delete({
                where: { providerId_profileId: { providerId, profileId } },
            })
        } catch (error) {
            this.logger.error(`delete failed for providerId: ${providerId}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.userOAuthIdentity)
        }
    }

    async identityExists(providerId: number, profileId: string): Promise<boolean> {
        try {
            const count = await this.db.userOAuthIdentity.count({ where: { providerId, profileId } })
            return count > 0
        } catch (error) {
            this.logger.error(`identityExists check failed for providerId: ${providerId}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.userOAuthIdentity)
        }
    }
}
