import type { components } from '@samaljailani/homegate-types'

import { apiClient } from './api-client'

export type DashboardStatsResponseDto = components['schemas']['DashboardStatsResponseDto']

class DashboardService {
    async getStats(): Promise<DashboardStatsResponseDto> {
        const { data, error } = await apiClient.GET('/api/dashboard/stats')
        if (error) throw error
        return data
    }
}

export const dashboardService = new DashboardService()
