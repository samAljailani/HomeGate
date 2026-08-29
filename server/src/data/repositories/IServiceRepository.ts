import { IntegrationProvider } from '@/types/enums'
import { CreateServiceModel, ServiceModel, UpdateServiceModel, ServiceFilterOptions } from '@/types/models/service'

export const IServiceRepository = Symbol('IServiceRepository')

export interface IServiceRepository {
    findById(id: number): Promise<ServiceModel | null>
    findBySlug(slug: string): Promise<ServiceModel | null>
    findByIntegrationProvider(provider: IntegrationProvider): Promise<ServiceModel | null>
    findMany(filter: ServiceFilterOptions, take?: number, skip?: number): Promise<ServiceModel[]>
    count(filter: ServiceFilterOptions): Promise<number>
    findEnabled(): Promise<ServiceModel[]>
    isEnabled(slug: string): Promise<boolean>
    setEnabled(slug: string, enabled: boolean): Promise<ServiceModel | null>
    setUrl(slug: string, url: string | null): Promise<ServiceModel | null>
    setImageUrl(slug: string, imageUrl: string | null): Promise<ServiceModel | null>
    create(request: CreateServiceModel): Promise<ServiceModel | null>
    update(request: UpdateServiceModel): Promise<ServiceModel | null>
    delete(id: number): Promise<void>
}
