'use client'

import * as React from 'react'
import { addToastMessage, getErrorMessage } from '@/lib/utils'
import { ResponsiveModal } from '@/components/ResponsiveModal'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { subscriptionService } from '@/services/subscription.service'
import { SubscriptionAccountsPanel } from './SubscriptionAccountsPanel'
import type { AccountSubscription } from '../hooks/useAccountPage'

interface ManageSubscriptionDialogProps {
    subscription: AccountSubscription | null
    open: boolean
    setOpen: React.Dispatch<React.SetStateAction<boolean>>
    onAutoRenewChanged: (id: string, autoRenew: boolean) => void
    onAccountChanged: (id: string, updated: AccountSubscription) => void
    onCancelled: (id: string) => void
}

export function ManageSubscriptionDialog({
    subscription,
    open,
    setOpen,
    onAutoRenewChanged,
    onAccountChanged,
    onCancelled,
}: ManageSubscriptionDialogProps) {
    const [isSaving, setIsSaving] = React.useState(false)

    if (!subscription) return null

    const linkedAccountCount = subscription.accounts?.length ?? 0
    const accountCap = subscription.accountCap ?? 1
    const isManaged = subscription.accountType === 'MANAGED'

    const toggleAutoRenew = async () => {
        setIsSaving(true)
        try {
            const updated = await subscriptionService.setAutoRenew(subscription.id, !subscription.autoRenew)
            onAutoRenewChanged(subscription.id, updated.autoRenew)
            addToastMessage('success', `Auto-renew ${updated.autoRenew ? 'enabled' : 'disabled'}`)
        } catch (error) {
            addToastMessage(
                'error',
                getErrorMessage(error, 'Failed to update auto-renew')
            )
        } finally {
            setIsSaving(false)
        }
    }

    const cancel = async () => {
        setIsSaving(true)
        try {
            await subscriptionService.cancelSubscription(subscription.id, { immediate: true })
            onCancelled(subscription.id)
            addToastMessage('success', 'Subscription cancelled')
            setOpen(false)
        } catch (error) {
            addToastMessage(
                'error',
                getErrorMessage(error, 'Failed to cancel subscription')
            )
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <ResponsiveModal
            open={open}
            setOpen={setOpen}
            title={`Manage ${subscription.serviceName}`}
            description="Manage your subscription and service accounts."
            className="sm:max-w-[480px]"
        >
            <Tabs defaultValue="subscription" className="grid gap-4">
                <TabsList>
                    <TabsTrigger value="subscription">Subscription</TabsTrigger>
                    {isManaged && (
                        <TabsTrigger value="accounts">
                            Accounts ({linkedAccountCount}/{accountCap})
                        </TabsTrigger>
                    )}
                </TabsList>

                <TabsContent value="subscription" className="grid gap-6">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-sm font-medium">Status</p>
                            <StatusBadge tone={subscription.status === 'active' ? 'success' : 'neutral'}>
                                {subscription.status}
                            </StatusBadge>
                        </div>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            className="size-4 accent-primary"
                            checked={subscription.autoRenew}
                            disabled={isSaving}
                            onChange={toggleAutoRenew}
                        />
                        <span className="text-sm">Auto-renew subscription</span>
                    </label>

                    <div className="border-t pt-4">
                        <Button variant="destructive" disabled={isSaving} onClick={cancel}>
                            Cancel subscription
                        </Button>
                    </div>
                </TabsContent>

                {isManaged && (
                    <TabsContent value="accounts" className="grid gap-6">
                        <SubscriptionAccountsPanel
                            subscription={subscription}
                            onAccountChanged={onAccountChanged}
                        />
                    </TabsContent>
                )}
            </Tabs>
        </ResponsiveModal>
    )
}