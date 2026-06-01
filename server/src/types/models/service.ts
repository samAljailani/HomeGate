export type ServiceModel = {
    id: number
    name: string
    authSchemeId: number
}

export type CreateServiceModel = Omit<ServiceModel, 'id'>

export type UpdateServiceModel = ServiceModel
