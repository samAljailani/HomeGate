export type ServiceModel = {
    id: number
    name: string
    enabled: boolean
    url: string | null
    imageUrl: string | null
}

export type CreateServiceModel = Omit<ServiceModel, 'id'>

export type UpdateServiceModel = ServiceModel

export class ServiceFilterOptions {
    id?: number
    name?: string
    enabled?: boolean
    authSchemeId?: number
}
