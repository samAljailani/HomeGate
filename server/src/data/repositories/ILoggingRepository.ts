import { CreateLogModel, LogModel } from '@/types/models/logs'
import { LogLevel } from '@/types/enums'

export const ILoggingRepository = Symbol('ILoggingRepository')

export type LogFilterOptions = {
    userId?: string
    sessionId?: string
    logLevel?: LogLevel
    createdAfter?: Date
    createdBefore?: Date
    search?: string
}

export interface ILoggingRepository {
    create(log: CreateLogModel): Promise<boolean>
    findMany(filter: LogFilterOptions, take?: number, skip?: number): Promise<LogModel[]>
    count(filter: LogFilterOptions): Promise<number>
}
