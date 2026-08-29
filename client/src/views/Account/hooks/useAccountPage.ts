'use client'

import { useCallback, useEffect, useState } from 'react'
import { addToastMessage } from '@/lib/utils'
import { subscriptionService, type SubscriptionResponseDto } from '@/services/subscription.service'
import { serviceService, type ServiceResponseDto } from '@/services/service.service'

export interface AccountSubscription extends SubscriptionResponseDto {
    serviceName: string
    accountType: ServiceResponseDto['accountType']
}

export function useAccountPage() {
    const [subscriptions, setSubscriptions] = useState<AccountSubscription[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const load = useCallback(async () => {
        setIsLoading(true)
        try {
            const [subs, services] = await Promise.all([
                subscriptionService.getMySubscriptions(),
                serviceService.getAllServices(),
            ])

            const nameById = new Map<number, string>(services.map((s: ServiceResponseDto) => [s.id, s.name]))
            const typeById = new Map<number, ServiceResponseDto['accountType']>(services.map((s) => [s.id, s.accountType]))
            setSubscriptions(
                subs.map((s) => ({
                    ...s,
                    serviceName: nameById.get(s.serviceId) ?? `Service ${s.serviceId}`,
                    accountType: typeById.get(s.serviceId) ?? 'NONE',
                }))
            )
        } catch {
            addToastMessage('error', 'Failed to load your subscriptions')
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        void load()
    }, [load])

    const patchSubscription = useCallback((id: string, patch: Partial<SubscriptionResponseDto>) => {
        setSubscriptions((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
    }, [])

    const removeSubscription = useCallback((id: string) => {
        setSubscriptions((prev) => prev.filter((s) => s.id !== id))
    }, [])

    return { subscriptions, isLoading, patchSubscription, removeSubscription, reload: load }
}
