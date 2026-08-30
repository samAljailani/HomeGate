'use client'

import { useCallback, useState } from 'react'
import { userService, type UserResponseForAdminDto, type UserStatus } from '@/services/user.service'
import { addToastMessage, getErrorMessage } from '@/lib/utils'

interface UsersListMutators {
    patchUser: (id: string, patch: Partial<UserResponseForAdminDto>) => void
    removeUser: (id: string) => void
    transitionStatus: (from: UserStatus, to: UserStatus) => void
    decrement: (status: UserStatus) => void
}

export function useUsersTable({ patchUser, removeUser, transitionStatus, decrement }: UsersListMutators) {
    const [actionError, setActionError] = useState<string | null>(null)
    const [pendingId, setPendingId] = useState<string | null>(null)

    const disableUser = useCallback(async (id: string) => {
        setActionError(null)
        setPendingId(id)
        try {
            await userService.updateUser(id, { enabled: false })
            patchUser(id, { status: 'DISABLED' })
            transitionStatus('ACTIVE', 'DISABLED')
            addToastMessage('success', 'User disabled')
        } catch (error) {
            const message = getErrorMessage(error, 'Failed to disable user')
            setActionError(message)
            addToastMessage('error', message)
        } finally {
            setPendingId(null)
        }
    }, [patchUser, transitionStatus])

    const enableUser = useCallback(async (id: string, currentStatus: UserStatus) => {
        setActionError(null)
        setPendingId(id)
        try {
            await userService.updateUser(id, { enabled: true })
            patchUser(id, { status: 'ACTIVE' })
            transitionStatus(currentStatus, 'ACTIVE')
            addToastMessage('success', 'User enabled')
        } catch (error) {
            const message = getErrorMessage(error, 'Failed to enable user')
            setActionError(message)
            addToastMessage('error', message)
        } finally {
            setPendingId(null)
        }
    }, [patchUser, transitionStatus])

    const softDeleteUser = useCallback(async (id: string, currentStatus: UserStatus) => {
        setActionError(null)
        setPendingId(id)
        try {
            await userService.deleteUser(id, { hard: false })
            patchUser(id, { status: 'DELETED' })
            transitionStatus(currentStatus, 'DELETED')
            addToastMessage('success', 'User deleted')
        } catch (error) {
            const message = getErrorMessage(error, 'Failed to delete user')
            setActionError(message)
            addToastMessage('error', message)
        } finally {
            setPendingId(null)
        }
    }, [patchUser, transitionStatus])

    const hardDeleteUser = useCallback(async (id: string, currentStatus: UserStatus) => {
        setActionError(null)
        setPendingId(id)
        try {
            await userService.deleteUser(id, { hard: true })
            removeUser(id)
            decrement(currentStatus)
            addToastMessage('success', 'User permanently deleted')
        } catch (error) {
            const message = getErrorMessage(
                error,
                'Failed to permanently delete user'
            )
            setActionError(message)
            addToastMessage('error', message)
        } finally {
            setPendingId(null)
        }
    }, [removeUser, decrement])

    const setUserAdmin = useCallback(async (id: string, admin: boolean) => {
        setActionError(null)
        setPendingId(id)
        try {
            await userService.updateUser(id, { admin })
            patchUser(id, { isAdmin: admin })
            addToastMessage('success', admin ? 'User promoted to admin' : 'User admin access revoked')
        } catch (error) {
            const message = getErrorMessage(
                error,
                'Failed to update admin access'
            )
            setActionError(message)
            addToastMessage('error', message)
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
