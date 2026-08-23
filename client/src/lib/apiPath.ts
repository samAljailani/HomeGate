import type { components, paths } from '@samaljailani/homegate-types'

/**
 * Constrains a route string literal to a key that actually exists in the OpenAPI schema.
 * Purely a compile-time check — at runtime it just returns the literal unchanged — so it's
 * useful for building URLs (e.g. OAuth redirects) outside of `apiClient`'s typed fetch calls.
 */
export function path<P extends keyof paths & string>(route: P): P {
    return route
}

/**
 * Shared pagination query params accepted by all `getAll*` list endpoints. Declared once here
 * instead of re-exported as a type alias from every service file.
 */
export type PaginationRequestDto = components['schemas']['PaginationRequestDto']
