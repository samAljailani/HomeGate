import { CreateUserModel, UpdateUserModel, UserModel, UserFilterOptions } from '@/types/models/user'

export const IUserRepository = Symbol('IUserRepository')

export interface IUserRepository {
    findById(id: string): Promise<UserModel | null>
    findByEmail(email: string): Promise<UserModel | null>
    findMany(filter: UserFilterOptions, take?: number): Promise<UserModel[]>
    create(request: CreateUserModel): Promise<UserModel | null>
    createWithOAuthIdentity(request: CreateUserModel, providerId: number, profileId: string): Promise<UserModel>
    update(request: UpdateUserModel): Promise<UserModel | null>
    usernameExists(username: string): Promise<boolean>
    delete(id: string): Promise<void>
}
