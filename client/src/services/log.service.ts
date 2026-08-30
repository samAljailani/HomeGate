import type { components, operations } from '@samaljailani/homegate-types'

import { apiClient } from './api-client'

export type LogResponseDto = components['schemas']['LogResponseDto']
export type LogSortField = 'createdAt' | 'logLevel' | 'context' | 'message' | 'userId'
export type LogListRequestDto = NonNullable<operations['LogController_list']['parameters']['query']> & {
    orderBy?: LogSortField
    orderDirection?: 'asc' | 'desc'
}
export type LogsPageResponseDto = {
    data: LogResponseDto[]
    total: number
    hasMore: boolean
}

/**
 * All log-related API calls live here. Components/hooks call these methods
 * instead of using `apiClient.GET(...)` directly, so:
 *  - route paths and param shapes are defined once, not repeated at every call site
 *  - request/response payloads are pinned to named DTOs
 *  - if a route or DTO changes server-side, only this file needs updating
 */
class LogService {
    async getAllLogs(
        query?: LogListRequestDto
    ): Promise<LogsPageResponseDto> {
        const { data, error } = await apiClient.GET('/api/logs', {
            params: { query },
        })
        if (error) throw error
        return data
    }
}

export const logService = new LogService()
