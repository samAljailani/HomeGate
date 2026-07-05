import { AuthService } from '@/api/services/auth.service'

export function createAuthServiceMock(): jest.Mocked<Pick<AuthService, 'authorize' | 'signOut' | 'signUp'>> {
    return {
        authorize: jest.fn(),
        signOut: jest.fn(),
        signUp: jest.fn(),
    }
}
