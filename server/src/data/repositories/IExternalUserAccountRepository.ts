import {
    CreateExternalUserAccountModel,
    UpdateExternalUserAccountModel,
    ExternalUserAccountModel,
    ExternalUserAccountFilterOptions,
} from '@/types/models/externalUserAccount'

export const IExternalUserAccountRepository = Symbol('IExternalUserAccountRepository')

export interface IExternalUserAccountRepository {
    findBySubscriptionId(subscriptionId: string): Promise<ExternalUserAccountModel | null>
    findMany(filter: ExternalUserAccountFilterOptions, take?: number, skip?: number): Promise<ExternalUserAccountModel[]>
    create(request: CreateExternalUserAccountModel): Promise<ExternalUserAccountModel | null>
    update(request: UpdateExternalUserAccountModel): Promise<ExternalUserAccountModel | null>
    delete(subscriptionId: string): Promise<void>
}
