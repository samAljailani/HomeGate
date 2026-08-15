'use client'

import { useEffect } from 'react'

// TODO: remove this after the dark mode toggle is added to the UI.
export function ThemeShortcut() {
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === '9') {
                document
                    .getElementsByTagName('html')[0]
                    .classList.toggle('dark')
            }
        }

        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
    }, [])

    return null
}
