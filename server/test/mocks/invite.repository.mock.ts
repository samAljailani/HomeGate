import { IInviteRepository } from '@/data/repositories/IInviteRepository'

export function createInviteRepositoryMock(): jest.Mocked<IInviteRepository> {
    return {
        findById: jest.fn(),
        findByToken: jest.fn(),
        findActivePendingByEmail: jest.fn(),
        findAll: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        claim: jest.fn(),
        incrementFailedAttempts: jest.fn(),
        revoke: jest.fn(),
    }
}
