import { UserService } from '@/api/services/user.service'

export function createUserServiceMock(): jest.Mocked<
    Pick<UserService, 'getUserById' | 'getUserByEmail' | 'getUserOAuthIdentity' | 'hasIdentityForProvider' | 'CreateUserOAuthIdentity'>
> {
    return {
        getUserById: jest.fn(),
        getUserByEmail: jest.fn(),
        getUserOAuthIdentity: jest.fn(),
        hasIdentityForProvider: jest.fn(),
        CreateUserOAuthIdentity: jest.fn(),
    }
}
