'use client'

import { useUsersList } from '@/views/Users/hooks/useUsersList'
import { UserServiceAccess } from './components/UserServiceAccess'

export function AdminPolicies() {
    const { users, isLoading } = useUsersList()

    return (
        <div className="py-8 space-y-8">
            <div>
                <h1 className="text-2xl font-bold">Policies</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Set per-user service access overrides. Explicit policies override each service&apos;s default.
                </p>
            </div>

            {isLoading ? (
                <p className="py-8 text-center text-muted-foreground">Loading users…</p>
            ) : (
                <UserServiceAccess users={users} />
            )}
        </div>
    )
}