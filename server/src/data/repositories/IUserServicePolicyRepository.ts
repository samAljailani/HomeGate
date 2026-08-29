import { UserServicePolicyModel, CreateUserServicePolicyModel } from '@/types/models/userServicePolicy'

export const IUserServicePolicyRepository = Symbol('IUserServicePolicyRepository')

export interface IUserServicePolicyRepository {
    find(userId: string, serviceId: number): Promise<UserServicePolicyModel | null>
    findByUserId(userId: string): Promise<UserServicePolicyModel[]>
    upsert(request: CreateUserServicePolicyModel): Promise<UserServicePolicyModel>
    delete(userId: string, serviceId: number): Promise<void>
}
