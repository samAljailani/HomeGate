import { Injectable, Inject } from '@nestjs/common'
import { PrismaProvider } from '@/infrastructure/prisma.provider'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { BaseRepository } from './base.repository'
import { ISubscriptionRepository } from './ISubscriptionRepository'
import type { SubscriptionModel as PrismaSubscription } from '@prisma/generated/models'
import {
    CreateSubscriptionModel,
    UpdateSubscriptionModel,
    SubscriptionModel,
    SubscriptionFilterOptions,
} from '@/types/models/subscription'
import { mapPrismaError } from './util'
import { repositoryErrorMessages } from './resources'
import { SubscriptionStatus, FailedOperation } from '@/types/enums'

@Injectable()
export class SubscriptionRepository extends BaseRepository implements ISubscriptionRepository {
    constructor(@Inject(PrismaProvider) db: PrismaProvider, @Inject(LoggingProvider) logger: LoggingProvider) {
        super(db, logger)
    }

    private mapSubscription(subscription: PrismaSubscription): SubscriptionModel {
        return {
            id: subscription.id,
            userId: subscription.userId,
            serviceId: subscription.serviceId,
            status: subscription.status as SubscriptionStatus,

            autoRenew: subscription.autoRenew,
            expiresAt: subscription.expiresAt,
            derivedFromSubscriptionId: subscription.derivedFromSubscriptionId,

            createdAt: subscription.createdAt,
            updatedAt: subscription.updatedAt,

            provisionedAt: subscription.provisionedAt,
            failedAt: subscription.failedAt,
            cancelledAt: subscription.cancelledAt,
            failedOperation: (subscription.failedOperation as FailedOperation) ?? null,
            lastError: subscription.lastError,
            retryCount: subscription.retryCount,
        }
    }

    private buildWhere(filter: SubscriptionFilterOptions) {
        const { statuses, serviceIds, expiresBefore, expiresAfter, ...rest } = filter

        return {
            ...rest,
            ...(statuses && { status: { in: statuses } }),
            ...(serviceIds && { serviceId: { in: serviceIds } }),
            ...((expiresBefore || expiresAfter) && {
                expiresAt: {
                    ...(expiresBefore && { lt: expiresBefore }),
                    ...(expiresAfter && { gt: expiresAfter }),
                },
            }),
        }
    }

    async find(userId: string, serviceId: number): Promise<SubscriptionModel | null> {
        try {
            const subscription = await this.db.subscription.findUnique({
                where: { userId_serviceId: { userId, serviceId } },
            })
            return subscription ? this.mapSubscription(subscription) : null
        } catch (error) {
            this.logger.error(`find failed for userId: ${userId}, serviceId: ${serviceId}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.subscription)
        }
    }

    async findById(id: string): Promise<SubscriptionModel | null> {
        try {
            const subscription = await this.db.subscription.findUnique({ where: { id } })
            return subscription ? this.mapSubscription(subscription) : null
        } catch (error) {
            this.logger.error(`findById failed for id: ${id}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.subscription)
        }
    }

    async findMany(
        filter: SubscriptionFilterOptions,
        take: number = 50,
        skip: number = 0
    ): Promise<SubscriptionModel[]> {
        try {
            const subscriptions = await this.db.subscription.findMany({
                where: this.buildWhere(filter),
                take,
                skip,
            })
            return subscriptions.map((subscription) => this.mapSubscription(subscription))
        } catch (error) {
            this.logger.error('findMany failed', {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.subscription)
        }
    }

    async count(filter: SubscriptionFilterOptions = {}): Promise<number> {
        try {
            return await this.db.subscription.count({ where: this.buildWhere(filter) })
        } catch (error) {
            this.logger.error('count failed', {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.subscription)
        }
    }

    async create(request: CreateSubscriptionModel): Promise<SubscriptionModel | null> {
        try {
            const subscription = await this.db.subscription.create({ data: request })
            return this.mapSubscription(subscription)
        } catch (error) {
            this.logger.error('create failed', {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.subscription)
        }
    }

    async update(request: UpdateSubscriptionModel): Promise<SubscriptionModel | null> {
        try {
            const { userId, serviceId, ...data } = request
            const subscription = await this.db.subscription.update({
                where: { userId_serviceId: { userId, serviceId } },
                data,
            })
            return this.mapSubscription(subscription)
        } catch (error) {
            this.logger.error(`update failed for userId: ${request.userId}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.subscription)
        }
    }

    async delete(userId: string, serviceId: number): Promise<void> {
        try {
            await this.db.subscription.delete({
                where: { userId_serviceId: { userId, serviceId } },
            })
        } catch (error) {
            this.logger.error(`delete failed for userId: ${userId}, serviceId: ${serviceId}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.subscription)
        }
    }

    async deleteByServiceId(serviceId: number): Promise<number> {
        try {
            const result = await this.db.subscription.deleteMany({
                where: { serviceId },
            })
            return result.count
        } catch (error) {
            this.logger.error(`deleteByServiceId failed for serviceId: ${serviceId}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.subscription)
        }
    }
}
