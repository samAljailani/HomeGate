import type { components } from '@samaljailani/homegate-types'

import { apiClient } from './api-client'
import type { PaginationRequestDto } from '@/lib/apiPath'

export type OAuthProviderResponseDto =
    components['schemas']['OAuthProviderResponseDto']
export type OAuthProviderPatchRequestDto =
    components['schemas']['OAuthProviderPatchRequestDto']

/**
 * All OAuth provider-related API calls live here. Components/hooks call these methods
 * instead of using `apiClient.GET/PATCH(...)` directly, so:
 *  - route paths and param shapes are defined once, not repeated at every call site
 *  - request/response payloads are pinned to named DTOs (e.g. `OAuthProviderPatchRequestDto`)
 *    instead of showing openapi-fetch's expanded generic-inferred shape
 *  - if a route or DTO changes server-side, only this file needs updating
 */
class OAuthProviderService {
    async getAllOAuthProviders(
        pagination?: PaginationRequestDto
    ): Promise<OAuthProviderResponseDto[]> {
        const { data, error } = await apiClient.GET('/api/oauth-providers', {
            params: { query: pagination },
        })
        if (error) throw error
        return data
    }

    async updateOAuthProvider(
        id: number,
        body: OAuthProviderPatchRequestDto
    ): Promise<OAuthProviderResponseDto> {
        const { data, error } = await apiClient.PATCH(
            '/api/oauth-providers/{id}',
            {
                params: { path: { id } },
                body,
            }
        )
        if (error) throw error
        return data
    }
}

export const oauthProviderService = new OAuthProviderService()
