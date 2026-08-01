import { UserModel, UserStatus } from '@/types/models/user'

export function createUserFixture(overrides: Partial<UserModel> = {}): UserModel {
    return {
        id: 'xxx',
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        isAdmin: false,
        isDeleted: false,
        isEnabled: true,
        status: UserStatus.ACTIVE,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        ...overrides,
    }
}
