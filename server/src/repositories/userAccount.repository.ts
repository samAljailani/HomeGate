import { Injectable, Inject } from '@nestjs/common';
import { PrismaProvider } from '@/infrastructure/prisma.provider';
import { UserAccount } from '@prisma/generated';
import { UserAccountCreateRequestDto, UserAccountDeleteRequestDto, UserAccountFilterOptions, UserAccountLoadRequestDto, UserAccountUpdateRequestDto } from '@/types/dtos/userAccountDto';
import { IUserAccountRepository } from './IUserAccountRepository';

@Injectable()
export class UserAccountRepository implements IUserAccountRepository {
    private db: PrismaProvider;
    constructor(@Inject(PrismaProvider) db: PrismaProvider) {
        this.db = db;
    }

    async get(request: UserAccountLoadRequestDto): Promise<UserAccount | null> {
        return this.db.userAccount.findUnique({
            where: {
                userId_serviceId: {
                    userId: request.userId,
                    serviceId: request.serviceId,
                },
            },
        });
    }

    async getMany(filter: UserAccountFilterOptions): Promise<UserAccount[]> {
        return this.db.userAccount.findMany({
            where: { ...filter },
        });
    }

    async post(request: UserAccountCreateRequestDto): Promise<UserAccount | null> {
        return this.db.userAccount.create({
            data: request,
        });
    }

    async put(request: UserAccountUpdateRequestDto): Promise<UserAccount | null> {
        const { userId, serviceId, ...data } = request;
        return this.db.userAccount.update({
            where: {
                userId_serviceId: { userId, serviceId },
            },
            data,
        });
    }

    async delete(request: UserAccountDeleteRequestDto): Promise<void> {
        await this.db.userAccount.delete({
            where: {
                userId_serviceId: {
                    userId: request.userId,
                    serviceId: request.serviceId,
                },
            },
        });
    }
}
