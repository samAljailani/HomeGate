import { CreateLogModel } from '@/types/models/logs'

export const ILoggingRepository = Symbol('ILoggingRepository')

export interface ILoggingRepository {
    create(log: CreateLogModel): Promise<boolean>
}
