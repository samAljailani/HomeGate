import { CreateLogModel, LogModel } from '@/types/models/logs'
import { LogLevel } from '@/types/enums'

export const ILoggingRepository = Symbol('ILoggingRepository')

export type LogFilterOptions = {
    userId?: string
    logLevel?: LogLevel
}

export interface ILoggingRepository {
    create(log: CreateLogModel): Promise<boolean>
    findMany(filter: LogFilterOptions, take?: number, skip?: number): Promise<LogModel[]>
    count(filter: LogFilterOptions): Promise<number>
}
