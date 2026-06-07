import { IOAuthProviderRepository } from '@/repositories/IOAuthProviderRepository'

export function createOAuthProviderRepositoryMock(): jest.Mocked<IOAuthProviderRepository> {
    return {
        findById: jest.fn(),
        findByName: jest.fn(),
        findMany: jest.fn(),
    }
}
