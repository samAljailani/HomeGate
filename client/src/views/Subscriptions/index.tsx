'use client'

import { useSubscriptionsPage } from './hooks/useSubscriptionsPage'
import { useSubscriptionsTable } from './hooks/useSubscriptionsTable'
import { SubscriptionsTable } from './components/SubscriptionsTable'

export function AdminSubscriptions() {
    const { subscriptions, isLoading, patchSubscription, removeSubscription } = useSubscriptionsPage()
    const subscriptionsTable = useSubscriptionsTable({ patchSubscription, removeSubscription })

    return (
        <div className="py-8 space-y-8">
            <div>
                <h1 className="text-2xl font-bold">Subscriptions</h1>
                <p className="mt-1 text-sm text-muted-foreground">Manage user subscriptions across all services.</p>
            </div>

            <SubscriptionsTable
                subscriptions={subscriptions}
                isLoading={isLoading}
                pendingId={subscriptionsTable.pendingId}
                onSetEnabled={subscriptionsTable.setEnabled}
                onSetAutoRenew={subscriptionsTable.setAutoRenew}
                onRenew={subscriptionsTable.renew}
                onCancel={subscriptionsTable.cancel}
            />
        </div>
    )
}
