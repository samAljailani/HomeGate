import { getCsrfToken } from './api-client'

export interface PublicImage {
    name: string
    url: string
    size: number
    updatedAt: string
    usedBy: string[]
    protected: boolean
}

async function request<T>(
    path: string,
    method = 'GET',
    body?: object
): Promise<T> {
    const headers: Record<string, string> = {}
    if (method !== 'GET') headers['X-CSRF-Token'] = await getCsrfToken()
    if (body) headers['Content-Type'] = 'application/json'
    const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/images${path}`,
        {
            method,
            credentials: 'include',
            headers,
            ...(body ? { body: JSON.stringify(body) } : {}),
        }
    )
    if (!response.ok) {
        const error = await response.json().catch(() => null)
        throw new Error(
            Array.isArray(error?.message)
                ? error.message.join(' ')
                : (error?.message ?? 'Image request failed.')
        )
    }
    return response.status === 204 ? (undefined as T) : response.json()
}

export const imageService = {
    list: () => request<PublicImage[]>(''),
    async upload(file: File): Promise<PublicImage> {
        if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}\.(png|svg)$/.test(file.name))
            throw new Error(
                'Use a .png or .svg filename with letters, numbers, hyphens or underscores.'
            )
        if (!file.size || file.size > 2 * 1024 * 1024)
            throw new Error('Images must be nonempty and 2 MB or smaller.')
        const content = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () =>
                resolve(String(reader.result).split(',')[1] ?? '')
            reader.onerror = () =>
                reject(new Error('Could not read the selected file.'))
            reader.readAsDataURL(file)
        })
        return request<PublicImage>('', 'POST', {
            name: file.name,
            mimeType:
                file.type ||
                (file.name.endsWith('.png') ? 'image/png' : 'image/svg+xml'),
            content,
        })
    },
    remove: (name: string) =>
        request<void>(`/${encodeURIComponent(name)}`, 'DELETE'),
}
