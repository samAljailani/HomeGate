import { Test, TestingModule } from '@nestjs/testing'
import { LogService } from '@/api/services/log.service'
import { ILoggingRepository } from '@/data/repositories/ILoggingRepository'
import { LogModel } from '@/types/models/logs'
import { LogLevel, LogSortField, SortDirection } from '@/types/enums'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { createLoggerMock } from '../../mocks/logger.provider.mock'

function createLoggingRepositoryMock(): jest.Mocked<Pick<ILoggingRepository, 'findMany' | 'count'>> {
    return {
        findMany: jest.fn(),
        count: jest.fn(),
    }
}

function createLogFixture(overrides: Partial<LogModel> = {}): LogModel {
    return {
        id: 1,
        userId: null,
        sessionId: null,
        correlationId: null,
        logLevel: LogLevel.Log,
        context: null,
        message: 'test message',
        stackTrace: null,
        createdAt: new Date('2026-07-01T00:00:00Z'),
        ...overrides,
    }
}

describe('LogService', () => {
    let service: LogService
    let loggingRepositoryMock: ReturnType<typeof createLoggingRepositoryMock>

    beforeEach(async () => {
        loggingRepositoryMock = createLoggingRepositoryMock()

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                LogService,
                { provide: ILoggingRepository, useValue: loggingRepositoryMock },
                { provide: LoggingProvider, useValue: createLoggerMock() },
            ],
        }).compile()

        service = module.get<LogService>(LogService)
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
    })

    // #region list

    describe('list', () => {
        it('passes filter, take and skip to repository', async () => {
            loggingRepositoryMock.findMany.mockResolvedValue([])
            loggingRepositoryMock.count.mockResolvedValue(0)

            await service.list({ userId: 'user-1', logLevel: LogLevel.Error }, 10, 20)

            expect(loggingRepositoryMock.findMany).toHaveBeenCalledWith(
                { userId: 'user-1', logLevel: LogLevel.Error },
                10,
                20
            )
        })

        it('passes sort options to repository', async () => {
            loggingRepositoryMock.findMany.mockResolvedValue([])
            loggingRepositoryMock.count.mockResolvedValue(0)

            await service.list(
                { orderBy: LogSortField.Message, orderDirection: SortDirection.Asc },
                50,
                0
            )

            expect(loggingRepositoryMock.findMany).toHaveBeenCalledWith(
                { orderBy: LogSortField.Message, orderDirection: SortDirection.Asc },
                50,
                0
            )
        })

        it('returns paginated response with logs', async () => {
            const logs = [createLogFixture({ id: 1 }), createLogFixture({ id: 2 })]
            loggingRepositoryMock.findMany.mockResolvedValue(logs)
            loggingRepositoryMock.count.mockResolvedValue(2)

            const result = await service.list({}, 50, 0)

            expect(result.data).toHaveLength(2)
            expect(result.data[0]!.id).toBe(1)
            expect(result.total).toBe(2)
            expect(result.hasMore).toBe(false)
        })

        it('returns hasMore=true when more records exist', async () => {
            loggingRepositoryMock.findMany.mockResolvedValue([createLogFixture()])
            loggingRepositoryMock.count.mockResolvedValue(10)

            const result = await service.list({}, 1, 0)

            expect(result.hasMore).toBe(true)
            expect(result.total).toBe(10)
        })

        it('returns empty data when no logs exist', async () => {
            loggingRepositoryMock.findMany.mockResolvedValue([])
            loggingRepositoryMock.count.mockResolvedValue(0)

            const result = await service.list({}, 50, 0)

            expect(result.data).toEqual([])
            expect(result.total).toBe(0)
            expect(result.hasMore).toBe(false)
        })
    })

    // #endregion list
})
