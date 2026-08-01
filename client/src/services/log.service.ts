import type { components } from '@samaljailani/homegate-types'

import { apiClient } from './api-client'
import type { PaginationRequestDto } from '@/lib/apiPath'

export type LogResponseDto = components['schemas']['LogResponseDto']

/**
 * All log-related API calls live here. Components/hooks call these methods
 * instead of using `apiClient.GET(...)` directly, so:
 *  - route paths and param shapes are defined once, not repeated at every call site
 *  - request/response payloads are pinned to named DTOs
 *  - if a route or DTO changes server-side, only this file needs updating
 */
class LogService {
    async getAllLogs(pagination?: PaginationRequestDto): Promise<LogResponseDto[]> {
        const { data, error } = await apiClient.GET('/api/logs', { params: { query: pagination } })
        if (error) throw error
        return data
    }
}

export const logService = new LogService()
