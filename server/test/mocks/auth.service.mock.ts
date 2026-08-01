import { AuthService } from '@/api/services/auth.service'

export function createAuthServiceMock(): jest.Mocked<
    Pick<AuthService, 'authorize' | 'signOut' | 'beginSignUp' | 'completeSignUp'>
> {
    return {
        authorize: jest.fn(),
        signOut: jest.fn(),
        beginSignUp: jest.fn(),
        completeSignUp: jest.fn(),
    }
}
