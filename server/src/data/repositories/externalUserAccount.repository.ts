import { Injectable, Inject } from '@nestjs/common'
import { PrismaProvider } from '@/infrastructure/prisma.provider'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { BaseRepository } from './base.repository'
import { IExternalUserAccountRepository } from './IExternalUserAccountRepository'
import type { ExternalUserAccountModel as PrismaExternalUserAccount } from '@prisma/generated/models'
import {
    CreateExternalUserAccountModel,
    UpdateExternalUserAccountModel,
    ExternalUserAccountModel,
    ExternalUserAccountFilterOptions,
} from '@/types/models/externalUserAccount'
import { mapPrismaError } from './util'
import { repositoryErrorMessages } from './resources'

@Injectable()
export class ExternalUserAccountRepository extends BaseRepository implements IExternalUserAccountRepository {
    constructor(@Inject(PrismaProvider) db: PrismaProvider, @Inject(LoggingProvider) logger: LoggingProvider) {
        super(db, logger)
    }

    private mapExternalUserAccount(account: PrismaExternalUserAccount): ExternalUserAccountModel {
        return {
            id: account.id,
            subscriptionId: account.subscriptionId,
            userId: account.userId,
            serviceId: account.serviceId,
            externalAccountId: account.externalAccountId,
            username: account.username,
            email: account.email,
            createdAt: account.createdAt,
            updatedAt: account.updatedAt,
        }
    }

    async findBySubscriptionId(subscriptionId: string): Promise<ExternalUserAccountModel[]> {
        try {
            const accounts = await this.db.externalUserAccount.findMany({ where: { subscriptionId } })
            return accounts.map(a => this.mapExternalUserAccount(a))
        } catch (error) {
            this.logger.error(`findBySubscriptionId failed for subscriptionId: ${subscriptionId}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.externalUserAccount)
        }
    }

    async findById(id: string): Promise<ExternalUserAccountModel | null> {
        try {
            const account = await this.db.externalUserAccount.findUnique({ where: { id } })
            return account ? this.mapExternalUserAccount(account) : null
        } catch (error) {
            this.logger.error(`findById failed for id: ${id}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.externalUserAccount)
        }
    }

    async findMany(
        filter: ExternalUserAccountFilterOptions,
        take: number = 50,
        skip: number = 0
    ): Promise<ExternalUserAccountModel[]> {
        try {
            const accounts = await this.db.externalUserAccount.findMany({ where: { ...filter }, take, skip })
            return accounts.map((account) => this.mapExternalUserAccount(account))
        } catch (error) {
            this.logger.error('findMany failed', {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.externalUserAccount)
        }
    }

    async countBySubscriptionId(subscriptionId: string): Promise<number> {
        try {
            return await this.db.externalUserAccount.count({ where: { subscriptionId } })
        } catch (error) {
            this.logger.error(`countBySubscriptionId failed for subscriptionId: ${subscriptionId}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.externalUserAccount)
        }
    }

    async create(request: CreateExternalUserAccountModel): Promise<ExternalUserAccountModel | null> {
        try {
            const account = await this.db.externalUserAccount.create({ data: request })
            return this.mapExternalUserAccount(account)
        } catch (error) {
            this.logger.error('create failed', {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.externalUserAccount)
        }
    }

    async update(id: string, request: UpdateExternalUserAccountModel): Promise<ExternalUserAccountModel | null> {
        try {
            const account = await this.db.externalUserAccount.update({ where: { id }, data: request })
            return this.mapExternalUserAccount(account)
        } catch (error) {
            this.logger.error(`update failed for id: ${id}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.externalUserAccount)
        }
    }

    async delete(id: string): Promise<void> {
        try {
            await this.db.externalUserAccount.delete({ where: { id } })
        } catch (error) {
            this.logger.error(`delete failed for id: ${id}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.externalUserAccount)
        }
    }

    async deleteBySubscriptionId(subscriptionId: string): Promise<void> {
        try {
            await this.db.externalUserAccount.deleteMany({ where: { subscriptionId } })
        } catch (error) {
            this.logger.error(`deleteBySubscriptionId failed for subscriptionId: ${subscriptionId}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.externalUserAccount)
        }
    }
}