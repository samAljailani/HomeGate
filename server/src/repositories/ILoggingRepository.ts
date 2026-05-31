import { CreateLogModel } from '@/types/models/logs'

export const ILoggingRepository = Symbol('ILoggingRepository')

export interface ILoggingRepository {
    post(log: CreateLogModel): Promise<boolean>
}
