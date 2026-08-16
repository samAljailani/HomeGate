'use client'

import { createContext, useContext, useEffect, useCallback, type ReactNode } from 'react'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { preferences } from '@/constants/preferences'
import type { VisibilityState } from '@tanstack/react-table'

export type Theme = 'light' | 'dark' | 'system'

interface UserPreferences {
    theme: Theme
    columns: Record<string, VisibilityState>
}

interface PreferencesContextValue {
    theme: Theme
    setTheme: (theme: Theme) => void
    getColumnVisibility: (pageKey: string) => VisibilityState
    setColumnVisibility: (pageKey: string, state: VisibilityState) => void
}

const defaultPreferences: UserPreferences = { theme: 'system', columns: {} }

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined)

export function PreferencesProvider({ children }: { children: ReactNode }) {
    const [prefs, setPrefs] = useLocalStorage<UserPreferences>(preferences.storageKey, defaultPreferences)

    useEffect(() => {
        const root = document.documentElement
        if (prefs.theme === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
            root.classList.toggle('dark', prefersDark)
        } else {
            root.classList.toggle('dark', prefs.theme === 'dark')
        }
    }, [prefs.theme])

    const setTheme = useCallback((theme: Theme) => {
        setPrefs((prev) => ({ ...prev, theme }))
    }, [setPrefs])

    const getColumnVisibility = useCallback((pageKey: string): VisibilityState => {
        return prefs.columns[pageKey] ?? {}
    }, [prefs.columns])

    const setColumnVisibility = useCallback((pageKey: string, state: VisibilityState) => {
        setPrefs((prev) => ({ ...prev, columns: { ...prev.columns, [pageKey]: state } }))
    }, [setPrefs])

    return (
        <PreferencesContext value={{ theme: prefs.theme, setTheme, getColumnVisibility, setColumnVisibility }}>
            {children}
        </PreferencesContext>
    )
}

export function usePreferences() {
    const ctx = useContext(PreferencesContext)
    if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider')
    return ctx
}
