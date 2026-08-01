import { createApiClient } from '@samaljailani/homegate-types'

/**
 * Single shared `openapi-fetch` client instance for the whole app.
 * Domain service modules (e.g. `user.service.ts`) import this instead of
 * constructing their own client, and components/hooks should go through
 * those service modules rather than calling `apiClient` directly.
 */
export const apiClient = createApiClient({
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? '',
    credentials: 'include',
})

let cachedCsrfToken: string | null = null

async function getCsrfToken(): Promise<string> {
    if (!cachedCsrfToken) {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/csrf`, {
            credentials: 'include',
        })
        const { csrfToken } = await res.json()
        cachedCsrfToken = csrfToken
    }
    return cachedCsrfToken!
}

/** Clear the cached token so the next mutating request fetches a fresh one. */
export function clearCsrfToken() {
    cachedCsrfToken = null
}

apiClient.use({
    async onRequest({ request }) {
        const method = request.method.toUpperCase()
        if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
            const csrfToken = await getCsrfToken()
            request.headers.set('X-CSRF-Token', csrfToken)
        }
        return request
    },
})