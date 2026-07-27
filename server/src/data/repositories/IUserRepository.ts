import { CreateUserModel, UpdateUserModel, UserModel, UserFilterOptions } from '@/types/models/user'
import { Prisma } from '@prisma/generated'

export const IUserRepository = Symbol('IUserRepository')

export interface IUserRepository {
    findById(id: string): Promise<UserModel | null>
    findByEmail(email: string): Promise<UserModel | null>
    findMany(filter: UserFilterOptions, take?: number, skip?: number): Promise<UserModel[]>
    create(request: CreateUserModel): Promise<UserModel | null>
    createWithOAuthIdentity(
        request: CreateUserModel,
        providerId: number,
        profileId: string,
        tx?: Prisma.TransactionClient
    ): Promise<UserModel>
    update(request: UpdateUserModel): Promise<UserModel | null>
    usernameExists(username: string): Promise<boolean>
    softDelete(id: string): Promise<void>
    hardDelete(id: string): Promise<void>
    setEnabled(id: string, enabled: boolean): Promise<void>
}
