'use client'

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { authService, type SessionResponseDto } from '@/services/auth.service'

interface AuthContextValue {
    user: SessionResponseDto | null
    isLoading: boolean
    refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<SessionResponseDto | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    const refresh = useCallback(async () => {
        try {
            const session = await authService.getSession()
            setUser(session)
        } catch {
            setUser(null)
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        refresh()
    }, [refresh])

    return (
        <AuthContext value={{ user, isLoading, refresh }}>
            {children}
        </AuthContext>
    )
}

export function useAuthContext(): AuthContextValue {
    const ctx = useContext(AuthContext)

    if (!ctx) {
        throw new Error('useAuthContext must be used within an AuthProvider')
    }

    return ctx
}
