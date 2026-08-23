'use client'

import { useCallback, useEffect, useState } from 'react'
import { oauthProviderService, type OAuthProviderResponseDto } from '@/services/oauthProvider.service'

export function useOAuthProvidersPage() {
    const [providers, setProviders] = useState<OAuthProviderResponseDto[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const load = useCallback(async () => {
        try {
            setIsLoading(true)
            setError(null)
            const providers = await oauthProviderService.getAllOAuthProviders()
            setProviders(providers)
        } catch {
            setError('Failed to load OAuth providers')
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        load()
    }, [load])

    const patchProvider = useCallback((id: number, patch: Partial<OAuthProviderResponseDto>) => {
        setProviders((prev) => prev.map((p) => p.id === id ? { ...p, ...patch } : p))
    }, [])

    return {
        providers,
        isLoading,
        error,
        refresh: load,
        patchProvider,
    }
}
