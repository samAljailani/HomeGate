import { Injectable, Inject } from '@nestjs/common'
import { PrismaProvider } from '@/infrastructure/prisma.provider'
import { LoggingProvider } from '@/infrastructure/logger.provider'

@Injectable()
export abstract class BaseRepository {
    protected readonly db: PrismaProvider
    protected readonly logger: LoggingProvider

    constructor(
        @Inject(PrismaProvider) db: PrismaProvider,
        @Inject(LoggingProvider) logger: LoggingProvider
    ) {
        this.db = db
        this.logger = logger
        this.logger.setContext(this.constructor.name)
    }
}
