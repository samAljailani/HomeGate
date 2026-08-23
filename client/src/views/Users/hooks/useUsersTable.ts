'use client'

import { useCallback, useState } from 'react'
import { userService, type UserResponseForAdminDto } from '@/services/user.service'
import { addToastMessage } from '@/lib/utils'

interface UsersListMutators {
    patchUser: (id: string, patch: Partial<UserResponseForAdminDto>) => void
    removeUser: (id: string) => void
    refresh: () => void
}

export function useUsersTable({ patchUser, removeUser, refresh }: UsersListMutators) {
    const [actionError, setActionError] = useState<string | null>(null)
    const [pendingId, setPendingId] = useState<string | null>(null)

    const disableUser = useCallback(async (id: string) => {
        setActionError(null)
        setPendingId(id)
        try {
            await userService.updateUser(id, { enabled: false })
            patchUser(id, { status: 'DISABLED' })
            addToastMessage('success', 'User disabled')
        } catch {
            setActionError('Failed to disable user')
            addToastMessage('error', 'Failed to disable user')
        } finally {
            setPendingId(null)
            refresh()
        }
    }, [patchUser])

    const enableUser = useCallback(async (id: string) => {
        setActionError(null)
        setPendingId(id)
        try {
            await userService.updateUser(id, { enabled: true })
            patchUser(id, { status: 'ACTIVE' })
            addToastMessage('success', 'User enabled')
        } catch {
            setActionError('Failed to enable user')
            addToastMessage('error', 'Failed to enable user')
        } finally {
            setPendingId(null)
            refresh()
        }
    }, [patchUser])

    const softDeleteUser = useCallback(async (id: string) => {
        setActionError(null)
        setPendingId(id)
        try {
            await userService.deleteUser(id, { hard: false })
            patchUser(id, { status: 'DELETED' })
            addToastMessage('success', 'User deleted')
        } catch {
            setActionError('Failed to delete user')
            addToastMessage('error', 'Failed to delete user')
        } finally {
            setPendingId(null)
            refresh()
        }
    }, [patchUser])

    const hardDeleteUser = useCallback(async (id: string) => {
        setActionError(null)
        setPendingId(id)
        try {
            await userService.deleteUser(id, { hard: true })
            removeUser(id)
            addToastMessage('success', 'User permanently deleted')
        } catch {
            setActionError('Failed to permanently delete user')
            addToastMessage('error', 'Failed to permanently delete user')
        } finally {
            setPendingId(null)
            refresh()
        }
    }, [removeUser])

    const setUserAdmin = useCallback(async (id: string, admin: boolean) => {
        setActionError(null)
        setPendingId(id)
        try {
            await userService.updateUser(id, { admin })
            patchUser(id, { isAdmin: admin })
            addToastMessage('success', admin ? 'User promoted to admin' : 'User admin access revoked')
        } catch {
            setActionError('Failed to update admin access')
            addToastMessage('error', 'Failed to update admin access')
        } finally {
            setPendingId(null)
        }
    }, [patchUser])

    return {
        actionError,
        pendingId,
        disableUser,
        enableUser,
        softDeleteUser,
        hardDeleteUser,
        setUserAdmin,
    }
}
