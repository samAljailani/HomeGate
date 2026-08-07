import { useState, useEffect } from 'react'
import { serviceService, type ServiceResponseDto } from '@/services/service.service'
import { subscriptionService } from '@/services/subscription.service'

export interface HomeViewModel {
    services: ServiceResponseDto[]
    subscribedServiceIds: number[]
    loading: boolean
}

export function useHomeViewModel(): HomeViewModel {
    const [services, setServices] = useState<ServiceResponseDto[]>([])
    const [subscribedServiceIds, setSubscribedServiceIds] = useState<number[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let cancelled = false

        async function load() {
            const [allServices, mySubscriptions] = await Promise.all([
                serviceService.getAllServices(),
                subscriptionService.getMySubscriptions(),
            ])
            if (cancelled) return
            setServices(allServices.filter(s => s.enabled))
            setSubscribedServiceIds(mySubscriptions.map(s => s.serviceId))
            setLoading(false)
        }

        load()
        return () => { cancelled = true }
    }, [])

    return { services, subscribedServiceIds, loading }
}
