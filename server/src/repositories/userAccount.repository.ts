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

@Injectable()
export class UserAccountRepository extends BaseRepository implements IUserAccountRepository {
    constructor(
        @Inject(PrismaProvider) db: PrismaProvider,
        @Inject(LoggingProvider) logger: LoggingProvider
    ) {
        super(db, logger)
    }

    private mapUserAccount(userAccount: PrismaUserAccount): UserAccountModel {
        return {
            userId: userAccount.userId,
            serviceId: userAccount.serviceId,
            username: userAccount.username,
            isActive: userAccount.isActive,
            createdAt: userAccount.createdAt,
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
            throw error
        }
    }

    async findMany(filter: UserAccountFilterOptions): Promise<UserAccountModel[]> {
        try {
            const userAccounts = await this.db.userAccount.findMany({ where: { ...filter } })
            return userAccounts.map((userAccount) => this.mapUserAccount(userAccount))
        } catch (error) {
            this.logger.error('findMany failed', {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            throw error
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
            throw error
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
            throw error
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
            throw error
        }
    }
}
