import { Injectable, Inject } from '@nestjs/common';
import { PrismaProvider } from '@/providers/prisma.provider';
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
                user_id_service_id: {
                    user_id: request.user_id,
                    service_id: request.service_id,
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
            data: { ...request },
        });
    }

    async put(request: UserAccountUpdateRequestDto): Promise<UserAccount | null> {
        const { user_id, service_id, ...data } = request;
        return this.db.userAccount.update({
            where: {
                user_id_service_id: { user_id, service_id },
            },
            data,
        });
    }

    async delete(request: UserAccountDeleteRequestDto): Promise<void> {
        await this.db.userAccount.delete({
            where: {
                user_id_service_id: {
                    user_id: request.user_id,
                    service_id: request.service_id,
                },
            },
        });
    }
}
