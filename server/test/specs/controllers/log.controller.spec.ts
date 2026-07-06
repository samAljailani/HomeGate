import { Test, TestingModule } from '@nestjs/testing'
import { LogController } from '@/api/controllers/log.controller'
import { LogService } from '@/api/services/log.service'
import { LogListRequestDto } from '@/types/dtos/logDto'
import { LogLevel } from '@/types/enums'
import { LogModel } from '@/types/models/logs'

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
            logServiceMock.list.mockResolvedValue([])

            await controller.list({} as LogListRequestDto)

            expect(logServiceMock.list).toHaveBeenCalledWith({}, undefined, undefined)
        })

        it('passes userId filter when provided', async () => {
            logServiceMock.list.mockResolvedValue([])
            const query: LogListRequestDto = { userId: 'user-uuid-1' }

            await controller.list(query)

            expect(logServiceMock.list).toHaveBeenCalledWith(
                expect.objectContaining({ userId: 'user-uuid-1' }),
                undefined,
                undefined
            )
        })

        it('passes logLevel filter when provided', async () => {
            logServiceMock.list.mockResolvedValue([])
            const query: LogListRequestDto = { logLevel: LogLevel.Error }

            await controller.list(query)

            expect(logServiceMock.list).toHaveBeenCalledWith(
                expect.objectContaining({ logLevel: LogLevel.Error }),
                undefined,
                undefined
            )
        })

        it('passes take and skip when provided', async () => {
            logServiceMock.list.mockResolvedValue([])
            const query: LogListRequestDto = { take: 10, skip: 5 }

            await controller.list(query)

            expect(logServiceMock.list).toHaveBeenCalledWith({}, 10, 5)
        })

        it('does not include undefined keys in the filter', async () => {
            logServiceMock.list.mockResolvedValue([])
            const query: LogListRequestDto = { take: 20 }

            await controller.list(query)

            const filterArg = logServiceMock.list.mock.calls[0][0]
            expect(filterArg).not.toHaveProperty('userId')
            expect(filterArg).not.toHaveProperty('logLevel')
        })

        it('returns logs from the service', async () => {
            const logs = [createLogFixture({ id: 1 }), createLogFixture({ id: 2 })]
            logServiceMock.list.mockResolvedValue(logs)

            const result = await controller.list({} as LogListRequestDto)

            expect(result).toHaveLength(2)
            expect(result[0].id).toBe(1)
        })
    })

    // #endregion list
})
