import { apiClient } from './api-client'
import { path } from '@/lib/apiPath'
import type { components } from '@samaljailani/homegate-types'

export type SessionResponseDto = components['schemas']['SessionResponseDto']

/**
 * All auth-related API calls live here. `getGoogleSignInUrl` and `getJoinUrl` are not
 * `fetch` calls — they are full-page redirects that kick off the server's OAuth flow, so
 * they just return the URL to navigate to (e.g. `window.location.href = getGoogleSignInUrl()`).
 */
class AuthService {
    getGoogleSignInUrl(): string {
        return path('/api/auth/google')
    }

    getJoinUrl(token: string): string {
        return `${window.location.origin}${path('/api/auth/join')}?token=${encodeURIComponent(token)}`
    }

    async getSession(): Promise<SessionResponseDto> {
        const { data, error } = await apiClient.GET('/api/auth/session')
        if (error) throw error
        return data
    }

    async logout(): Promise<void> {
        const { error } = await apiClient.POST('/api/auth/signOut')
        if (error) throw error
    }
}

export const authService = new AuthService()
