import { IUserAccountRepository } from '@/data/repositories/IUserAccountRepository'

export function createUserAccountRepositoryMock(): jest.Mocked<IUserAccountRepository> {
    return {
        find: jest.fn(),
        findById: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    }
}
