'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
    subscriptionService,
    type SubscriptionAccountDto,
    type SubscriptionResponseDto,
} from '@/services/subscription.service'
import { getErrorMessage } from '@/lib/utils'

export interface AccountRow {
    account: SubscriptionAccountDto
    subscription: SubscriptionResponseDto
    userLabel: string
    serviceName: string
    accountCount: number
    accountCap: number
    canDelete: boolean
}

export function useAccountsPage() {
    const [subscriptions, setSubscriptions] = useState<SubscriptionResponseDto[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const load = useCallback(async () => {
        try {
            setIsLoading(true)
            setError(null)
            const subscriptions = await subscriptionService.getAllSubscriptions()
            setSubscriptions(subscriptions)
        } catch (error) {
            setError(getErrorMessage(error, 'Failed to load linked accounts'))
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        load()
    }, [load])

    const rows = useMemo<AccountRow[]>(() => {
        const result: AccountRow[] = []
        subscriptions.forEach((s) => {
            const accountCount = s.accounts.length
            const canDelete = s.accountType === 'MANAGED' && accountCount > 1
            s.accounts.forEach((account) => {
                result.push({
                    account,
                    subscription: s,
                    userLabel: s.userUsername ?? s.userEmail ?? s.userId,
                    serviceName: s.serviceName ?? String(s.serviceId),
                    accountCount,
                    accountCap: s.accountCap,
                    canDelete,
                })
            })
        })
        return result
    }, [subscriptions])

    const deleteAccount = useCallback(
        async (subscriptionId: string, accountId: string, deprovisionExternal = true): Promise<boolean> => {
            try {
                setError(null)
                await subscriptionService.removeAccount(subscriptionId, accountId, deprovisionExternal)
                setSubscriptions((prev) =>
                    prev.map((s) => {
                        if (s.id !== subscriptionId) return s
                        return { ...s, accounts: s.accounts.filter((a) => a.id !== accountId) }
                    })
                )
                return true
            } catch (error) {
                setError(getErrorMessage(error, 'Failed to delete the account'))
                return false
            }
        },
        []
    )

    return {
        rows,
        isLoading,
        error,
        refresh: load,
        deleteAccount,
    }
}