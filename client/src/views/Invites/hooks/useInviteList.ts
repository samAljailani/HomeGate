'use client'

import { useState, useEffect, useCallback } from 'react'
import { inviteService, type InviteResponseDto } from '@/services/invite.service'

export function useInviteList() {
    const [invites, setInvites] = useState<InviteResponseDto[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const load = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            const result = await inviteService.getAllInvites()
            setInvites(result)
        } catch {
            setError('Failed to load invites')
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        load()
    }, [load])

    return { invites, isLoading, error, refresh: load }
}
