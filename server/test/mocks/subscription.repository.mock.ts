import { ISubscriptionRepository } from '@/data/repositories/ISubscriptionRepository'
import { IExternalUserAccountRepository } from '@/data/repositories/IExternalUserAccountRepository'

export function createSubscriptionRepositoryMock(): jest.Mocked<ISubscriptionRepository> {
    return {
        find: jest.fn(),
        findById: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        delete: jest.fn(),
        deleteByServiceId: jest.fn().mockResolvedValue(0),
    }
}

export function createExternalUserAccountRepositoryMock(): jest.Mocked<IExternalUserAccountRepository> {
    return {
        findBySubscriptionId: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    }
}
