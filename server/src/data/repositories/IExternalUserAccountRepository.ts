import {
    CreateExternalUserAccountModel,
    UpdateExternalUserAccountModel,
    ExternalUserAccountModel,
    ExternalUserAccountFilterOptions,
} from '@/types/models/externalUserAccount'

export const IExternalUserAccountRepository = Symbol('IExternalUserAccountRepository')

export interface IExternalUserAccountRepository {
    findBySubscriptionId(subscriptionId: string): Promise<ExternalUserAccountModel[]>
    findById(id: string): Promise<ExternalUserAccountModel | null>
    findMany(filter: ExternalUserAccountFilterOptions, take?: number, skip?: number): Promise<ExternalUserAccountModel[]>
    countBySubscriptionId(subscriptionId: string): Promise<number>
    create(request: CreateExternalUserAccountModel): Promise<ExternalUserAccountModel | null>
    update(id: string, request: UpdateExternalUserAccountModel): Promise<ExternalUserAccountModel | null>
    delete(id: string): Promise<void>
    deleteBySubscriptionId(subscriptionId: string): Promise<void>
}