import { Injectable, Inject } from '@nestjs/common'
import { PrismaProvider } from '@/infrastructure/prisma.provider'
import { UserModel } from '@prisma/generated/models'
import {
    UserCreateRequestDto,
    UserDeleteRequestDto,
    UserFilterOptions,
    UserLoadRequestDto,
    UserUpdateRequestDto,
} from '@/types/dtos/userDto'
import { IUserRepository } from './IUserRepository'

@Injectable()
export class UserRepository implements IUserRepository {
    private db: PrismaProvider
    constructor(@Inject(PrismaProvider) db: PrismaProvider) {
        this.db = db
    }

    async get(request: UserLoadRequestDto): Promise<UserModel | null> {
        const user = await this.db.user.findUnique({
            where: { id: request.userId },
        })

        return user
    }

    async getUserByEmail(email: string): Promise<UserModel | null> {
        const user = await this.db.user.findUnique({
            where: { email: email },
        })

        return user
    }

    async getMany(filter: UserFilterOptions, take?: number): Promise<UserModel[]> {
        return this.db.user.findMany({
            where: { ...filter },
            ...(take !== undefined && { take }),
        })
    }

    async post(request: UserCreateRequestDto): Promise<UserModel | null> {
        const user = await this.db.user.create({
            data: request,
        })

        return user
    }

    async existsByUsername(username: string): Promise<boolean> {
        const count = await this.db.user.count({ where: { username } })
        return count > 0
    }

    async put(request: UserUpdateRequestDto): Promise<UserModel | null> {
        const { userId, ...data } = request
        return this.db.user.update({
            where: { id: userId },
            data,
        })
    }

    async delete(request: UserDeleteRequestDto): Promise<void> {
        await this.db.user.delete({
            where: { id: request.userId },
        })
    }
}
