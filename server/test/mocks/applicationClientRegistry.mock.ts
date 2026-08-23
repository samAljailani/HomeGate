import { ApplicationClientRegistry } from '@/core/clients/applicationClientRegistry'

export function createApplicationClientRegistryMock(): jest.Mocked<
    Pick<
        ApplicationClientRegistry,
        'getEnabled' | 'get' | 'has' | 'getAll' | 'register' | 'isEnabled' | 'enable' | 'disable'
    >
> {
    return {
        getEnabled: jest.fn(),
        get: jest.fn(),
        has: jest.fn(),
        getAll: jest.fn(),
        register: jest.fn(),
        isEnabled: jest.fn(),
        enable: jest.fn(),
        disable: jest.fn(),
    }
}
