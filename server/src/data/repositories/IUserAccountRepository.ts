import {
    CreateUserAccountModel,
    UpdateUserAccountModel,
    UserAccountModel,
    UserAccountFilterOptions,
} from '@/types/models/userAccount'

export const IUserAccountRepository = Symbol('IUserAccountRepository')

export interface IUserAccountRepository {
    find(userId: string, serviceId: number): Promise<UserAccountModel | null>
    findById(id: string): Promise<UserAccountModel | null>
    findMany(filter: UserAccountFilterOptions, take?: number, skip?: number): Promise<UserAccountModel[]>
    create(request: CreateUserAccountModel): Promise<UserAccountModel | null>
    update(request: UpdateUserAccountModel): Promise<UserAccountModel | null>
    delete(userId: string, serviceId: number): Promise<void>
}
