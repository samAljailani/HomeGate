import { IntegrationProvider } from '@/types/enums'
import { CreateServiceModel, ServiceModel, UpdateServiceModel, ServiceFilterOptions } from '@/types/models/service'

export const IServiceRepository = Symbol('IServiceRepository')

export interface IServiceRepository {
    findById(id: number): Promise<ServiceModel | null>
    findByName(name: IntegrationProvider): Promise<ServiceModel | null>
    findMany(filter: ServiceFilterOptions, take?: number, skip?: number): Promise<ServiceModel[]>
    count(filter: ServiceFilterOptions): Promise<number>
    findEnabled(): Promise<ServiceModel[]>
    isEnabled(name: IntegrationProvider): Promise<boolean>
    setEnabled(name: IntegrationProvider, enabled: boolean): Promise<ServiceModel | null>
    setUrl(name: IntegrationProvider, url: string | null): Promise<ServiceModel | null>
    setImageUrl(name: IntegrationProvider, imageUrl: string | null): Promise<ServiceModel | null>
    create(request: CreateServiceModel): Promise<ServiceModel | null>
    update(request: UpdateServiceModel): Promise<ServiceModel | null>
    delete(id: number): Promise<void>
}
