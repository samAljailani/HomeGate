import type { components } from '@samaljailani/homegate-types'

import { apiClient } from './api-client'
import type { PaginationRequestDto } from '@/lib/apiPath'

export type InviteResponseDto = components['schemas']['InviteResponseDto']
export type CreateInviteRequestDto =
    components['schemas']['CreateInviteRequestDto']
export type CreateInviteResponseDto =
    components['schemas']['CreateInviteResponseDto']

/**
 * All invite-related API calls live here. Components/hooks call these methods
 * instead of using `apiClient.GET/POST/PATCH(...)` directly, so:
 *  - route paths and param shapes are defined once, not repeated at every call site
 *  - request/response payloads are pinned to named DTOs (e.g. `CreateInviteRequestDto`)
 *    instead of showing openapi-fetch's expanded generic-inferred shape
 *  - if a route or DTO changes server-side, only this file needs updating
 */
class InviteService {
    async getAllInvites(
        pagination?: PaginationRequestDto
    ): Promise<InviteResponseDto[]> {
        const { data, error } = await apiClient.GET('/api/invites', {
            params: { query: pagination },
        })
        if (error) throw error
        return data
    }

    async createInvite(
        body: CreateInviteRequestDto
    ): Promise<CreateInviteResponseDto> {
        const { data, error } = await apiClient.POST('/api/invites', { body })
        if (error) throw error
        return data!
    }

    async revokeInvite(id: string): Promise<InviteResponseDto> {
        const { data, error } = await apiClient.PATCH('/api/invites/{id}', {
            params: { path: { id } },
            body: { revoked: true },
        })
        if (error) throw error
        return data!
    }
}

export const inviteService = new InviteService()
