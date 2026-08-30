import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { toast } from '@/components/ui/toast'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function addToastMessage(
    type: 'success' | 'info' | 'warning' | 'error',
    message: string
) {
    toast.add({
        type: type,
        description: message,
    })
}

/**
 * Extract a human-readable message from an error thrown by a service call.
 *
 * The server's global exception filter returns
 * `{ statusCode, message, timestamp, path }`, where `message` itself is the
 * result of `HttpException#getResponse()` — typically
 * `{ statusCode, message, error }`. This helper unwraps those nested shapes,
 * joins array messages, and falls back to `fallback` when nothing usable is
 * found (e.g. plain network errors).
 */
export function getErrorMessage(
    error: unknown,
    fallback = 'Something went wrong'
): string {
    const message = unwrapErrorField(error)

    if (typeof message === 'string' && message.trim()) {
        return message
    }

    if (Array.isArray(message)) {
        const strings = message.filter(
            (m): m is string => typeof m === 'string' && m.trim() !== ''
        )
        if (strings.length > 0) {
            return strings.join(', ')
        }
    }

    return fallback
}

function unwrapErrorField(error: unknown): unknown {
    if (!error || typeof error !== 'object') {
        return undefined
    }

    const record = error as Record<string, unknown>
    const value = record.message

    if (typeof value === 'string' || Array.isArray(value)) {
        return value
    }

    if (typeof value === 'object' && value !== null) {
        const nested = (value as Record<string, unknown>).message
        if (nested !== undefined) {
            return nested
        }
    }

    return value
}

export function capitalizeFirstLetter(text: string) {
    return text.charAt(0).toUpperCase() + text.slice(1)
}

export async function copyToClipboard(text: string) {
    await navigator.clipboard.writeText(text)
}
