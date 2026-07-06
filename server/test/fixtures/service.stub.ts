import { ServiceModel } from '@/types/models/service'

export function createServiceFixture(overrides: Partial<ServiceModel> = {}): ServiceModel {
    return {
        id: 1,
        name: 'jellyfin',
        enabled: true,
        url: null,
        ...overrides,
    }
}
