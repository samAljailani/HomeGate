'use client'

import { useSessionsPage } from './hooks/useSessionsPage'
import { useSessionsTable } from './hooks/useSessionsTable'
import { SessionsTable } from './components/SessionsTable'
import { SessionConfigCard } from './components/SessionConfigCard'

export function AdminSessions() {
    const { sessions, isLoading, removeSession } = useSessionsPage()
    const sessionsTable = useSessionsTable({ removeSession })

    return (
        <div className="py-8 space-y-8">
            <div>
                <h1 className="text-2xl font-bold">Sessions</h1>
                <p className="mt-1 text-sm text-muted-foreground">Inspect active user sessions and revoke access.</p>
            </div>
            <SessionConfigCard />
            <SessionsTable
                sessions={sessions}
                isLoading={isLoading}
                pendingId={sessionsTable.pendingId}
                onRevoke={sessionsTable.revokeSession}
            />
        </div>
    )
}
