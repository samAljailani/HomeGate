import { Injectable, Inject } from '@nestjs/common'
import { PrismaProvider } from '@/infrastructure/prisma.provider'
import { IUserRepository } from './IUserRepository'
import type { UserModel as PrismaUser } from '@prisma/generated/models'
import { CreateUserModel, UpdateUserModel, UserModel, UserFilterOptions } from '@/types/models/user'

@Injectable()
export class UserRepository implements IUserRepository {
    private db: PrismaProvider
    constructor(@Inject(PrismaProvider) db: PrismaProvider) {
        this.db = db
    }

    private mapUser(user: PrismaUser): UserModel {
        return {
            id: user.id,
            email: user.email,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            isAdmin: user.isAdmin,
            isDeleted: user.isDeleted,
            createdAt: user.createdAt,
        }
    }

    async findById(id: string): Promise<UserModel | null> {
        const user = await this.db.user.findUnique({
            where: { id: id },
        })

        return user ? this.mapUser(user) : null
    }

    async findByEmail(email: string): Promise<UserModel | null> {
        const user = await this.db.user.findUnique({
            where: { email: email },
        })

        return user ? this.mapUser(user) : null
    }

    async findMany(filter: UserFilterOptions, take?: number): Promise<UserModel[]> {
        const users = await this.db.user.findMany({
            where: { ...filter },
            ...(take !== undefined && { take }),
        })

        return users.map((user) => this.mapUser(user))
    }

    async create(request: CreateUserModel): Promise<UserModel | null> {
        const user = await this.db.user.create({
            data: request,
        })

        return this.mapUser(user)
    }

    async usernameExists(username: string): Promise<boolean> {
        const count = await this.db.user.count({ where: { username } })
        return count > 0
    }

    async update(request: UpdateUserModel): Promise<UserModel | null> {
        const { id, ...data } = request
        const user = await this.db.user.update({
            where: { id },
            data,
        })

        return this.mapUser(user)
    }

    async delete(id: string): Promise<void> {
        await this.db.user.delete({
            where: { id: id },
        })
    }
}
