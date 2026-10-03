import { Test, TestingModule } from '@nestjs/testing'
import { EnvRepository } from '@/data/repositories/env.repository'
import { resolve } from 'node:path'
import { ConfigService } from '@/api/services/config.service'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { ISystemMetadataRepository } from '@/data/repositories/ISystemMetadataRepository'
import { SystemConfigKey } from '@/types/models/SystemConfig'
import { systemDefaults } from '@/data/config.defaults'
import { createLoggerMock } from '../../mocks/logger.provider.mock'

function createSystemMetadataRepositoryMock() {
    return {
        get: jest.fn(),
        set: jest.fn().mockResolvedValue(undefined),
        exists: jest.fn().mockResolvedValue(true),
    }
}

describe('ConfigService', () => {
    let service: ConfigService
    let loggerMock: ReturnType<typeof createLoggerMock>
    let systemMetadataRepositoryMock: ReturnType<typeof createSystemMetadataRepositoryMock>

    const environment = {
        host: 'https://homegate.example',
        client: { buildPath: './client-build', imageStoragePath: './image-storage' },
    }
    const env = { getEnv: jest.fn() }

    beforeEach(async () => {
        env.getEnv.mockReturnValue(environment)
        loggerMock = createLoggerMock()
        systemMetadataRepositoryMock = createSystemMetadataRepositoryMock()

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ConfigService,
                { provide: EnvRepository, useValue: env },
                { provide: LoggingProvider, useValue: loggerMock },
                { provide: ISystemMetadataRepository, useValue: systemMetadataRepositoryMock },
            ],
        }).compile()

        service = module.get<ConfigService>(ConfigService)
    })

    it('resolves image library configuration explicitly', () => {
        expect(service.getImageLibraryConfig()).toEqual({
            directory: resolve('./image-storage'),
            seedDirectory: resolve('./client-build/images'),
            baseUrl: 'https://homegate.example/',
        })
    })

    it.each(['', '   ', undefined])('rejects missing image storage configuration: %s', (imageStoragePath) => {
        env.getEnv.mockReturnValue({ ...environment, client: { ...environment.client, imageStoragePath } })
        expect(() => service.getImageLibraryConfig()).toThrow(/IMAGE_STORAGE_PATH/)
    })

    it.each(['', undefined, 'invalid', 'file:///images'])(
        'rejects missing or invalid host configuration: %s',
        (host) => {
            env.getEnv.mockReturnValue({ ...environment, host })
            expect(() => service.getImageLibraryConfig()).toThrow(/HOST/)
        }
    )

    it('should be defined', () => {
        expect(service).toBeDefined()
    })

    describe('onApplicationBootstrap', () => {
        it('does not persist when all config keys already exist in DB', async () => {
            systemMetadataRepositoryMock.exists.mockResolvedValue(true)

            await service.onApplicationBootstrap()

            expect(systemMetadataRepositoryMock.set).not.toHaveBeenCalled()
        })

        it('persists defaults for each missing config key', async () => {
            systemMetadataRepositoryMock.exists.mockResolvedValue(false)

            await service.onApplicationBootstrap()

            const keys = Object.values(SystemConfigKey)
            expect(systemMetadataRepositoryMock.set).toHaveBeenCalledTimes(keys.length)

            for (const key of keys) {
                expect(systemMetadataRepositoryMock.set).toHaveBeenCalledWith(key, systemDefaults[key])
            }
        })

        it('only persists for keys that are missing', async () => {
            systemMetadataRepositoryMock.exists.mockImplementation(async (key: SystemConfigKey) => {
                return key !== SystemConfigKey.TASKS
            })

            await service.onApplicationBootstrap()

            expect(systemMetadataRepositoryMock.set).toHaveBeenCalledTimes(1)
            expect(systemMetadataRepositoryMock.set).toHaveBeenCalledWith(
                SystemConfigKey.TASKS,
                systemDefaults[SystemConfigKey.TASKS]
            )
        })

        it('logs when persisting defaults', async () => {
            systemMetadataRepositoryMock.exists.mockResolvedValue(false)

            await service.onApplicationBootstrap()

            expect(loggerMock.log).toHaveBeenCalledWith(expect.stringContaining('Persisted default configuration'))
        })
    })
})
