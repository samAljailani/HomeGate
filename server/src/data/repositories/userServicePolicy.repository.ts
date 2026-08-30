import { Injectable } from '@nestjs/common'
import { BaseRepository } from './base.repository'
import { IUserServicePolicyRepository } from './IUserServicePolicyRepository'
import { UserServicePolicyModel, CreateUserServicePolicyModel } from '@/types/models/userServicePolicy'
import { PolicyEffect } from '@/types/enums'
import { mapPrismaError } from './util'
import { repositoryErrorMessages } from './resources'
import { UserServicePolicy } from '@prisma/generated'

@Injectable()
export class UserServicePolicyRepository extends BaseRepository implements IUserServicePolicyRepository {
    private mapPolicy(row: UserServicePolicy): UserServicePolicyModel {
        return {
            id: row.id,
            userId: row.userId,
            serviceId: row.serviceId,
            effect: row.effect as PolicyEffect,
            createdByUserId: row.createdByUserId,
            createdAt: row.createdAt,
        }
    }

    async find(userId: string, serviceId: number): Promise<UserServicePolicyModel | null> {
        try {
            const row = await this.db.userServicePolicy.findUnique({
                where: { userId_serviceId: { userId, serviceId } },
            })
            return row ? this.mapPolicy(row) : null
        } catch (error) {
            this.logger.error('find failed', {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.userServicePolicy)
        }
    }

    async findByUserId(userId: string): Promise<UserServicePolicyModel[]> {
        try {
            const rows = await this.db.userServicePolicy.findMany({ where: { userId } })
            return rows.map((r) => this.mapPolicy(r))
        } catch (error) {
            this.logger.error('findByUserId failed', {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.userServicePolicy)
        }
    }

    async upsert(request: CreateUserServicePolicyModel): Promise<UserServicePolicyModel> {
        try {
            const row = await this.db.userServicePolicy.upsert({
                where: { userId_serviceId: { userId: request.userId, serviceId: request.serviceId } },
                create: {
                    userId: request.userId,
                    serviceId: request.serviceId,
                    effect: request.effect,
                    createdByUserId: request.createdByUserId,
                },
                update: {
                    effect: request.effect,
                    createdByUserId: request.createdByUserId,
                },
            })
            return this.mapPolicy(row)
        } catch (error) {
            this.logger.error('upsert failed', {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.userServicePolicy)
        }
    }

    async delete(userId: string, serviceId: number): Promise<void> {
        try {
            await this.db.userServicePolicy.delete({
                where: { userId_serviceId: { userId, serviceId } },
            })
        } catch (error) {
            this.logger.error('delete failed', {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.userServicePolicy)
        }
    }
}
