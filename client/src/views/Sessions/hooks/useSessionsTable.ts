'use client'

import { useCallback, useState } from 'react'
import { addToastMessage } from '@/lib/utils'
import { sessionService } from '@/services/session.service'

interface SessionsMutators {
    removeSession: (id: string) => void
}

export function useSessionsTable({ removeSession }: SessionsMutators) {
    const [pendingId, setPendingId] = useState<string | null>(null)

    const revokeSession = useCallback(async (id: string) => {
        setPendingId(id)
        try {
            await sessionService.revokeSession(id)
            removeSession(id)
            addToastMessage('success', 'Session revoked')
        } catch {
            addToastMessage('error', 'Failed to revoke session')
        } finally {
            setPendingId(null)
        }
    }, [removeSession])

    return {
        pendingId,
        revokeSession,
    }
}
