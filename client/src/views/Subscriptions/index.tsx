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

export function Subscriptions() {
    const { subscriptions, isLoading, patchSubscription, reload } = useAccountPage()
    const [managingId, setManagingId] = React.useState<string | null>(null)

    // Derive from state so the dialog reflects live updates (e.g. auto-renew toggle).
    const managing = subscriptions.find((s) => s.id === managingId) ?? null

    const serviceNameBySubscriptionId = new Map(
        subscriptions.map((s) => [s.id, s.serviceName])
    )

    const accounts = subscriptions.filter((s) => s.accountType !== 'REFERENCED')
    const referenced = subscriptions.filter((s) => s.accountType === 'REFERENCED')

    return (
        <div className="py-8 space-y-8">
            <div>
                <h1 className="text-2xl font-bold">Subscriptions</h1>
                <p className="mt-1 text-sm text-muted-foreground">Manage your service subscriptions and account access.</p>
            </div>

            {isLoading ? (
                <p className="py-8 text-center text-muted-foreground">Loading your subscriptions…</p>
            ) : (
                <>
                    {accounts.length === 0 ? (
                        <p className="py-8 text-center text-muted-foreground">You have no subscription accounts yet.</p>
                    ) : (
                        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {accounts.map((sub) => (
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

                    {referenced.length > 0 && (
                        <section className="space-y-3">
                            <div>
                                <h2 className="text-lg font-semibold">Included access</h2>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Services included with your managed accounts. These are derived automatically and cannot be managed individually.
                                </p>
                            </div>
                            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {referenced.map((sub) => {
                                    const sourceServiceName = sub.derivedFromSubscriptionId
                                        ? serviceNameBySubscriptionId.get(sub.derivedFromSubscriptionId)
                                        : null

                                    return (
                                        <li key={sub.id} className="rounded-lg border p-4 space-y-3 opacity-80">
                                            <div className="flex items-center justify-between">
                                                <p className="font-medium">{sub.serviceName}</p>
                                                <StatusBadge tone={sub.status === 'active' ? 'success' : 'neutral'}>{sub.status}</StatusBadge>
                                            </div>
                                            <div className="text-sm text-muted-foreground space-y-1">
                                                {sub.username && <p>Username: {sub.username}</p>}
                                                {sourceServiceName && <p>Derived from: {sourceServiceName}</p>}
                                                <p>Expires: {formatDate(sub.expiresAt)}</p>
                                            </div>
                                        </li>
                                    )
                                })}
                            </ul>
                        </section>
                    )}
                </>
            )}

            <ManageSubscriptionDialog
                subscription={managing}
                open={managing !== null}
                setOpen={(open) => !open && setManagingId(null)}
                onAutoRenewChanged={(id, autoRenew) => patchSubscription(id, { autoRenew })}
                onCancelled={() => void reload({ silent: true })}
            />
        </div>
    )
}
