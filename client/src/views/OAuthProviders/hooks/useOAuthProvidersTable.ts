'use client'

import { useCallback, useState } from 'react'
import { oauthProviderService, type OAuthProviderResponseDto } from '@/services/oauthProvider.service'
import { addToastMessage } from '@/lib/utils'

interface OAuthProvidersListMutators {
    patchProvider: (id: number, patch: Partial<OAuthProviderResponseDto>) => void
}

export function useOAuthProvidersTable({ patchProvider }: OAuthProvidersListMutators) {
    const [actionError, setActionError] = useState<string | null>(null)
    const [pendingId, setPendingId] = useState<number | null>(null)

    const setEnabled = useCallback(async (id: number, enabled: boolean) => {
        setActionError(null)
        setPendingId(id)
        try {
            await oauthProviderService.updateOAuthProvider(id, { enabled })
            patchProvider(id, { enabled })
            addToastMessage('success', enabled ? 'Provider enabled' : 'Provider disabled')
        } catch {
            setActionError('Failed to update provider')
            addToastMessage('error', 'Failed to update provider')
        } finally {
            setPendingId(null)
        }
    }, [patchProvider])

    return {
        actionError,
        pendingId,
        setEnabled,
    }
}
