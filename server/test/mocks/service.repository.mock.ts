import { IServiceRepository } from '@/data/repositories/IServiceRepository'

export function createServiceRepositoryMock(): jest.Mocked<IServiceRepository> {
    return {
        findById: jest.fn(),
        findByName: jest.fn(),
        findMany: jest.fn(),
        findEnabled: jest.fn(),
        isEnabled: jest.fn(),
        setEnabled: jest.fn(),
        setImageUrl: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    }
}
