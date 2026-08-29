'use client'

import * as React from 'react'
import { useAccountPage } from './hooks/useAccountPage'
import { ManageSubscriptionDialog } from './components/ManageSubscriptionDialog'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { Settings2 } from '@/components/ui/icons'

function formatDate(value?: string | null): string {
    if (!value) return '—'
    return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function Account() {
    const { subscriptions, isLoading, patchSubscription, removeSubscription } = useAccountPage()
    const [managingId, setManagingId] = React.useState<string | null>(null)

    // Derive from state so the dialog reflects live updates (e.g. auto-renew toggle).
    const managing = subscriptions.find((s) => s.id === managingId) ?? null

    return (
        <div className="py-8 space-y-8">
            <div>
                <h1 className="text-2xl font-bold">Account</h1>
                <p className="mt-1 text-sm text-muted-foreground">Manage your service subscriptions and account access.</p>
            </div>

            {isLoading ? (
                <p className="py-8 text-center text-muted-foreground">Loading your subscriptions…</p>
            ) : subscriptions.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">You have no subscriptions yet.</p>
            ) : (
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {subscriptions.map((sub) => (
                        <li key={sub.id} className="rounded-lg border p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="font-medium">{sub.serviceName}</p>
                                <StatusBadge tone={sub.status === 'active' ? 'success' : 'neutral'}>{sub.status}</StatusBadge>
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                                {sub.username && <p>Username: {sub.username}</p>}
                                <p>Expires: {formatDate(sub.expiresAt)}</p>
                                <p>Auto-renew: {sub.autoRenew ? 'On' : 'Off'}</p>
                            </div>
                            <Button variant="outline" size="sm" className="w-full" onClick={() => setManagingId(sub.id)}>
                                <Settings2 className="size-4 mr-2" />
                                Manage
                            </Button>
                        </li>
                    ))}
                </ul>
            )}

            <ManageSubscriptionDialog
                subscription={managing}
                open={managing !== null}
                setOpen={(open) => !open && setManagingId(null)}
                onAutoRenewChanged={(id, autoRenew) => patchSubscription(id, { autoRenew })}
                onCancelled={removeSubscription}
            />
        </div>
    )
}
