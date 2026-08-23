import { Test, TestingModule } from '@nestjs/testing'
import { LogController } from '@/api/controllers/log.controller'
import { LogService } from '@/api/services/log.service'
import { LogListRequestDto } from '@/types/dtos/logDto'
import { LogLevel } from '@/types/enums'
import { LogModel } from '@/types/models/logs'
import { PaginatedResponseDto } from '@/types/dtos/paginationDto'

function createLogServiceMock(): jest.Mocked<Pick<LogService, 'list'>> {
    return {
        list: jest.fn(),
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

describe('LogController', () => {
    let controller: LogController
    let logServiceMock: ReturnType<typeof createLogServiceMock>

    beforeEach(async () => {
        logServiceMock = createLogServiceMock()

        const module: TestingModule = await Test.createTestingModule({
            controllers: [LogController],
            providers: [{ provide: LogService, useValue: logServiceMock }],
        }).compile()

        controller = module.get<LogController>(LogController)
    })

    it('should be defined', () => {
        expect(controller).toBeDefined()
    })

    // #region list

    describe('list', () => {
        it('passes empty filter when no query params provided', async () => {
            logServiceMock.list.mockResolvedValue(new PaginatedResponseDto([], 0, 0))

            await controller.list({} as LogListRequestDto)

            expect(logServiceMock.list).toHaveBeenCalledWith({}, undefined, undefined)
        })

        it('passes userId filter when provided', async () => {
            logServiceMock.list.mockResolvedValue(new PaginatedResponseDto([], 0, 0))
            const query: LogListRequestDto = { userId: 'user-uuid-1' }

            await controller.list(query)

            expect(logServiceMock.list).toHaveBeenCalledWith(
                expect.objectContaining({ userId: 'user-uuid-1' }),
                undefined,
                undefined
            )
        })

        it('passes logLevel filter when provided', async () => {
            logServiceMock.list.mockResolvedValue(new PaginatedResponseDto([], 0, 0))
            const query: LogListRequestDto = { logLevel: LogLevel.Error }

            await controller.list(query)

            expect(logServiceMock.list).toHaveBeenCalledWith(
                expect.objectContaining({ logLevel: LogLevel.Error }),
                undefined,
                undefined
            )
        })

        it('passes sessionId filter when provided', async () => {
            logServiceMock.list.mockResolvedValue(new PaginatedResponseDto([], 0, 0))
            const query: LogListRequestDto = { sessionId: 'session-uuid-1' }

            await controller.list(query)

            expect(logServiceMock.list).toHaveBeenCalledWith(
                expect.objectContaining({ sessionId: 'session-uuid-1' }),
                undefined,
                undefined
            )
        })

        it('converts createdAfter/createdBefore to Dates when provided', async () => {
            logServiceMock.list.mockResolvedValue(new PaginatedResponseDto([], 0, 0))
            const query: LogListRequestDto = {
                createdAfter: '2026-01-01T00:00:00Z',
                createdBefore: '2026-02-01T00:00:00Z',
            }

            await controller.list(query)

            const filterArg = logServiceMock.list.mock.calls[0]![0]
            expect(filterArg.createdAfter).toEqual(new Date('2026-01-01T00:00:00Z'))
            expect(filterArg.createdBefore).toEqual(new Date('2026-02-01T00:00:00Z'))
        })

        it('passes search filter when provided', async () => {
            logServiceMock.list.mockResolvedValue(new PaginatedResponseDto([], 0, 0))
            const query: LogListRequestDto = { search: 'timeout' }

            await controller.list(query)

            expect(logServiceMock.list).toHaveBeenCalledWith(
                expect.objectContaining({ search: 'timeout' }),
                undefined,
                undefined
            )
        })

        it('passes take and skip when provided', async () => {
            logServiceMock.list.mockResolvedValue(new PaginatedResponseDto([], 0, 0))
            const query: LogListRequestDto = { take: 10, skip: 5 }

            await controller.list(query)

            expect(logServiceMock.list).toHaveBeenCalledWith({}, 10, 5)
        })

        it('does not include undefined keys in the filter', async () => {
            logServiceMock.list.mockResolvedValue(new PaginatedResponseDto([], 0, 0))
            const query: LogListRequestDto = { take: 20 }

            await controller.list(query)

            const filterArg = logServiceMock.list.mock.calls[0]![0]
            expect(filterArg).not.toHaveProperty('userId')
            expect(filterArg).not.toHaveProperty('logLevel')
        })

        it('returns logs from the service', async () => {
            const logs = [createLogFixture({ id: 1 }), createLogFixture({ id: 2 })]
            logServiceMock.list.mockResolvedValue(new PaginatedResponseDto(logs, 2, 0))

            const result = await controller.list({} as LogListRequestDto)

            expect(result.data).toHaveLength(2)
            expect(result.data[0]!.id).toBe(1)
        })
    })

    // #endregion list
})
