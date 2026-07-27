import { Injectable, Inject } from '@nestjs/common'
import { PrismaProvider } from '@/infrastructure/prisma.provider'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { BaseRepository } from './base.repository'
import { IUserAccountRepository } from './IUserAccountRepository'
import type { UserAccountModel as PrismaUserAccount } from '@prisma/generated/models'
import {
    CreateUserAccountModel,
    UpdateUserAccountModel,
    UserAccountModel,
    UserAccountFilterOptions,
} from '@/types/models/userAccount'
import { mapPrismaError } from './util'
import { repositoryErrorMessages } from './resources'
import { UserAccountStatus as UserAccountStatusModel, FailedOperation } from '@/types/enums'

@Injectable()
export class UserAccountRepository extends BaseRepository implements IUserAccountRepository {
    constructor(@Inject(PrismaProvider) db: PrismaProvider, @Inject(LoggingProvider) logger: LoggingProvider) {
        super(db, logger)
    }

    private mapUserAccount(userAccount: PrismaUserAccount): UserAccountModel {
        return {
            id: userAccount.id,
            userId: userAccount.userId,
            userServiceAccountId: userAccount.userServiceAccountId,
            serviceId: userAccount.serviceId,
            username: userAccount.username,
            status: userAccount.status as UserAccountStatusModel,

            autoRenew: userAccount.autoRenew,
            expiresAt: userAccount.expiresAt,

            createdAt: userAccount.createdAt,
            updatedAt: userAccount.updatedAt,

            provisionedAt: userAccount.provisionedAt,
            failedAt: userAccount.failedAt,
            cancelledAt: userAccount.cancelledAt,
            failedOperation: (userAccount.failedOperation as FailedOperation) ?? null,
            lastError: userAccount.lastError,
            retryCount: userAccount.retryCount,
        }
    }

    async find(userId: string, serviceId: number): Promise<UserAccountModel | null> {
        try {
            const userAccount = await this.db.userAccount.findUnique({
                where: { userId_serviceId: { userId, serviceId } },
            })
            return userAccount ? this.mapUserAccount(userAccount) : null
        } catch (error) {
            this.logger.error(`find failed for userId: ${userId}, serviceId: ${serviceId}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.userAccount)
        }
    }

    async findById(id: string): Promise<UserAccountModel | null> {
        try {
            const userAccount = await this.db.userAccount.findUnique({ where: { id } })
            return userAccount ? this.mapUserAccount(userAccount) : null
        } catch (error) {
            this.logger.error(`findById failed for id: ${id}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.userAccount)
        }
    }

    async findMany(filter: UserAccountFilterOptions, take: number = 50, skip: number = 0): Promise<UserAccountModel[]> {
        try {
            const { statuses, expiresBefore, expiresAfter, ...rest } = filter
            const userAccounts = await this.db.userAccount.findMany({
                where: {
                    ...rest,
                    ...(statuses && { status: { in: statuses } }),
                    ...((expiresBefore || expiresAfter) && {
                        expiresAt: {
                            ...(expiresBefore && { lt: expiresBefore }),
                            ...(expiresAfter && { gt: expiresAfter }),
                        },
                    }),
                },
                take,
                skip,
            })
            return userAccounts.map((userAccount) => this.mapUserAccount(userAccount))
        } catch (error) {
            this.logger.error('findMany failed', {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.userAccount)
        }
    }

    async create(request: CreateUserAccountModel): Promise<UserAccountModel | null> {
        try {
            const userAccount = await this.db.userAccount.create({ data: request })
            return this.mapUserAccount(userAccount)
        } catch (error) {
            this.logger.error('create failed', {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.userAccount)
        }
    }

    async update(request: UpdateUserAccountModel): Promise<UserAccountModel | null> {
        try {
            const { userId, serviceId, ...data } = request
            const userAccount = await this.db.userAccount.update({
                where: { userId_serviceId: { userId, serviceId } },
                data,
            })
            return this.mapUserAccount(userAccount)
        } catch (error) {
            this.logger.error(`update failed for userId: ${request.userId}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.userAccount)
        }
    }

    async delete(userId: string, serviceId: number): Promise<void> {
        try {
            await this.db.userAccount.delete({
                where: { userId_serviceId: { userId, serviceId } },
            })
        } catch (error) {
            this.logger.error(`delete failed for userId: ${userId}, serviceId: ${serviceId}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.userAccount)
        }
    }
}
