import { IOAuthProviderRepository } from '@/data/repositories/IOAuthProviderRepository'

export function createOAuthProviderRepositoryMock(): jest.Mocked<IOAuthProviderRepository> {
    return {
        findById: jest.fn(),
        findByName: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        setEnabled: jest.fn(),
    }
}
