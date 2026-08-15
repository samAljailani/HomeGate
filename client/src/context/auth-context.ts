import { createContext, useContext } from 'react'

export interface User {
    id: string
    name?: string | null
    email?: string | null
}

export interface AuthContextValue {
    user: User | null
    accessToken: string | null
    signIn: () => void
    signOut: () => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(
    undefined
)

export function useAuthContext(): AuthContextValue {
    const ctx = useContext(AuthContext)

    if (!ctx) {
        throw new Error('useAuthContext must be used within an AuthProvider')
    }

    return ctx
}
