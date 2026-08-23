import { IApplicationManager } from '@/core/clients/IApplicationManager'
import { ApplicationClientNames } from '@/types/enums'

export function createApplicationClientMock(
    overrides: Partial<jest.Mocked<IApplicationManager>> = {}
): jest.Mocked<IApplicationManager> {
    return {
        name: ApplicationClientNames.Jellyfin,
        requiredInputs: { username: true, password: true, email: false, displayName: false },
        getUser: jest.fn(),
        getAllUsers: jest.fn(),
        createUser: jest.fn(),
        deleteUser: jest.fn(),
        disableUser: jest.fn(),
        enableUser: jest.fn(),
        resetPassword: jest.fn(),
        ...overrides,
    }
}
