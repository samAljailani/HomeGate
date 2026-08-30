'use client'

import { useCallback, useEffect, useState } from 'react'
import { addToastMessage, getErrorMessage } from '@/lib/utils'
import { sessionService, type SessionResponseDto } from '@/services/session.service'

export function useSessionsPage() {
    const [sessions, setSessions] = useState<SessionResponseDto[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const load = useCallback(async () => {
        setIsLoading(true)
        try {
            const response = await sessionService.getSessions()
            setSessions(response.data)
        } catch (error) {
            addToastMessage(
                'error',
                getErrorMessage(error, 'Failed to load sessions')
            )
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        void load()
    }, [load])

    const removeSession = useCallback((id: string) => {
        setSessions((prev) => prev.filter((s) => s.id !== id))
    }, [])

    return { sessions, isLoading, removeSession }
}
