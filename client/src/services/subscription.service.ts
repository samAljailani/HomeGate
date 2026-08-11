import type { components } from '@samaljailani/homegate-types'

import { apiClient } from './api-client'
import type { PaginationRequestDto } from '@/lib/apiPath'

export type SubscriptionResponseDto =
    components['schemas']['SubscriptionResponseDto']
export type SubscriptionCreateRequestDto =
    components['schemas']['SubscriptionCreateRequestDto']
export type SubscriptionPatchRequestDto =
    components['schemas']['SubscriptionPatchRequestDto']
export type SubscriptionDeleteRequestDto =
    components['schemas']['SubscriptionDeleteRequestDto']

/**
 * All subscription-related API calls live here. Components/hooks call these methods
 * instead of using `apiClient.GET/POST/PATCH/DELETE(...)` directly, so:
 *  - route paths and param shapes are defined once, not repeated at every call site
 *  - request/response payloads are pinned to named DTOs (e.g. `SubscriptionPatchRequestDto`)
 *    instead of showing openapi-fetch's expanded generic-inferred shape
 *  - if a route or DTO changes server-side, only this file needs updating
 */
class SubscriptionService {
    async getAllSubscriptions(
        pagination?: PaginationRequestDto
    ): Promise<SubscriptionResponseDto[]> {
        const { data, error } = await apiClient.GET('/api/subscriptions', {
            params: { query: pagination },
        })
        if (error) throw error
        return data
    }

    async getMySubscriptions(
        pagination?: PaginationRequestDto
    ): Promise<SubscriptionResponseDto[]> {
        const { data, error } = await apiClient.GET('/api/subscriptions/me', {
            params: { query: pagination },
        })
        if (error) throw error
        return data
    }

    async getSubscriptionById(id: string): Promise<SubscriptionResponseDto> {
        const { data, error } = await apiClient.GET('/api/subscriptions/{id}', {
            params: { path: { id } },
        })
        if (error) throw error
        return data!
    }

    async subscribe(
        body: SubscriptionCreateRequestDto
    ): Promise<SubscriptionResponseDto> {
        const { data, error } = await apiClient.POST('/api/subscriptions', {
            body,
        })
        if (error) throw error
        return data!
    }

    async updateSubscription(
        id: string,
        body: SubscriptionPatchRequestDto
    ): Promise<SubscriptionResponseDto> {
        const { data, error } = await apiClient.PATCH(
            '/api/subscriptions/{id}',
            { params: { path: { id } }, body }
        )
        if (error) throw error
        return data!
    }

    async renewSubscription(id: string): Promise<SubscriptionResponseDto> {
        const { data, error } = await apiClient.POST(
            '/api/subscriptions/{id}/renew',
            { params: { path: { id } } }
        )
        if (error) throw error
        return data!
    }

    async cancelSubscription(
        id: string,
        body?: SubscriptionDeleteRequestDto
    ): Promise<boolean> {
        const { data, error } = await apiClient.DELETE(
            '/api/subscriptions/{id}',
            { params: { path: { id } }, body }
        )
        if (error) throw error
        return data!
    }
}

export const subscriptionService = new SubscriptionService()
