import { Test, TestingModule } from '@nestjs/testing'
import { SystemMetadataRepository } from '@/data/repositories/systemMetadata.repository'
import { PrismaProvider } from '@/infrastructure/prisma.provider'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { SystemConfigKey } from '@/types/models/SystemConfig'
import { ScheduledTasks } from '@/types/enums'
import { systemDefaults } from '@/data/config.defaults'
import { createLoggerMock } from '../../mocks/logger.provider.mock'

function createPrismaMock() {
    return {
        systemMetadata: {
            findUnique: jest.fn(),
            upsert: jest.fn(),
        },
    }
}

describe('SystemMetadataRepository', () => {
    let repository: SystemMetadataRepository
    let prismaMock: ReturnType<typeof createPrismaMock>
    let loggerMock: ReturnType<typeof createLoggerMock>

    beforeEach(async () => {
        prismaMock = createPrismaMock()
        loggerMock = createLoggerMock()

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SystemMetadataRepository,
                { provide: PrismaProvider, useValue: prismaMock },
                { provide: LoggingProvider, useValue: loggerMock },
            ],
        }).compile()

        repository = module.get<SystemMetadataRepository>(SystemMetadataRepository)
    })

    it('should be defined', () => {
        expect(repository).toBeDefined()
    })

    // #region get

    describe('get', () => {
        it('returns defaults when no DB row exists', async () => {
            prismaMock.systemMetadata.findUnique.mockResolvedValue(null)

            const result = await repository.get(SystemConfigKey.TASKS)

            expect(result).toEqual(systemDefaults[SystemConfigKey.TASKS])
        })

        it('returns a clone of defaults (not a reference)', async () => {
            prismaMock.systemMetadata.findUnique.mockResolvedValue(null)

            const result = await repository.get(SystemConfigKey.TASKS)

            expect(result).not.toBe(systemDefaults[SystemConfigKey.TASKS])
        })

        it('deep merges DB values over defaults', async () => {
            prismaMock.systemMetadata.findUnique.mockResolvedValue({
                key: SystemConfigKey.TASKS,
                value: {
                    [ScheduledTasks.SYNC_CLIENT_ACCOUNTS]: { cronExpression: '0 0 */6 * * *' },
                },
            })

            const result = await repository.get(SystemConfigKey.TASKS)

            // Overridden field
            expect(result[ScheduledTasks.SYNC_CLIENT_ACCOUNTS].cronExpression).toBe('0 0 */6 * * *')
            // Sibling fields preserved from defaults
            expect(result[ScheduledTasks.SYNC_CLIENT_ACCOUNTS].enabled).toBe(
                systemDefaults[SystemConfigKey.TASKS][ScheduledTasks.SYNC_CLIENT_ACCOUNTS].enabled
            )
            expect(result[ScheduledTasks.SYNC_CLIENT_ACCOUNTS].runOnStartup).toBe(
                systemDefaults[SystemConfigKey.TASKS][ScheduledTasks.SYNC_CLIENT_ACCOUNTS].runOnStartup
            )
        })

        it('preserves other task configs when only one task is overridden', async () => {
            prismaMock.systemMetadata.findUnique.mockResolvedValue({
                key: SystemConfigKey.TASKS,
                value: {
                    [ScheduledTasks.PROCESS_SUBSCRIPTIONS]: { enabled: false },
                },
            })

            const result = await repository.get(SystemConfigKey.TASKS)

            // Overridden task
            expect(result[ScheduledTasks.PROCESS_SUBSCRIPTIONS].enabled).toBe(false)
            // Untouched tasks retain defaults
            expect(result[ScheduledTasks.CLEANUP_STALE_LOCAL_ACCOUNTS]).toEqual(
                systemDefaults[SystemConfigKey.TASKS][ScheduledTasks.CLEANUP_STALE_LOCAL_ACCOUNTS]
            )
        })

        it('ignores null override values and keeps defaults', async () => {
            prismaMock.systemMetadata.findUnique.mockResolvedValue({
                key: SystemConfigKey.TASKS,
                value: {
                    [ScheduledTasks.SYNC_CLIENT_ACCOUNTS]: { cronExpression: null, enabled: null },
                },
            })

            const result = await repository.get(SystemConfigKey.TASKS)

            expect(result[ScheduledTasks.SYNC_CLIENT_ACCOUNTS].cronExpression).toBe(
                systemDefaults[SystemConfigKey.TASKS][ScheduledTasks.SYNC_CLIENT_ACCOUNTS].cronExpression
            )
            expect(result[ScheduledTasks.SYNC_CLIENT_ACCOUNTS].enabled).toBe(
                systemDefaults[SystemConfigKey.TASKS][ScheduledTasks.SYNC_CLIENT_ACCOUNTS].enabled
            )
        })

        it('handles a full override without losing structure', async () => {
            const fullOverride = {
                [ScheduledTasks.PROCESS_SUBSCRIPTIONS]: {
                    enabled: false,
                    runOnStartup: false,
                    cronExpression: '0 30 * * * *',
                },
                [ScheduledTasks.SYNC_CLIENT_ACCOUNTS]: {
                    enabled: true,
                    runOnStartup: true,
                    cronExpression: '0 0 */3 * * *',
                },
                [ScheduledTasks.CLEANUP_STALE_LOCAL_ACCOUNTS]: {
                    enabled: false,
                    runOnStartup: false,
                    cronExpression: '0 0 0 * * *',
                },
                [ScheduledTasks.CLEANUP_PENDING_USERS]: {
                    enabled: false,
                    runOnStartup: false,
                    cronExpression: '0 0 0 * * *',
                },
            }

            prismaMock.systemMetadata.findUnique.mockResolvedValue({
                key: SystemConfigKey.TASKS,
                value: fullOverride,
            })

            const result = await repository.get(SystemConfigKey.TASKS)

            expect(result).toEqual(fullOverride)
        })

        it('logs and rethrows on prisma error', async () => {
            const error = new Error('connection lost')
            prismaMock.systemMetadata.findUnique.mockRejectedValue(error)

            await expect(repository.get(SystemConfigKey.TASKS)).rejects.toThrow()
            expect(loggerMock.error).toHaveBeenCalled()
        })
    })

    // #endregion get

    // #region set

    describe('set', () => {
        it('upserts the value for the given key', async () => {
            prismaMock.systemMetadata.upsert.mockResolvedValue(undefined)

            const value = systemDefaults[SystemConfigKey.TASKS]
            await repository.set(SystemConfigKey.TASKS, value)

            expect(prismaMock.systemMetadata.upsert).toHaveBeenCalledWith({
                where: { key: SystemConfigKey.TASKS },
                create: { key: SystemConfigKey.TASKS, value },
                update: { value },
            })
        })

        it('logs and rethrows on prisma error', async () => {
            const error = new Error('write failed')
            prismaMock.systemMetadata.upsert.mockRejectedValue(error)

            await expect(repository.set(SystemConfigKey.TASKS, systemDefaults[SystemConfigKey.TASKS])).rejects.toThrow()
            expect(loggerMock.error).toHaveBeenCalled()
        })
    })

    // #endregion set

    // #region exists

    describe('exists', () => {
        it('returns true when a row exists', async () => {
            prismaMock.systemMetadata.findUnique.mockResolvedValue({ key: SystemConfigKey.TASKS, value: {} })

            const result = await repository.exists(SystemConfigKey.TASKS)

            expect(result).toBe(true)
        })

        it('returns false when no row exists', async () => {
            prismaMock.systemMetadata.findUnique.mockResolvedValue(null)

            const result = await repository.exists(SystemConfigKey.TASKS)

            expect(result).toBe(false)
        })

        it('logs and rethrows on prisma error', async () => {
            const error = new Error('connection lost')
            prismaMock.systemMetadata.findUnique.mockRejectedValue(error)

            await expect(repository.exists(SystemConfigKey.TASKS)).rejects.toThrow()
            expect(loggerMock.error).toHaveBeenCalled()
        })
    })

    // #endregion exists
})
