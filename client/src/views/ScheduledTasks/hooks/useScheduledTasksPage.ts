'use client'

import { useCallback, useEffect, useState } from 'react'
import { taskService, type TaskConfigResponseDto } from '@/services/task.service'
import { getErrorMessage } from '@/lib/utils'

export function useScheduledTasksPage() {
    const [tasks, setTasks] = useState<TaskConfigResponseDto[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const load = useCallback(async () => {
        try {
            setIsLoading(true)
            setError(null)
            setTasks(await taskService.getAllTasks())
        } catch (error) {
            setError(
                getErrorMessage(error, 'Failed to load scheduled tasks')
            )
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        load()
    }, [load])

    const replaceTask = useCallback((updated: TaskConfigResponseDto) => {
        setTasks((previous) => previous.map((task) => task.name === updated.name ? updated : task))
    }, [])

    return {
        tasks,
        isLoading,
        error,
        refresh: load,
        replaceTask,
    }
}
