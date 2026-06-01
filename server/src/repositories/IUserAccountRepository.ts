import { CreateUserAccountModel, UpdateUserAccountModel, UserAccountModel } from '@/types/models/userAccount'
import { UserAccountFilterOptions } from '@/types/dtos/userAccountDto'

export const IUserAccountRepository = Symbol('IUserAccountRepository')

export interface IUserAccountRepository {
    find(userId: string, serviceId: number): Promise<UserAccountModel | null>
    findMany(filter: UserAccountFilterOptions): Promise<UserAccountModel[]>
    create(request: CreateUserAccountModel): Promise<UserAccountModel | null>
    update(request: UpdateUserAccountModel): Promise<UserAccountModel | null>
    delete(userId: string, serviceId: number): Promise<void>
}