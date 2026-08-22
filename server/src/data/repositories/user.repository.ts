import { Injectable, Inject } from '@nestjs/common'
import { PrismaProvider } from '@/infrastructure/prisma.provider'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { BaseRepository } from './base.repository'
import { IUserRepository } from './IUserRepository'
import type { UserModel as PrismaUser } from '@prisma/generated/models'
import {
    CreateUserModel,
    UpdateUserModel,
    UserModel,
    UserFilterOptions,
    UserStatusCountModel,
    UserStatus as AppUserStatus,
} from '@/types/models/user'
import { mapPrismaError } from './util'
import { repositoryErrorMessages } from './resources'
import { UserStatus as PrismaUserStatus, UserStatus } from '@prisma/generated'

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
            status: user.status,
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

    async findMany(filter: UserFilterOptions, take: number = 50, skip: number = 0): Promise<UserModel[]> {
        try {
            const users = await this.db.user.findMany({
                where: { ...filter },
                take,
                skip,
            })
            return users.map((user) => this.mapUser(user))
        } catch (error) {
            this.logger.error('findMany failed', {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.user)
        }
    }

    async count(filter: UserFilterOptions): Promise<number> {
        return this.db.user.count({ where: { ...filter } })
    }

    async getUserCounts(userStatuses?: AppUserStatus[]): Promise<UserStatusCountModel[]> {
        const grouped = await this.db.user.groupBy({
            by: ['status'],
            ...(userStatuses ? { where: { status: { in: userStatuses } } } : {}),
            _count: { _all: true },
        })

        return grouped.map((item) => ({
            status: item.status as AppUserStatus,
            count: item._count._all,
        }))
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

    async createProvisional(request: CreateUserModel): Promise<UserModel> {
        try {
            const user = await this.db.user.create({
                data: { ...request, status: 'PENDING', provisionedAt: new Date() },
            })
            return this.mapUser(user)
        } catch (error) {
            this.logger.error(`createProvisional failed for email: ${request.email}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.user)
        }
    }

    async touchProvisional(id: string): Promise<void> {
        try {
            await this.db.user.update({ where: { id }, data: { provisionedAt: new Date() } })
        } catch (error) {
            this.logger.error(`touchProvisional failed for id: ${id}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.user)
        }
    }

    async activate(id: string): Promise<UserModel> {
        try {
            const user = await this.db.user.update({ where: { id }, data: { status: 'ACTIVE' } })
            return this.mapUser(user)
        } catch (error) {
            this.logger.error(`activate failed for id: ${id}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.user)
        }
    }

    async findPendingByEmail(email: string): Promise<UserModel | null> {
        try {
            const user = await this.db.user.findFirst({ where: { email, status: 'PENDING' } })
            return user ? this.mapUser(user) : null
        } catch (error) {
            this.logger.error(`findPendingByEmail failed for email: ${email}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.user)
        }
    }

    async deletePendingOlderThan(cutoff: Date): Promise<number> {
        try {
            const result = await this.db.user.deleteMany({
                where: { status: 'PENDING', provisionedAt: { lt: cutoff } },
            })
            return result.count
        } catch (error) {
            this.logger.error('deletePendingOlderThan failed', {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.user)
        }
    }

    async createWithOAuthIdentity(request: CreateUserModel, providerId: number, profileId: string): Promise<UserModel> {
        try {
            const user = await this.db.$transaction(async (tx) => {
                const created = await tx.user.create({ data: request })
                await tx.userOAuthIdentity.create({ data: { userId: created.id, providerId, profileId } })
                return created
            })
            return this.mapUser(user)
        } catch (error) {
            this.logger.error(`createWithOAuthIdentity failed for email: ${request.email}`, {
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

    async softDelete(id: string): Promise<boolean> {
        try {
            await this.db.user.update({ where: { id }, data: { status: UserStatus.DELETED } })
            return true
        } catch (error) {
            this.logger.error(`softDelete failed for id: ${id}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            // TODO: mapPrismaError always throws (never returns), so this currently just swallows
            // the error and reports failure via `false`. Revisit whether callers need to
            // distinguish error types (e.g. not found vs. conflict) rather than a plain boolean.
            return false
        }
    }

    async hardDelete(id: string): Promise<boolean> {
        try {
            await this.db.user.delete({ where: { id } })
            return true
        } catch (error) {
            this.logger.error(`hardDelete failed for id: ${id}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            // TODO: mapPrismaError always throws (never returns), so this currently just swallows
            // the error and reports failure via `false`. Revisit whether callers need to
            // distinguish error types (e.g. not found vs. conflict) rather than a plain boolean.
            return false
        }
    }

    async setEnabled(id: string, enabled: boolean): Promise<UserModel | null> {
        try {
            const status = enabled ? UserStatus.ACTIVE : UserStatus.DISABLED
            const user = await this.db.user.update({ where: { id }, data: { status } })
            return this.mapUser(user)
        } catch (error) {
            this.logger.error(`setEnabled failed for id: ${id}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.user)
        }
    }

    async setAdmin(id: string, isAdmin: boolean): Promise<UserModel | null> {
        try {
            const user = await this.db.user.update({ where: { id }, data: { isAdmin } })
            return this.mapUser(user)
        } catch (error) {
            this.logger.error(`setAdmin failed for id: ${id}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.user)
        }
    }
}
