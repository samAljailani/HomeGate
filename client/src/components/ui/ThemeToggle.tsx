'use client'

import { Sun, Moon } from '@/components/ui/icons'
import { usePreferences, type Theme } from '@/context/preferences-context'
import { addToastMessage } from '@/lib/utils'

const nextTheme: Record<Theme, Theme> = { light: 'dark', dark: 'system', system: 'light' }
const themeLabel: Record<Theme, string> = { light: 'Light', dark: 'Dark', system: 'System' }

export function ThemeToggle() {
    const { theme, setTheme } = usePreferences()

    const handleToggle = () => {
        const next = nextTheme[theme]
        setTheme(next)
        addToastMessage('info', `Theme: ${themeLabel[next]}`)
    }

    return (
        <button
            type="button"
            onClick={handleToggle}
            title={`Theme: ${themeLabel[theme]}`}
            className="relative rounded-full p-1 text-muted hover:text-nav focus:outline-2 focus:outline-offset-2 focus:outline-accent"
        >
            <span className="sr-only">Toggle theme ({themeLabel[theme]})</span>
            {theme === 'dark' ? (
                <Moon className="size-5" />
            ) : (
                <Sun className="size-5" />
            )}
        </button>
    )
}
