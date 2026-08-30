'use client'

import { useCallback, useEffect, useState } from 'react'
import { subscriptionService, type SubscriptionResponseDto } from '@/services/subscription.service'

export function useSubscriptionsPage() {
    const [subscriptions, setSubscriptions] = useState<SubscriptionResponseDto[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const load = useCallback(async () => {
        try {
            setIsLoading(true)
            setError(null)
            const subscriptions = await subscriptionService.getAllSubscriptions()
            setSubscriptions(subscriptions)
        } catch {
            setError('Failed to load subscriptions')
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        load()
    }, [load])

    const patchSubscription = useCallback((id: string, patch: Partial<SubscriptionResponseDto>) => {
        setSubscriptions((prev) => prev.map((s) => s.id === id ? { ...s, ...patch } : s))
    }, [])

    const removeSubscription = useCallback((id: string) => {
        setSubscriptions((prev) => prev.filter((s) => s.id !== id))
    }, [])

    return {
        subscriptions,
        isLoading,
        error,
        refresh: load,
        patchSubscription,
        removeSubscription,
    }
}
