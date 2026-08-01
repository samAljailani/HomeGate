import type { components } from '@samaljailani/homegate-types'

import { apiClient } from './api-client'

export type TaskConfigResponseDto = components['schemas']['TaskConfigResponseDto']
export type UpdateTaskConfigDto = components['schemas']['UpdateTaskConfigDto']

/**
 * All scheduled-task-related API calls live here. Components/hooks call these methods
 * instead of using `apiClient.GET/PATCH(...)` directly, so:
 *  - route paths and param shapes are defined once, not repeated at every call site
 *  - request/response payloads are pinned to named DTOs (e.g. `UpdateTaskConfigDto`)
 *    instead of showing openapi-fetch's expanded generic-inferred shape
 *  - if a route or DTO changes server-side, only this file needs updating
 */
class TaskService {
    async getAllTasks(): Promise<TaskConfigResponseDto[]> {
        const { data, error } = await apiClient.GET('/api/tasks')
        if (error) throw error
        return data
    }

    async updateTask(name: string, body: UpdateTaskConfigDto): Promise<TaskConfigResponseDto> {
        const { data, error } = await apiClient.PATCH('/api/tasks/{name}', {
            params: { path: { name } },
            body,
        })
        if (error) throw error
        return data
    }
}

export const taskService = new TaskService()
