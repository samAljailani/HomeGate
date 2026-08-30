import { IServiceRepository } from '@/data/repositories/IServiceRepository'

export function createServiceRepositoryMock(): jest.Mocked<IServiceRepository> {
    return {
        findById: jest.fn(),
        findBySlug: jest.fn(),
        findByIntegrationProvider: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn(),
        findEnabled: jest.fn(),
        isEnabled: jest.fn(),
        setEnabled: jest.fn(),
        setSlug: jest.fn(),
        setImageUrl: jest.fn(),
        setUrl: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    }
}
