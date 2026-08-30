'use client'

import { useEffect, useState } from 'react'
import { addToastMessage, getErrorMessage } from '@/lib/utils'
import { dashboardService, type DashboardStatsResponseDto } from '@/services/dashboard.service'

export function useDashboard() {
    const [stats, setStats] = useState<DashboardStatsResponseDto | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        dashboardService
            .getStats()
            .then(setStats)
            .catch((error) =>
                addToastMessage(
                    'error',
                    getErrorMessage(error, 'Failed to load dashboard')
                )
            )
            .finally(() => setIsLoading(false))
    }, [])

    return { stats, isLoading }
}
