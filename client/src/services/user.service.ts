import type { components } from '@samaljailani/homegate-types'

import { apiClient } from './api-client'
import type { PaginationRequestDto } from '@/lib/apiPath'

export type UserPatchRequestDto = components['schemas']['UserPatchRequestDto']
export type UserDeleteRequestDto = components['schemas']['UserDeleteRequestDto']
export type UserResponseForAdminDto =
    components['schemas']['UserResponseForAdminDto']

/**
 * All user-related API calls live here. Components/hooks call these methods
 * instead of using `apiClient.GET/PATCH/DELETE(...)` directly, so:
 *  - route paths and param shapes are defined once, not repeated at every call site
 *  - request/response payloads are pinned to named DTOs (e.g. `UserPatchRequestDto`)
 *    instead of showing openapi-fetch's expanded generic-inferred shape
 *  - if a route or DTO changes server-side, only this file needs updating
 */
class UserService {
    async getAllUsers(
        pagination?: PaginationRequestDto
    ): Promise<UserResponseForAdminDto[]> {
        const { data, error } = await apiClient.GET('/api/users', {
            params: { query: pagination },
        })
        if (error) throw error
        return data
    }

    async getUserById(id: string): Promise<UserResponseForAdminDto> {
        const { data, error } = await apiClient.GET('/api/users/{id}', {
            params: { path: { id } },
        })
        if (error) throw error
        return data
    }

    async updateUser(
        id: string,
        body: UserPatchRequestDto
    ): Promise<UserResponseForAdminDto> {
        const { data, error } = await apiClient.PATCH('/api/users/{id}', {
            params: { path: { id } },
            body,
        })
        if (error) throw error
        return data
    }

    async deleteUser(id: string, body: UserDeleteRequestDto): Promise<boolean> {
        const { data, error } = await apiClient.DELETE('/api/users/{id}', {
            params: { path: { id } },
            body,
        })
        if (error) throw error
        return data!
    }
}

export const userService = new UserService()
