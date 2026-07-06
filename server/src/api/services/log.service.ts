import { Injectable, Inject } from '@nestjs/common'
import { ILoggingRepository, LogFilterOptions } from '@/data/repositories/ILoggingRepository'
import { LogModel } from '@/types/models/logs'

@Injectable()
export class LogService {
    constructor(@Inject(ILoggingRepository) private readonly loggingRepository: ILoggingRepository) {}

    async list(filter: LogFilterOptions, take?: number, skip?: number): Promise<LogModel[]> {
        return this.loggingRepository.findMany(filter, take, skip)
    }
}
