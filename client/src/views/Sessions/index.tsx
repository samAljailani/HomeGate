'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { sessionService } from '@/services/session.service'
import { clearCsrfToken } from '@/services/api-client'
import { addToastMessage, getErrorMessage } from '@/lib/utils'
import { useSessionsPage } from './hooks/useSessionsPage'
import { useSessionsTable } from './hooks/useSessionsTable'
import { SessionsTable } from './components/SessionsTable'
import { SessionConfigCard } from './components/SessionConfigCard'

export function AdminSessions() {
    const router = useRouter()
    const [revokeAllOpen, setRevokeAllOpen] = useState(false)
    const [isRevokingAll, setIsRevokingAll] = useState(false)
    const { sessions, isLoading, removeSession } = useSessionsPage()
    const sessionsTable = useSessionsTable({ removeSession })

    const revokeAll = async () => {
        setIsRevokingAll(true)
        try {
            await sessionService.revokeAllSessions()
            clearCsrfToken()
            router.replace('/signin')
            router.refresh()
        } catch (error) {
            addToastMessage(
                'error',
                getErrorMessage(error, 'Failed to revoke all sessions')
            )
        } finally {
            setIsRevokingAll(false)
        }
    }

    return (
        <div className="py-8 space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Sessions</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Inspect active user sessions and revoke access.
                    </p>
                </div>
                <Button
                    variant="destructive"
                    disabled={
                        isLoading ||
                        isRevokingAll ||
                        sessionsTable.pendingId !== null
                    }
                    onClick={() => setRevokeAllOpen(true)}
                >
                    Revoke all sessions
                </Button>
            </div>
            <SessionConfigCard />
            <SessionsTable
                sessions={sessions}
                isLoading={isLoading}
                pendingId={sessionsTable.pendingId}
                onRevoke={sessionsTable.revokeSession}
            />
            <ConfirmDialog
                open={revokeAllOpen}
                setOpen={setRevokeAllOpen}
                title="Revoke all sessions?"
                description="This signs out every user, including you, and clears anonymous sessions."
                confirmLabel="Revoke all sessions"
                variant="destructive"
                onConfirm={revokeAll}
            />
        </div>
    )
}
