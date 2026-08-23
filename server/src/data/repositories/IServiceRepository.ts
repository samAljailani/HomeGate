import { ApplicationClientNames } from '@/types/enums'
import { CreateServiceModel, ServiceModel, UpdateServiceModel, ServiceFilterOptions } from '@/types/models/service'

export const IServiceRepository = Symbol('IServiceRepository')

export interface IServiceRepository {
    findById(id: number): Promise<ServiceModel | null>
    findByName(name: ApplicationClientNames): Promise<ServiceModel | null>
    findMany(filter: ServiceFilterOptions, take?: number, skip?: number): Promise<ServiceModel[]>
    count(filter: ServiceFilterOptions): Promise<number>
    findEnabled(): Promise<ServiceModel[]>
    isEnabled(name: ApplicationClientNames): Promise<boolean>
    setEnabled(name: ApplicationClientNames, enabled: boolean): Promise<ServiceModel | null>
    setUrl(name: ApplicationClientNames, url: string | null): Promise<ServiceModel | null>
    setImageUrl(name: ApplicationClientNames, imageUrl: string | null): Promise<ServiceModel | null>
    create(request: CreateServiceModel): Promise<ServiceModel | null>
    update(request: UpdateServiceModel): Promise<ServiceModel | null>
    delete(id: number): Promise<void>
}
