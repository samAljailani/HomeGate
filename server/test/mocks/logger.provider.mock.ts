import { LoggingProvider } from '@/infrastructure/logger.provider'

export function createLoggerMock(): jest.Mocked<
    Pick<LoggingProvider, 'setContext' | 'log' | 'warn' | 'error' | 'fatal' | 'debug' | 'verbose'>
> {
    return {
        setContext: jest.fn(),
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        fatal: jest.fn(),
        debug: jest.fn(),
        verbose: jest.fn(),
    }
}
