'use client'

import { useOAuthProvidersPage } from './hooks/useOAuthProvidersPage'
import { useOAuthProvidersTable } from './hooks/useOAuthProvidersTable'
import { OAuthProvidersTable } from './components/OAuthProvidersTable'

export function AdminOAuthProviders() {
    const { providers, isLoading, patchProvider } = useOAuthProvidersPage()
    const providersTable = useOAuthProvidersTable({ patchProvider })

    return (
        <div className="py-8 space-y-8">
            <div>
                <h1 className="text-2xl font-bold">OAuth Providers</h1>
                <p className="mt-1 text-sm text-muted-foreground">Enable or disable sign-in providers.</p>
            </div>

            <OAuthProvidersTable
                providers={providers}
                isLoading={isLoading}
                pendingId={providersTable.pendingId}
                onSetEnabled={providersTable.setEnabled}
            />
        </div>
    )
}
