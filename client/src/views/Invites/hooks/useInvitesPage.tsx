'use client'

import { useCallback, useEffect, useState } from 'react'
import { useInviteList } from './useInviteList'
import { serviceService } from '@/services/service.service'

export function useInvitesPage() {
    const inviteList = useInviteList()
    const [serviceOptions, setServiceOptions] = useState<string[]>([])

    const loadServiceOptions = useCallback(async () => {
        try {
            const services = await serviceService.getAllServices()
            setServiceOptions(services.map((s) => s.name))
        } catch (e) {
            console.error('Failed to load services:', e)
        }
    }, [])

    useEffect(() => {
        loadServiceOptions()
    }, [loadServiceOptions])

    return {
        invites: inviteList.invites,
        isLoading: inviteList.isLoading,
        error: inviteList.error,
        refresh: inviteList.refresh,
        serviceOptions,
    }
}
