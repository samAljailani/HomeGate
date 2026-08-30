import { IAccountIntegrationProvider } from '@/core/integrations/IAccountIntegrationProvider'
import { IntegrationProvider } from '@/types/enums'

export function createAccountIntegrationProviderMock(
    overrides: Partial<jest.Mocked<IAccountIntegrationProvider>> = {}
): jest.Mocked<IAccountIntegrationProvider> {
    return {
        name: IntegrationProvider.Jellyfin,
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
