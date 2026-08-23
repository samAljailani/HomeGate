'use client'

import { useDashboard } from './hooks/useDashboard'
import { CountCard } from '@/components/ui/count-card'

function formatDate(value?: string | null): string {
    if (!value) return '—'
    return new Date(value).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

export function Admin() {
    const { stats, isLoading } = useDashboard()

    if (isLoading || !stats) {
        return <p className="py-8 text-center text-muted-foreground">Loading dashboard…</p>
    }

    return (
        <div className="py-8 space-y-8">
            <div>
                <h1 className="text-2xl font-bold">Dashboard</h1>
                <p className="mt-1 text-sm text-muted-foreground">System overview and recent errors.</p>
            </div>

            <div className="@container">
                <div className="grid grid-cols-4 gap-1.5 @min-[420px]:gap-2 @min-[600px]:gap-4">
                    <CountCard title="Users" count={stats.users.total} subtitle={`${stats.users.active} active · ${stats.users.disabled} disabled`} tone="info" />
                    <CountCard title="Sessions" count={stats.sessions.active} subtitle={`${stats.sessions.expired} expired`} tone="success" />
                    <CountCard title="Subscriptions" count={stats.subscriptions.total} subtitle={`${stats.subscriptions.active} active`} />
                    <CountCard
                        title="Tasks"
                        count={stats.tasks.total}
                        subtitle={stats.tasks.failing > 0 ? `${stats.tasks.failing} failing` : 'all healthy'}
                        tone={stats.tasks.failing > 0 ? 'danger' : 'default'}
                    />
                </div>
            </div>

            <div className="space-y-3">
                <h2 className="text-lg font-semibold">Recent Errors</h2>
                {stats.recentErrors.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No recent errors.</p>
                ) : (
                    <ul className="divide-y rounded-lg border">
                        {stats.recentErrors.map((log) => (
                            <li key={log.id} className="p-3 space-y-1">
                                <div className="flex items-center justify-between gap-4">
                                    <p className="text-sm font-medium text-red-600 truncate">{log.message}</p>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(log.createdAt)}</span>
                                </div>
                                {log.context != null && <p className="text-xs text-muted-foreground">{log.context}</p>}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    )
}
