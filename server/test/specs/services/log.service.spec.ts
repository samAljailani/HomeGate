import { Test, TestingModule } from '@nestjs/testing'
import { LogService } from '@/api/services/log.service'
import { ILoggingRepository } from '@/data/repositories/ILoggingRepository'
import { LogModel } from '@/types/models/logs'
import { LogLevel } from '@/types/enums'

function createLoggingRepositoryMock(): jest.Mocked<Pick<ILoggingRepository, 'findMany'>> {
    return {
        findMany: jest.fn(),
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
            providers: [LogService, { provide: ILoggingRepository, useValue: loggingRepositoryMock }],
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

            await service.list({ userId: 'user-1', logLevel: LogLevel.Error }, 10, 20)

            expect(loggingRepositoryMock.findMany).toHaveBeenCalledWith(
                { userId: 'user-1', logLevel: LogLevel.Error },
                10,
                20
            )
        })

        it('returns logs from repository', async () => {
            const logs = [createLogFixture({ id: 1 }), createLogFixture({ id: 2 })]
            loggingRepositoryMock.findMany.mockResolvedValue(logs)

            const result = await service.list({})

            expect(result).toHaveLength(2)
            expect(result[0]!.id).toBe(1)
        })

        it('uses empty filter when none provided', async () => {
            loggingRepositoryMock.findMany.mockResolvedValue([])

            await service.list({})

            expect(loggingRepositoryMock.findMany).toHaveBeenCalledWith({}, undefined, undefined)
        })

        it('returns empty array when no logs exist', async () => {
            loggingRepositoryMock.findMany.mockResolvedValue([])

            const result = await service.list({})

            expect(result).toEqual([])
        })
    })

    // #endregion list
})
