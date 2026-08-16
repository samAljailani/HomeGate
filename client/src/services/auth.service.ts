import { apiClient } from './api-client'
import { path } from '@/lib/apiPath'
import { config } from '@/constants/app'

/**
 * All auth-related API calls live here. `getGoogleSignInUrl` and `getJoinUrl` are not
 * `fetch` calls — they are full-page redirects that kick off the server's OAuth flow, so
 * they just return the URL to navigate to (e.g. `window.location.href = getGoogleSignInUrl()`).
 */
class AuthService {
    getGoogleSignInUrl(): string {
        return `${config.apiBaseUrl}${path('/api/auth/google')}`
    }

    getJoinUrl(token: string): string {
        return `${config.apiBaseUrl}${path('/api/auth/join')}?token=${encodeURIComponent(token)}`
    }

    async logout(): Promise<void> {
        const { error } = await apiClient.POST('/api/auth/signOut')
        if (error) throw error
    }
}

export const authService = new AuthService()
