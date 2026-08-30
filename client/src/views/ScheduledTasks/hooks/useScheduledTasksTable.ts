'use client'

import { useCallback, useState } from 'react'
import { addToastMessage, getErrorMessage } from '@/lib/utils'
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
        } catch (error) {
            const message = getErrorMessage(
                error,
                'Failed to update task configuration'
            )
            addToastMessage('error', message)
            throw new Error(message, { cause: error })
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
        } catch (error) {
            addToastMessage(
                'error',
                getErrorMessage(error, 'Failed to start task')
            )
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
        } catch (error) {
            addToastMessage(
                'error',
                getErrorMessage(error, 'Failed to stop task')
            )
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
        } catch (error) {
            addToastMessage(
                'error',
                getErrorMessage(error, 'Failed to run task')
            )
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
