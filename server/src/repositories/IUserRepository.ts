import { UserDeleteRequestDto, UserFilterOptions } from '@/types/dtos/userDto'
import { CreateUserModel, UpdateUserModel, UserModel } from '@/types/models/user'

export const IUserRepository = Symbol('IUserRepository')

export interface IUserRepository {
    findById(id: string): Promise<UserModel | null>
    findByEmail(email: string): Promise<UserModel | null>
    findMany(filter: UserFilterOptions, take?: number): Promise<UserModel[]>
    create(request: CreateUserModel): Promise<UserModel | null>
    update(request: UpdateUserModel): Promise<UserModel | null>
    usernameExists(username: string): Promise<boolean>
    delete(request: UserDeleteRequestDto): Promise<void>
}
