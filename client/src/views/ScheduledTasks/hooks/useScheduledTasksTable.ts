'use client'

import { useCallback, useState } from 'react'
import { addToastMessage } from '@/lib/utils'
import { taskService, type TaskConfigResponseDto, type UpdateTaskConfigDto } from '@/services/task.service'

interface ScheduledTasksMutators {
    replaceTask: (updated: TaskConfigResponseDto) => void
}

export function useScheduledTasksTable({ replaceTask }: ScheduledTasksMutators) {
    const [pendingName, setPendingName] = useState<string | null>(null)

    const updateTask = useCallback(async (name: string, patch: UpdateTaskConfigDto) => {
        setPendingName(name)
        try {
            const updated = await taskService.updateTask(name, patch)
            replaceTask(updated)
            addToastMessage('success', 'Task configuration updated')
        } catch {
            addToastMessage('error', 'Failed to update task configuration')
            throw new Error('Failed to update task configuration')
        } finally {
            setPendingName(null)
        }
    }, [replaceTask])

    const startTask = useCallback(async (name: string) => {
        setPendingName(name)
        try {
            const updated = await taskService.startTask(name)
            replaceTask(updated)
            addToastMessage('success', 'Task started')
        } catch {
            addToastMessage('error', 'Failed to start task')
        } finally {
            setPendingName(null)
        }
    }, [replaceTask])

    const stopTask = useCallback(async (name: string) => {
        setPendingName(name)
        try {
            const updated = await taskService.stopTask(name)
            replaceTask(updated)
            addToastMessage('success', 'Task stopped')
        } catch {
            addToastMessage('error', 'Failed to stop task')
        } finally {
            setPendingName(null)
        }
    }, [replaceTask])

    const runTask = useCallback(async (name: string) => {
        setPendingName(name)
        try {
            const updated = await taskService.runTask(name)
            replaceTask(updated)
            addToastMessage('success', 'Task run completed')
        } catch {
            addToastMessage('error', 'Failed to run task')
        } finally {
            setPendingName(null)
        }
    }, [replaceTask])

    return {
        pendingName,
        updateTask,
        startTask,
        stopTask,
        runTask,
    }
}
