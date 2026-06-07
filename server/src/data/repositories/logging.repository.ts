import { PrismaProvider } from '@/infrastructure/prisma.provider'
import { CreateLogModel } from '@/types/models/logs'
import { Injectable, Inject } from '@nestjs/common'
import { ILoggingRepository } from './ILoggingRepository'
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
}
