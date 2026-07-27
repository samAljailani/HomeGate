import { IInviteRepository } from '@/data/repositories/IInviteRepository'

export function createInviteRepositoryMock(): jest.Mocked<IInviteRepository> {
    return {
        findById: jest.fn(),
        findByToken: jest.fn(),
        findActivePendingByEmail: jest.fn(),
        findAll: jest.fn(),
        create: jest.fn(),
        claim: jest.fn(),
        incrementFailedAttempts: jest.fn(),
        revoke: jest.fn(),
    }
}
