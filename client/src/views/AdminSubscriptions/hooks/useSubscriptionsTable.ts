'use client'

import { useCallback, useState } from 'react'
import { subscriptionService, type SubscriptionResponseDto } from '@/services/subscription.service'
import { policyService } from '@/services/policy.service'
import { addToastMessage, getErrorMessage } from '@/lib/utils'

interface SubscriptionsListMutators {
    patchSubscription: (id: string, patch: Partial<SubscriptionResponseDto>) => void
    removeSubscription: (id: string) => void
}

export function useSubscriptionsTable({ patchSubscription, removeSubscription }: SubscriptionsListMutators) {
    const [actionError, setActionError] = useState<string | null>(null)
    const [pendingId, setPendingId] = useState<string | null>(null)

    const setEnabled = useCallback(async (id: string, enabled: boolean) => {
        setActionError(null)
        setPendingId(id)
        try {
            const updated = await subscriptionService.updateSubscription(id, { enabled })
            patchSubscription(id, { status: updated.status })
            addToastMessage('success', enabled ? 'Subscription enabled' : 'Subscription disabled')
        } catch (error) {
            const message = getErrorMessage(
                error,
                'Failed to update subscription'
            )
            setActionError(message)
            addToastMessage('error', message)
        } finally {
            setPendingId(null)
        }
    }, [patchSubscription])

    const setAutoRenew = useCallback(async (id: string, autoRenew: boolean) => {
        setActionError(null)
        setPendingId(id)
        try {
            await subscriptionService.updateSubscription(id, { autoRenew })
            patchSubscription(id, { autoRenew })
            addToastMessage('success', autoRenew ? 'Auto-renew enabled' : 'Auto-renew disabled')
        } catch (error) {
            const message = getErrorMessage(
                error,
                'Failed to update auto-renew'
            )
            setActionError(message)
            addToastMessage('error', message)
        } finally {
            setPendingId(null)
        }
    }, [patchSubscription])

    const renew = useCallback(async (id: string) => {
        setActionError(null)
        setPendingId(id)
        try {
            const updated = await subscriptionService.renewSubscription(id)
            patchSubscription(id, { expiresAt: updated.expiresAt, status: updated.status })
            addToastMessage('success', 'Subscription renewed')
        } catch (error) {
            const message = getErrorMessage(
                error,
                'Failed to renew subscription'
            )
            setActionError(message)
            addToastMessage('error', message)
        } finally {
            setPendingId(null)
        }
    }, [patchSubscription])

    const cancel = useCallback(async (subscription: SubscriptionResponseDto, addDenyPolicy = false) => {
        setActionError(null)
        setPendingId(subscription.id)
        try {
            await subscriptionService.cancelSubscription(subscription.id, { immediate: true })
            if (addDenyPolicy) {
                await policyService.set(subscription.userId, {
                    serviceId: subscription.serviceId,
                    effect: 'DENY',
                })
            }
            removeSubscription(subscription.id)
            addToastMessage('success', 'Subscription cancelled')
        } catch (error) {
            const message = getErrorMessage(
                error,
                'Failed to cancel subscription'
            )
            setActionError(message)
            addToastMessage('error', message)
        } finally {
            setPendingId(null)
        }
    }, [removeSubscription])

    return {
        actionError,
        pendingId,
        setEnabled,
        setAutoRenew,
        renew,
        cancel,
    }
}
