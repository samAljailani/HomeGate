import { Injectable, Inject } from '@nestjs/common'
import { ILoggingRepository, LogFilterOptions } from '@/data/repositories/ILoggingRepository'
import { LogModel } from '@/types/models/logs'
import { PaginatedResponseDto } from '@/types/dtos/paginationDto'
import { BaseService } from './base.service'
import { LoggingProvider } from '@/infrastructure/logger.provider'

@Injectable()
export class LogService extends BaseService {
    constructor(
        @Inject(ILoggingRepository) private readonly loggingRepository: ILoggingRepository,
        @Inject(LoggingProvider) logger: LoggingProvider
    ) {
        super(logger)
    }

    async list(filter: LogFilterOptions, take: number = 50, skip: number = 0): Promise<PaginatedResponseDto<LogModel>> {
        const [logs, total] = await Promise.all([
            this.loggingRepository.findMany(filter, take, skip),
            this.loggingRepository.count(filter),
        ])
        return new PaginatedResponseDto(logs, total, skip)
    }

    async purgeOldLogs(retentionDays: number): Promise<boolean> {
        const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60_000)
        const deleted = await this.loggingRepository.deleteOlderThan(cutoff)
        if (deleted > 0) {
            this.logger.log(`Purged ${deleted} log entries older than ${retentionDays} days`)
        }
        return true
    }
}
