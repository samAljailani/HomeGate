import { AccountType, IntegrationProvider } from '@/types/enums'

export type ServiceModel = {
    id: number
    name: string
    slug: string
    enabled: boolean
    url: string | null
    imageUrl: string | null

    accountType: AccountType
    /** Null for REFERENCED and NONE services: there is no integration to manage. */
    integrationProvider: IntegrationProvider | null
    /** Set for REFERENCED services: the service whose account this one relies on. */
    accountSourceServiceId: number | null
    defaultAllowed: boolean
}

export type CreateServiceModel = Omit<ServiceModel, 'id'>

export type UpdateServiceModel = Partial<Omit<ServiceModel, 'id'>> & { id: number }

export class ServiceFilterOptions {
    id?: number
    name?: string
    slug?: string
    enabled?: boolean
    accountType?: AccountType
    accountSourceServiceId?: number
}
