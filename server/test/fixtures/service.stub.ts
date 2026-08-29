import { ServiceModel } from '@/types/models/service'
import { AccountType, IntegrationProvider } from '@/types/enums'

export function createServiceFixture(overrides: Partial<ServiceModel> = {}): ServiceModel {
    return {
        id: 1,
        name: 'jellyfin',
        slug: 'jellyfin',
        enabled: true,
        url: null,
        imageUrl: null,
        accountType: AccountType.MANAGED,
        integrationProvider: IntegrationProvider.Jellyfin,
        accountSourceServiceId: null,
        defaultAllowed: true,
        ...overrides,
    }
}

export function createReferencedServiceFixture(overrides: Partial<ServiceModel> = {}): ServiceModel {
    return createServiceFixture({
        id: 2,
        name: 'jellyseerr',
        slug: 'jellyseerr',
        accountType: AccountType.REFERENCED,
        integrationProvider: null,
        accountSourceServiceId: 1,
        ...overrides,
    })
}

export function createNoAccountServiceFixture(overrides: Partial<ServiceModel> = {}): ServiceModel {
    return createServiceFixture({
        id: 3,
        name: 'wiki',
        slug: 'wiki',
        accountType: AccountType.NONE,
        integrationProvider: null,
        accountSourceServiceId: null,
        ...overrides,
    })
}
