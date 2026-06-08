export type ServiceModel = {
    id: number
    name: string
    enabled: boolean
}

export type CreateServiceModel = Omit<ServiceModel, 'id'>

export type UpdateServiceModel = ServiceModel

export class ServiceFilterOptions {
    id?: number
    name?: string
    enabled?: boolean
    authSchemeId?: number
}
