import { LogLevel } from '@/types/enums'

export type LogModel = {
    id: number

    userId: string | null
    sessionId: string | null
    correlationId: string | null

    logLevel: string
    context: string | null
    message: string
    stackTrace: string | null

    createdAt: Date
}

export type CreateLogModel = {
    userId?: string | null
    sessionId?: string | null
    correlationId?: string | null

    logLevel: LogLevel
    context?: string | null
    message: string
    stackTrace?: string | null
}
