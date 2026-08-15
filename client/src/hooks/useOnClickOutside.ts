import { useEffect } from 'react'

/**
 * Hook that detects clicks outside of a specified element and triggers a callback.
 * Useful for closing dropdowns, modals, and popovers when clicking outside.
 *
 * @param ref - Reference to the element to monitor
 * @param handler - Callback when click is detected outside
 * @param when - Only listen when true (optimization to avoid unnecessary listeners)
 */
export function useOnClickOutside<T extends HTMLElement>(
    ref: React.RefObject<T | null>,
    handler: (event: MouseEvent | TouchEvent) => void,
    when: boolean = true
): void {
    useEffect(() => {
        if (!when) return

        const listener = (event: MouseEvent | TouchEvent) => {
            const el = ref.current
            if (!el) return

            const target = event.target
            if (target instanceof Node && el.contains(target)) return

            handler(event)
        }

        document.addEventListener('mousedown', listener)
        document.addEventListener('touchstart', listener)

        return () => {
            document.removeEventListener('mousedown', listener)
            document.removeEventListener('touchstart', listener)
        }
    }, [ref, handler, when])
}
