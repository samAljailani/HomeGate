'use client'

import { useCallback, useEffect, useState } from 'react'
import { addToastMessage, getErrorMessage } from '@/lib/utils'
import { subscriptionService, type SubscriptionResponseDto } from '@/services/subscription.service'
import { serviceService, type ServiceResponseDto } from '@/services/service.service'

export interface AccountSubscription extends SubscriptionResponseDto {
    serviceName: string
    accountType: ServiceResponseDto['accountType']
    requiredInputs?: ServiceResponseDto['requiredInputs']
}

export function useAccountPage() {
    const [subscriptions, setSubscriptions] = useState<AccountSubscription[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const load = useCallback(async (options?: { silent?: boolean }) => {
        if (!options?.silent) setIsLoading(true)
        try {
            const [subs, services] = await Promise.all([
                subscriptionService.getMySubscriptions(),
                serviceService.getAllServices(),
            ])

            const nameById = new Map<number, string>(services.map((s: ServiceResponseDto) => [s.id, s.name]))
            const typeById = new Map<number, ServiceResponseDto['accountType']>(services.map((s) => [s.id, s.accountType]))
            const requiredInputsById = new Map<number, ServiceResponseDto['requiredInputs']>(
                services.map((s: ServiceResponseDto) => [s.id, s.requiredInputs])
            )
            setSubscriptions(
                subs.map((s) => ({
                    ...s,
                    serviceName: nameById.get(s.serviceId) ?? `Service ${s.serviceId}`,
                    accountType: typeById.get(s.serviceId) ?? 'NONE',
                    requiredInputs: requiredInputsById.get(s.serviceId),
                }))
            )
        } catch (error) {
            addToastMessage(
                'error',
                getErrorMessage(error, 'Failed to load your subscriptions')
            )
        } finally {
            if (!options?.silent) setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        void load()
    }, [load])

    const patchSubscription = useCallback((id: string, patch: Partial<SubscriptionResponseDto>) => {
        setSubscriptions((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
    }, [])

    return { subscriptions, isLoading, patchSubscription, reload: load }
}
