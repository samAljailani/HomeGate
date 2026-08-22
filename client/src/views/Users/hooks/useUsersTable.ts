'use client'

import { useCallback, useState } from 'react'
import { userService } from '@/services/user.service'
import { addToastMessage } from '@/lib/utils'

export function useUsersTable(refresh: () => void) {
    const [actionError, setActionError] = useState<string | null>(null)
    const [pendingId, setPendingId] = useState<string | null>(null)

    const disableUser = useCallback(async (id: string) => {
        setActionError(null)
        setPendingId(id)
        try {
            await userService.updateUser(id, { enabled: false })
            addToastMessage('success', 'User disabled')
            refresh()
        } catch {
            setActionError('Failed to disable user')
            addToastMessage('error', 'Failed to disable user')
        } finally {
            setPendingId(null)
        }
    }, [refresh])

    const enableUser = useCallback(async (id: string) => {
        setActionError(null)
        setPendingId(id)
        try {
            await userService.updateUser(id, { enabled: true })
            addToastMessage('success', 'User enabled')
            refresh()
        } catch {
            setActionError('Failed to enable user')
            addToastMessage('error', 'Failed to enable user')
        } finally {
            setPendingId(null)
        }
    }, [refresh])

    const softDeleteUser = useCallback(async (id: string) => {
        setActionError(null)
        setPendingId(id)
        try {
            await userService.deleteUser(id, { hard: false })
            addToastMessage('success', 'User deleted')
            refresh()
        } catch {
            setActionError('Failed to delete user')
            addToastMessage('error', 'Failed to delete user')
        } finally {
            setPendingId(null)
        }
    }, [refresh])

    const hardDeleteUser = useCallback(async (id: string) => {
        setActionError(null)
        setPendingId(id)
        try {
            await userService.deleteUser(id, { hard: true })
            addToastMessage('success', 'User permanently deleted')
            refresh()
        } catch {
            setActionError('Failed to permanently delete user')
            addToastMessage('error', 'Failed to permanently delete user')
        } finally {
            setPendingId(null)
        }
    }, [refresh])

    return {
        actionError,
        pendingId,
        disableUser,
        enableUser,
        softDeleteUser,
        hardDeleteUser,
    }
}
