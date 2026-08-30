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

    async findBySubscriptionId(subscriptionId: string): Promise<ExternalUserAccountModel | null> {
        try {
            const account = await this.db.externalUserAccount.findUnique({ where: { subscriptionId } })
            return account ? this.mapExternalUserAccount(account) : null
        } catch (error) {
            this.logger.error(`findBySubscriptionId failed for subscriptionId: ${subscriptionId}`, {
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

    async update(request: UpdateExternalUserAccountModel): Promise<ExternalUserAccountModel | null> {
        try {
            const { subscriptionId, ...data } = request
            const account = await this.db.externalUserAccount.update({ where: { subscriptionId }, data })
            return this.mapExternalUserAccount(account)
        } catch (error) {
            this.logger.error(`update failed for subscriptionId: ${request.subscriptionId}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.externalUserAccount)
        }
    }

    async delete(subscriptionId: string): Promise<void> {
        try {
            await this.db.externalUserAccount.delete({ where: { subscriptionId } })
        } catch (error) {
            this.logger.error(`delete failed for subscriptionId: ${subscriptionId}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.externalUserAccount)
        }
    }
}
