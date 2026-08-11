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

export function capitalizeFirstLetter(text: string) {
    return text.charAt(0).toUpperCase() + text.slice(1)
}

export async function copyToClipboard(text: string) {
    await navigator.clipboard.writeText(text)
}
