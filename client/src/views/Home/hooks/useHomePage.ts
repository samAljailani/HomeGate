'use client'

import { useCallback, useEffect, useState } from 'react'
import { serviceService, type ServiceResponseDto } from '@/services/service.service'
import { subscriptionService } from '@/services/subscription.service'

export function useHomePage() {
    const [services, setServices] = useState<ServiceResponseDto[]>([])
    const [subscribedServiceIds, setSubscribedServiceIds] = useState<number[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const load = useCallback(async () => {
        setIsLoading(true)
        try {
            const [services, userSubscriptions] = await Promise.all([
                serviceService.getAllServices(),
                subscriptionService.getMySubscriptions(),
            ])
            setServices(services)
            setSubscribedServiceIds(userSubscriptions.map((s) => s.serviceId))
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        load()
    }, [load])

    return {
        services,
        subscribedServiceIds,
        isLoading,
        refresh: load,
    }
}
