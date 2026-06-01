import { CreateServiceModel, ServiceModel, UpdateServiceModel, ServiceFilterOptions } from '@/types/models/service'

export const IServiceRepository = Symbol('IServiceRepository')

export interface IServiceRepository {
    findById(id: number): Promise<ServiceModel | null>
    findByName(name: string): Promise<ServiceModel | null>
    findMany(filter: ServiceFilterOptions): Promise<ServiceModel[]>
    create(request: CreateServiceModel): Promise<ServiceModel | null>
    update(request: UpdateServiceModel): Promise<ServiceModel | null>
    delete(id: number): Promise<void>
}
