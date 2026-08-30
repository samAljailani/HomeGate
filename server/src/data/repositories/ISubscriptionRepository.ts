import {
    CreateSubscriptionModel,
    UpdateSubscriptionModel,
    SubscriptionModel,
    SubscriptionFilterOptions,
} from '@/types/models/subscription'

export const ISubscriptionRepository = Symbol('ISubscriptionRepository')

export interface ISubscriptionRepository {
    find(userId: string, serviceId: number): Promise<SubscriptionModel | null>
    findById(id: string): Promise<SubscriptionModel | null>
    findMany(filter: SubscriptionFilterOptions, take?: number, skip?: number): Promise<SubscriptionModel[]>
    count(filter?: SubscriptionFilterOptions): Promise<number>
    create(request: CreateSubscriptionModel): Promise<SubscriptionModel | null>
    update(request: UpdateSubscriptionModel): Promise<SubscriptionModel | null>
    delete(userId: string, serviceId: number): Promise<void>
    deleteByServiceId(serviceId: number): Promise<number>
}
