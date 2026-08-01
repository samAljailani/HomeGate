import type { components } from '@samaljailani/homegate-types'

import { apiClient } from './api-client'
import type { PaginationRequestDto } from '@/lib/apiPath'

export type ServiceResponseDto = components['schemas']['ServiceResponseDto']
export type ServicePatchRequestDto = components['schemas']['ServicePatchRequestDto']

/**
 * All streaming-service-related API calls live here. Components/hooks call these methods
 * instead of using `apiClient.GET/PATCH(...)` directly, so:
 *  - route paths and param shapes are defined once, not repeated at every call site
 *  - request/response payloads are pinned to named DTOs (e.g. `ServicePatchRequestDto`)
 *    instead of showing openapi-fetch's expanded generic-inferred shape
 *  - if a route or DTO changes server-side, only this file needs updating
 */
class ServiceService {
    async getAllServices(pagination?: PaginationRequestDto): Promise<ServiceResponseDto[]> {
        const { data, error } = await apiClient.GET('/api/services', { params: { query: pagination } })
        if (error) throw error
        return data
    }

    async updateService(name: string, body: ServicePatchRequestDto): Promise<ServiceResponseDto> {
        const { data, error } = await apiClient.PATCH('/api/services/{name}', {
            params: { path: { name } },
            body,
        })
        if (error) throw error
        return data
    }
}

export const serviceService = new ServiceService()
