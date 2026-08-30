import { Test, TestingModule } from '@nestjs/testing'
import { LoggingRepository } from '@/data/repositories/logging.repository'
import { PrismaProvider } from '@/infrastructure/prisma.provider'
import { LogSortField, SortDirection } from '@/types/enums'

function createPrismaMock() {
    return {
        log: {
            findMany: jest.fn(),
        },
    }
}

describe('LoggingRepository', () => {
    let repository: LoggingRepository
    let prismaMock: ReturnType<typeof createPrismaMock>

    beforeEach(async () => {
        prismaMock = createPrismaMock()

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                LoggingRepository,
                { provide: PrismaProvider, useValue: prismaMock },
            ],
        }).compile()

        repository = module.get<LoggingRepository>(LoggingRepository)
    })

    it('should be defined', () => {
        expect(repository).toBeDefined()
    })

    // #region findMany

    describe('findMany', () => {
        it('orders by createdAt descending, newest first, by default', async () => {
            prismaMock.log.findMany.mockResolvedValue([])

            await repository.findMany({})

            expect(prismaMock.log.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ orderBy: { createdAt: SortDirection.Desc } })
            )
        })

        it('applies the requested sort field and direction', async () => {
            prismaMock.log.findMany.mockResolvedValue([])

            await repository.findMany({ orderBy: LogSortField.Message, orderDirection: SortDirection.Asc })

            expect(prismaMock.log.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ orderBy: { message: SortDirection.Asc } })
            )
        })

        it('applies a single-field sort when only orderBy is provided', async () => {
            prismaMock.log.findMany.mockResolvedValue([])

            await repository.findMany({ orderBy: LogSortField.LogLevel })

            expect(prismaMock.log.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ orderBy: { logLevel: SortDirection.Desc } })
            )
        })

        it('passes take and skip through', async () => {
            prismaMock.log.findMany.mockResolvedValue([])

            await repository.findMany({}, 25, 100)

            expect(prismaMock.log.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ take: 25, skip: 100 })
            )
        })

        it('maps prisma rows to LogModel fields', async () => {
            const row = {
                id: 1,
                userId: 'user-1',
                sessionId: 'session-1',
                correlationId: 'corr-1',
                logLevel: 'warn',
                context: 'ForwardAuthController',
                message: 'denied',
                stackTrace: null,
                createdAt: new Date('2026-07-01T00:00:00Z'),
            }
            prismaMock.log.findMany.mockResolvedValue([row])

            const result = await repository.findMany({})

            expect(result).toEqual([row])
        })
    })

    // #endregion findMany
})