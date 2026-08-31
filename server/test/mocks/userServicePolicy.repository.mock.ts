import { IUserServicePolicyRepository } from '@/data/repositories'
import { jest } from '@jest/globals'

export function createUserServicePolicyRepositoryMock(): jest.Mocked<IUserServicePolicyRepository> {
    const mock: jest.Mocked<IUserServicePolicyRepository> = {
        find: jest.fn(),
        findByUserId: jest.fn(),
        upsert: jest.fn(),
        delete: jest.fn(),
    }

    mock.find.mockResolvedValue(null)
    mock.findByUserId.mockResolvedValue([])
    mock.delete.mockResolvedValue(undefined)

    return mock
}