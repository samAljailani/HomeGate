'use client'

import { useAccountsPage } from './hooks/useAccountsPage'
import { AccountsTable } from './components/AccountsTable'

export function AdminAccounts() {
    const { rows, isLoading, error, deleteAccount } = useAccountsPage()

    return (
        <div className="py-8 space-y-8">
            <div>
                <h1 className="text-2xl font-bold">Accounts</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Manage the external accounts linked to managed subscriptions. Accounts can only
                    be deleted when the subscription still has more than one account left.
                </p>
            </div>

            <AccountsTable
                rows={rows}
                isLoading={isLoading}
                error={error}
                onDelete={deleteAccount}
            />
        </div>
    )
}