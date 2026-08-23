import type { components } from '@samaljailani/homegate-types'

import { apiClient } from './api-client'

export type SessionResponseDto = components['schemas']['SessionResponseDto']
export type SessionConfigResponseDto = components['schemas']['SessionConfigResponseDto']
export type SessionsPageResponseDto = {
    data: SessionResponseDto[]
    total: number
    hasMore: boolean
}

class SessionService {
    async getSessions(take?: number, skip?: number): Promise<SessionsPageResponseDto> {
        const { data, error } = await apiClient.GET('/api/sessions', {
            params: {
                query: {
                    ...(take !== undefined ? { take } : {}),
                    ...(skip !== undefined ? { skip } : {}),
                },
            },
        })
        if (error) throw error
        return data
    }

    async revokeSession(id: string): Promise<void> {
        const { error } = await apiClient.DELETE('/api/sessions/{id}', {
            params: { path: { id } },
        })
        if (error) throw error
    }

    async getConfig(): Promise<SessionConfigResponseDto> {
        const { data, error } = await apiClient.GET('/api/sessions/config')
        if (error) throw error
        return data
    }

    async updateConfig(maxPerUser: number): Promise<SessionConfigResponseDto> {
        const { data, error } = await apiClient.PATCH('/api/sessions/config', {
            body: { maxPerUser },
        })
        if (error) throw error
        return data
    }
}

export const sessionService = new SessionService()
