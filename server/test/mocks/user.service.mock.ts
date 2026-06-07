import { UserService } from '@/services/user.service'

export function createUserServiceMock(): jest.Mocked<
    Pick<UserService, 'getUserByEmail' | 'getUserOAuthIdentity' | 'CreateUserOAuthIdentity'>
> {
    return {
        getUserByEmail: jest.fn(),
        getUserOAuthIdentity: jest.fn(),
        CreateUserOAuthIdentity: jest.fn(),
    }
}
