import { PrismaProvider } from '@/infrastructure/prisma.provider'
import { CreateLogModel, LogModel } from '@/types/models/logs'
import { Injectable, Inject } from '@nestjs/common'
import { ILoggingRepository, LogFilterOptions } from './ILoggingRepository'
import { LogLevel } from '@prisma/generated'

@Injectable()
export class LoggingRepository implements ILoggingRepository {
    constructor(@Inject(PrismaProvider) private db: PrismaProvider) {}

    public async create(log: CreateLogModel): Promise<boolean> {
        // logging should not crash the request flow, and hence this db call is wrapped in a try catch.
        try {
            await this.db.log.create({
                data: {
                    userId: log.userId ?? null,
                    sessionId: log.sessionId ?? null,
                    correlationId: log.correlationId ?? null,
                    logLevel: log.logLevel as LogLevel,
                    context: log.context ?? null,
                    message: log.message,
                    stackTrace: log.stackTrace ?? null,
                },
            })
        } catch {
            return false
        }

        return true
    }

    public async findMany(filter: LogFilterOptions, take: number = 50, skip: number = 0): Promise<LogModel[]> {
        const logs = await this.db.log.findMany({
            where: this.buildWhere(filter),
            orderBy: { createdAt: 'desc' },
            take,
            skip,
        })
        return logs.map((log) => ({
            id: log.id,
            userId: log.userId,
            sessionId: log.sessionId,
            correlationId: log.correlationId,
            logLevel: log.logLevel,
            context: log.context,
            message: log.message,
            stackTrace: log.stackTrace,
            createdAt: log.createdAt,
        }))
    }

    public async count(filter: LogFilterOptions): Promise<number> {
        return this.db.log.count({
            where: this.buildWhere(filter),
        })
    }

    public async deleteOlderThan(cutoff: Date): Promise<number> {
        const result = await this.db.log.deleteMany({
            where: { createdAt: { lt: cutoff } },
        })
        return result.count
    }

    private buildWhere(filter: LogFilterOptions) {
        return {
            ...(filter.userId !== undefined ? { userId: filter.userId } : {}),
            ...(filter.sessionId !== undefined ? { sessionId: filter.sessionId } : {}),
            ...(filter.logLevel !== undefined ? { logLevel: filter.logLevel as LogLevel } : {}),
            ...((filter.createdAfter || filter.createdBefore) && {
                createdAt: {
                    ...(filter.createdAfter && { gte: filter.createdAfter }),
                    ...(filter.createdBefore && { lte: filter.createdBefore }),
                },
            }),
            ...(filter.search !== undefined && filter.search !== '' && {
                OR: [
                    { message: { contains: filter.search, mode: 'insensitive' as const } },
                    { context: { contains: filter.search, mode: 'insensitive' as const } },
                    { stackTrace: { contains: filter.search, mode: 'insensitive' as const } },
                ],
            }),
        }
    }
}
