import { Injectable, Inject } from '@nestjs/common'
import { ILoggingRepository, LogFilterOptions } from '@/data/repositories/ILoggingRepository'
import { LogModel } from '@/types/models/logs'
import { PaginatedResponseDto } from '@/types/dtos/paginationDto'

@Injectable()
export class LogService {
    constructor(@Inject(ILoggingRepository) private readonly loggingRepository: ILoggingRepository) {}

    async list(filter: LogFilterOptions, take: number = 50, skip: number = 0): Promise<PaginatedResponseDto<LogModel>> {
        const [logs, total] = await Promise.all([
            this.loggingRepository.findMany(filter, take, skip),
            this.loggingRepository.count(filter),
        ])
        return new PaginatedResponseDto(logs, total, skip)
    }
}
