import { Injectable, Inject } from '@nestjs/common'
import { PrismaProvider } from '@/infrastructure/prisma.provider'
import { IUserAccountRepository } from './IUserAccountRepository'
import type { UserAccountModel as PrismaUserAccount } from '@prisma/generated/models'
import {
    CreateUserAccountModel,
    UpdateUserAccountModel,
    UserAccountModel,
    UserAccountFilterOptions,
} from '@/types/models/userAccount'

@Injectable()
export class UserAccountRepository implements IUserAccountRepository {
    private db: PrismaProvider
    constructor(@Inject(PrismaProvider) db: PrismaProvider) {
        this.db = db
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
        const userAccount = await this.db.userAccount.findUnique({
            where: {
                userId_serviceId: {
                    userId: userId,
                    serviceId: serviceId,
                },
            },
        })

        return userAccount ? this.mapUserAccount(userAccount) : null
    }

    async findMany(filter: UserAccountFilterOptions): Promise<UserAccountModel[]> {
        const userAccounts = await this.db.userAccount.findMany({
            where: { ...filter },
        })

        return userAccounts.map((userAccount) => this.mapUserAccount(userAccount))
    }

    async create(request: CreateUserAccountModel): Promise<UserAccountModel | null> {
        const userAccount = await this.db.userAccount.create({
            data: request,
        })

        return this.mapUserAccount(userAccount)
    }

    async update(request: UpdateUserAccountModel): Promise<UserAccountModel | null> {
        const { userId, serviceId, ...data } = request
        const userAccount = await this.db.userAccount.update({
            where: {
                userId_serviceId: { userId, serviceId },
            },
            data,
        })

        return this.mapUserAccount(userAccount)
    }

    async delete(userId: string, serviceId: number): Promise<void> {
        await this.db.userAccount.delete({
            where: {
                userId_serviceId: {
                    userId: userId,
                    serviceId: serviceId,
                },
            },
        })
    }
}
