import { Injectable, Inject } from '@nestjs/common'
import { PrismaProvider } from '@/infrastructure/prisma.provider'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { BaseRepository } from './base.repository'
import { IUserRepository } from './IUserRepository'
import type { UserModel as PrismaUser } from '@prisma/generated/models'
import { CreateUserModel, UpdateUserModel, UserModel, UserFilterOptions } from '@/types/models/user'
import { mapPrismaError } from './util'
import { repositoryErrorMessages } from './resources'

@Injectable()
export class UserRepository extends BaseRepository implements IUserRepository {
    constructor(@Inject(PrismaProvider) db: PrismaProvider, @Inject(LoggingProvider) logger: LoggingProvider) {
        super(db, logger)
    }

    private mapUser(user: PrismaUser): UserModel {
        return {
            id: user.id,
            email: user.email,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            isAdmin: user.isAdmin,
            isDeleted: user.isDeleted,
            createdAt: user.createdAt,
        }
    }

    async findById(id: string): Promise<UserModel | null> {
        try {
            const user = await this.db.user.findUnique({ where: { id } })
            return user ? this.mapUser(user) : null
        } catch (error) {
            this.logger.error(`findById failed for id: ${id}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.user)
        }
    }

    async findByEmail(email: string): Promise<UserModel | null> {
        try {
            const user = await this.db.user.findUnique({ where: { email } })
            return user ? this.mapUser(user) : null
        } catch (error) {
            this.logger.error(`findByEmail failed for email: ${email}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.user)
        }
    }

    async findMany(filter: UserFilterOptions, take?: number): Promise<UserModel[]> {
        try {
            const users = await this.db.user.findMany({
                where: { ...filter },
                ...(take !== undefined && { take }),
            })
            return users.map((user) => this.mapUser(user))
        } catch (error) {
            this.logger.error('findMany failed', {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.user)
        }
    }

    async create(request: CreateUserModel): Promise<UserModel | null> {
        try {
            const user = await this.db.user.create({ data: request })
            return this.mapUser(user)
        } catch (error) {
            this.logger.error(`create failed for email: ${request.email}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.user)
        }
    }

    async usernameExists(username: string): Promise<boolean> {
        try {
            const count = await this.db.user.count({ where: { username } })
            return count > 0
        } catch (error) {
            this.logger.error(`usernameExists check failed for username: ${username}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.user)
        }
    }

    async update(request: UpdateUserModel): Promise<UserModel | null> {
        try {
            const { id, ...data } = request
            const user = await this.db.user.update({ where: { id }, data })
            return this.mapUser(user)
        } catch (error) {
            this.logger.error(`update failed for id: ${request.id}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.user)
        }
    }

    async delete(id: string): Promise<void> {
        try {
            await this.db.user.delete({ where: { id } })
        } catch (error) {
            this.logger.error(`delete failed for id: ${id}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.user)
        }
    }
}
