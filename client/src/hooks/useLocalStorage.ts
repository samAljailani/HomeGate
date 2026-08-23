import { useState, useCallback, useEffect } from 'react'

export function useLocalStorage<T>(key: string, initialValue: T) {
    const [storedValue, setStoredValue] = useState<T>(initialValue)

    useEffect(() => {
        try {
            const item = window.localStorage.getItem(key)
            if (item) setStoredValue(JSON.parse(item))
        } catch {
            // Ignore parse errors, keep initial value
        }
    }, [key])

    const setValue = useCallback(
        (value: T | ((prev: T) => T)) => {
            setStoredValue((prev) => {
                const next = value instanceof Function ? value(prev) : value
                try {
                    window.localStorage.setItem(key, JSON.stringify(next))
                } catch {
                    // Ignore quota errors
                }
                return next
            })
        },
        [key]
    )

    return [storedValue, setValue] as const
}
